import { isIP } from "node:net";
import {
  DEFAULT_ENDPOINT,
  normalizeApiOrigin,
  normalizeApiVersion,
  normalizeOrigin,
  parseKey,
  positiveInt,
} from "./config.js";
import type { KeyScope } from "./config.js";
import { MAX_RESPONSE_BYTES, readLimited } from "./body.js";
import { withDeadline } from "./deadline.js";
import { FingerlyTimeoutError } from "./errors.js";
import { REDACTED, inspectCustom } from "./redact.js";
import { serveNode } from "./node.js";
import type {
  NodeNext,
  NodeRequest,
  NodeResponse,
  ProxyFailure,
  ProxyOptions,
  ProxyPeer,
} from "./types.js";

const DEFAULT_MAX_BODY_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 5_000;

/** What this proxy reports itself as upstream; shown per proxy in the dashboard. */
const PROXY_VERSION = "node/0.4.1";

/** Statuses that must not carry a body. */
const BODILESS_STATUSES = new Set([204, 205, 304]);

/**
 * Exact lowercase native and bridge SDK platform identifiers allowed through
 * the sanitize-and-restore header sequence.
 */
const VALID_SDK_PLATFORMS = new Set([
  "ios",
  "android",
  "react-native",
  "react-native-ios",
  "react-native-android",
  "flutter",
  "flutter-ios",
  "flutter-android",
  "lynx-ios",
  "lynx-android",
  "capacitor",
  "kotlin-multiplatform",
]);

/** Browser fetch-metadata and client-hint headers forwarded verbatim when present. */
const CLIENT_METADATA_HEADERS = [
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
];

/**
 * Web Bot Auth headers an AI agent's browser signs the request with,
 * forwarded when present and at most 4096 bytes. The API ignores a longer
 * one, so it is dropped here rather than refused.
 */
const SIGNATURE_HEADERS = ["signature", "signature-input", "signature-agent"];
const MAX_SIGNATURE_HEADER_BYTES = 4096;

const CORS_ALLOW_HEADERS =
  "content-type, x-api-key, idempotency-key, x-fingerly-sdk-platform";
const CORS_EXPOSE_HEADERS =
  "x-request-id, ratelimit-limit, ratelimit-remaining, retry-after";

const MISSING_ORIGIN_BODY = JSON.stringify({
  error: {
    code: "missing_origin",
    message: "Origin header is required",
    status: 400,
  },
});

/**
 * The response headers relayed to the browser, and nothing else. A content
 * blocker can match a response header by name, so an allowlist is what keeps
 * anything naming Fingerly off the page, whatever the API adds in future.
 */
const RELAYED_HEADERS = [
  "content-type",
  "x-request-id",
  "ratelimit-limit",
  "ratelimit-remaining",
  "retry-after",
];

/** An IPv4 address carried in IPv6 form, as dual-stack sockets report it. */
const MAPPED_IPV4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Same-origin handler for the browser SDK.
 *
 * It exists so the SDK can post to a path on your own domain instead of
 * Fingerly, which is what gets it past content blockers. The SDK posts both of
 * its calls to that one path, and this forwards each to Fingerly's one ingest
 * URL, never anywhere else and never to event reads. It sends only vetted
 * visitor metadata, never passes on cookies or authorization headers, and
 * relays nothing back that names Fingerly.
 */
export class FingerlyProxy {
  /**
   * Server-held proxy key, sent only to Fingerly. A
   * `#private` field, so inspecting or serialising the proxy never shows it.
   * Validated on the first request, not here, so a build without secrets can
   * still load the module that creates the proxy.
   */
  readonly #key: string | undefined;
  /** The validated key's environment, once a request has needed it. */
  #scope: KeyScope | null = null;
  /** The one URL requests are forwarded to. */
  private readonly upstreamUrl: string;
  /** The one path answered, or null to answer wherever the framework routes. */
  private readonly path: string | null;
  /** Request body limit in bytes; larger requests get HTTP 413. */
  private readonly maxBodyBytes: number;
  /** Deadline for reading the body, resolving the IP and forwarding. */
  private readonly timeoutMs: number;
  /** Configured cross-origin allowlist; empty for same-origin routes. */
  private readonly allowedOrigins: ReadonlySet<string>;
  /** HTTP implementation for the upstream call. */
  private readonly fetchImpl: typeof fetch;
  /** Customer callback resolving the visitor IP from trusted infrastructure. */
  private readonly clientIp: ProxyOptions["clientIp"];
  /** Where failures are reported; the console when absent. */
  private readonly onError: ProxyOptions["onError"];

  /**
   * @param options Proxy options. Everything but the key is validated here;
   *   the key is validated on the first request (see {@link handle}).
   * @throws {TypeError} If a route, limit or callback is invalid.
   */
  constructor(options: ProxyOptions) {
    if (typeof options.clientIp !== "function")
      throw new TypeError("clientIp is required");

    this.#key = options.proxyKey || undefined;
    if (
      options.allowInsecureLoopback !== undefined &&
      typeof options.allowInsecureLoopback !== "boolean"
    )
      throw new TypeError("allowInsecureLoopback must be a boolean");
    this.upstreamUrl =
      normalizeApiOrigin(
        options.upstream ?? DEFAULT_ENDPOINT,
        options.allowInsecureLoopback === true,
      ) + `/api/${normalizeApiVersion(options.apiVersion)}/ingest`;
    this.path = options.path === undefined ? null : normalizePath(options.path);
    this.maxBodyBytes = positiveInt(
      options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
      "maxBodyBytes",
    );
    this.timeoutMs = positiveInt(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "timeoutMs",
    );
    this.allowedOrigins = parseAllowedOrigins(options.allowedOrigins);
    this.clientIp = options.clientIp;
    if (options.onError !== undefined && typeof options.onError !== "function")
      throw new TypeError("onError must be a function");
    this.onError = options.onError;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Handles one browser request.
   *
   * Bound to the instance so it can be handed straight to a framework route,
   * as in `export const POST = proxy.handle`.
   *
   * @param request The incoming same-origin request.
   * @returns The upstream response, or 404/405/401/413 when it is refused
   *   before any forwarding.
   */
  readonly handle = (request: Request): Promise<Response> =>
    this.forward(request, {}, request.method);

  /**
   * Handles one request from a Node server: Express, NestJS (Express or
   * Fastify adapter) or `node:http`. Mount it before any body parser.
   *
   * It matches the raw path (calling `next` for any other path, so it can be
   * mounted globally), streams the body unread, passes the TCP peer address
   * to `clientIp` as `peer.remoteAddress`, cancels upstream when the visitor
   * disconnects, and writes the answer. It never throws.
   */
  readonly handleNode = (
    req: NodeRequest,
    res: NodeResponse,
    next?: NodeNext,
  ): Promise<void> =>
    serveNode(
      {
        path: this.path,
        forward: (request, peer, method) => this.forward(request, peer, method),
        misconfigured: (problem, message) =>
          this.reportOnce(problem, { kind: "misconfigured", message }),
      },
      req,
      res,
      next,
    );

  /**
   * The shared path behind {@link handle} and the Node handler.
   *
   * @param peer What the server knows about the TCP connection, passed to
   *   `clientIp`; empty where the framework does not expose it.
   * @param method The method as it arrived. Fetch's `Request` uppercases
   *   `post`, so the Node handler passes the raw one to keep the match exact.
   */
  private async forward(
    request: Request,
    peer: ProxyPeer,
    method: string,
  ): Promise<Response> {
    const url = new URL(request.url);
    // Exactly the issued path: no prefix, no trailing or doubled slash, no
    // encoded characters, case-sensitive. Dot segments were already resolved
    // when the URL was parsed; the Node handler refuses them before that.
    if (this.path !== null && url.pathname !== this.path)
      return refuse(404, "Not Found");

    const origin = (request.headers.get("origin") ?? "").trim();
    const cors =
      origin !== "" && this.allowedOrigins.has(origin) ? origin : null;
    // Case-sensitive: `post` is not POST.
    if (method === "OPTIONS" && cors !== null) return preflight(cors);
    if (method !== "POST")
      return refuse(
        405,
        "Method Not Allowed",
        { allow: this.allowedOrigins.size > 0 ? "POST, OPTIONS" : "POST" },
        cors,
      );

    const scope = this.validatedScope();
    if (scope === null)
      return refuse(
        500,
        "Proxy misconfigured: the proxy key is missing or invalid",
        {},
        cors,
      );

    const apiKey = this.upstreamKeyFor(scope, request.headers.get("x-api-key"));
    if (apiKey === null) return refuse(401, "Unauthorized", {}, cors);

    // Step 1-4: Capture validated x-fingerly-sdk-platform before stripping all
    // incoming x-fingerly-* headers, and enforce the origin / native gate.
    const rawPlatform = request.headers.get("x-fingerly-sdk-platform") ?? "";
    const sdkPlatform = VALID_SDK_PLATFORMS.has(rawPlatform) ? rawPlatform : "";
    if (origin === "" && sdkPlatform === "")
      return jsonRefuse(400, MISSING_ORIGIN_BODY, cors);

    // Refuse on the declared size first; readBody enforces the real one.
    if (Number(request.headers.get("content-length")) > this.maxBodyBytes)
      return refuse(413, "Payload Too Large", {}, cors);

    try {
      return await withDeadline(
        this.timeoutMs,
        request.signal,
        async (signal) => {
          // The address first: a bad callback must not cost a body read.
          const headers = await this.upstreamHeaders(
            request,
            apiKey,
            origin,
            sdkPlatform,
            peer,
          );
          const body = await readLimited(
            request.body,
            this.maxBodyBytes,
            signal,
          );
          if (body === null) return refuse(413, "Payload Too Large", {}, cors);
          const response = await this.fetchImpl(this.upstreamUrl, {
            method: "POST",
            headers,
            body,
            redirect: "manual",
            signal,
          });
          // A redirect is never followed, and never relayed: the key went to
          // the pinned URL only. A replacement fetch that ignored "manual"
          // shows as `redirected` or a different final URL.
          const unusable =
            response.redirected ||
            (response.url !== "" && response.url !== this.upstreamUrl)
              ? "redirect"
              : response.status < 200 ||
                  response.status > 599 ||
                  (response.status >= 300 && response.status <= 399)
                ? "status"
                : null;
          if (unusable !== null) {
            response.body?.cancel().catch(() => {});
            throw new UpstreamUnusable(unusable);
          }
          return await relay(response, signal, cors);
        },
      );
    } catch (error) {
      return this.gatewayFailure(request, error, cors);
    }
  }

  /**
   * Answers an upstream problem the way a gateway does, never by throwing:
   * a framework turns a thrown error into a 500 and a stack trace per request.
   *
   * The visitor having gone is not a failure: the upstream call was cancelled
   * with it and there is nobody to answer, so nothing is logged.
   */
  private gatewayFailure(
    request: Request,
    error: unknown,
    cors: string | null,
  ): Response {
    if (error instanceof ClientIpUnusable) {
      this.reportOnce("client-ip", {
        kind: "misconfigured",
        message: `the client IP callback ${error.message}; every proxied request answers 500`,
      });
      return refuse(
        500,
        "Proxy misconfigured: the client IP callback returned no valid address",
        {},
        cors,
      );
    }
    if (request.signal.aborted)
      return refuse(499, "Client Closed Request", {}, cors);
    if (error instanceof FingerlyTimeoutError) {
      this.report({
        kind: "timeout",
        message: `request did not complete within ${this.timeoutMs} ms`,
      });
      return refuse(504, "Gateway timeout", {}, cors);
    }
    this.report({ kind: "upstream", message: describe(error) });
    return refuse(502, "Bad gateway", {}, cors);
  }

  /** One concise line per failure: the hook if given, else the console. */
  private report(failure: ProxyFailure): void {
    if (this.onError) {
      try {
        this.onError(failure);
      } catch {
        // A logging hook must not turn a 502 into a crash.
      }
      return;
    }
    console.error(`Fingerly proxy: ${failure.message}`);
  }

  /**
   * Reports a configuration problem once per process. It repeats on every
   * request until the deployment is fixed, so one line is enough.
   */
  private reportOnce(problem: string, failure: ProxyFailure): void {
    if (reported.has(problem)) return;
    reported.add(problem);
    this.report(failure);
  }

  /** What `JSON.stringify` and `console.log` show: everything but the key. */
  toJSON(): Record<string, unknown> {
    return {
      upstreamUrl: this.upstreamUrl,
      path: this.path,
      maxBodyBytes: this.maxBodyBytes,
      timeoutMs: this.timeoutMs,
      key: REDACTED,
    };
  }

  [inspectCustom](): Record<string, unknown> {
    return this.toJSON();
  }

  /**
   * Validates the configured key once, on the first request that needs it.
   *
   * A missing or malformed key is a deployment mistake, not a visitor's: it
   * is logged once per process and every request answers 500 without calling
   * upstream.
   *
   * @returns The key's environment, or null when the key is unusable.
   */
  private validatedScope(): KeyScope | null {
    if (this.#scope !== null) return this.#scope;
    try {
      this.#scope = parseKey(this.#key ?? "", "px");
      return this.#scope;
    } catch {
      this.reportOnce("proxy-key", {
        kind: "misconfigured",
        message:
          "the proxy key is missing or invalid; every proxied request answers 500",
      });
      return null;
    }
  }

  /**
   * Decides which key to present upstream.
   *
   * The browser must supply a public key for the same environment, which the
   * proxy forwards alongside its own.
   *
   * @param presented The browser's `x-api-key` header, if any.
   * @returns The key to forward, or null when the caller is unauthorised.
   */
  private upstreamKeyFor(
    scope: KeyScope,
    presented: string | null,
  ): string | null {
    try {
      const browser = parseKey(presented ?? "", "pk");
      return browser.environment === scope.environment ? presented : null;
    } catch {
      return null;
    }
  }

  /**
   * Builds the upstream headers from scratch so incoming `x-fingerly-*`,
   * `cookie` and `authorization` headers never cross the proxy boundary.
   *
   * @throws {ClientIpUnusable} If `clientIp` throws or returns anything but
   *   one IPv4 or IPv6 address.
   */
  private async upstreamHeaders(
    request: Request,
    apiKey: string,
    origin: string,
    sdkPlatform: string,
    peer: ProxyPeer,
  ): Promise<Headers> {
    const clientIp = await resolveClientIp(this.clientIp, request, peer);

    const headers = new Headers({
      "content-type": request.headers.get("content-type") || "application/json",
      "x-api-key": apiKey,
      "x-fingerly-client-ip": clientIp,
      "x-fingerly-user-agent": request.headers.get("user-agent") ?? "",
      "x-fingerly-proxy-version": PROXY_VERSION,
    });
    headers.set("x-fingerly-proxy-key", this.#key!);
    // One channel only: a browser Origin wins over a platform claim, as on the
    // API, which refuses a proxied request carrying both.
    if (origin !== "") headers.set("x-fingerly-origin", origin);
    else if (sdkPlatform !== "")
      headers.set("x-fingerly-sdk-platform", sdkPlatform);
    const host = (request.headers.get("host") ?? "").trim();
    if (host !== "") headers.set("x-fingerly-host", host);
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
    for (const name of CLIENT_METADATA_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    for (const name of SIGNATURE_HEADERS) {
      const value = request.headers.get(name);
      // Header values are byte strings: one character per byte.
      if (value && value.length <= MAX_SIGNATURE_HEADER_BYTES)
        headers.set(name, value);
    }
    return headers;
  }
}

/**
 * Creates a bound proxy handler.
 *
 * Equivalent to `new FingerlyProxy(options).handle`, for frameworks that take
 * a plain request handler.
 */
export function createProxy(options: ProxyOptions): FingerlyProxy["handle"] {
  return new FingerlyProxy(options).handle;
}

/**
 * Creates a bound Node handler: `(req, res, next?) => void` middleware for
 * Express, NestJS and `node:http`.
 *
 * Equivalent to `new FingerlyProxy(options).handleNode`.
 */
export function createNodeProxy(
  options: ProxyOptions,
): FingerlyProxy["handleNode"] {
  return new FingerlyProxy(options).handleNode;
}

/**
 * Validates the path the dashboard issued and drops trailing slashes. It is
 * matched exactly: the proxy answers that path and nothing under it.
 */
function normalizePath(value: string): string {
  const path = value.trim().replace(/\/+$/, "");
  if (!/^(\/[A-Za-z0-9_~-]+)+$/.test(path))
    throw new TypeError("path must be an absolute URL path such as /k7x2qm4a");
  return path;
}

/** The client IP callback failed or returned something that is not one address. */
class ClientIpUnusable extends Error {}

/**
 * Runs the customer's callback and accepts exactly one IP literal.
 *
 * Anything else (null from a missing header, "", "null", a comma list,
 * garbage) is a configuration error: forwarding it would make every
 * identification fail upstream, or attribute visitors to a made-up address.
 */
async function resolveClientIp(
  callback: ProxyOptions["clientIp"],
  request: Request,
  peer: ProxyPeer,
): Promise<string> {
  let value: unknown;
  try {
    value = await callback(request, peer);
  } catch {
    throw new ClientIpUnusable("threw");
  }
  // `isIP` accepts a zone id ("fe80::1%en0"), which the API refuses every time.
  if (typeof value !== "string" || isIP(value) === 0 || value.includes("%"))
    throw new ClientIpUnusable(
      typeof value === "string"
        ? "returned something other than one IP address"
        : `returned ${value === null ? "null" : typeof value}`,
    );
  return value.replace(MAPPED_IPV4, "$1");
}

/** An upstream answer larger than the proxy will hold in memory. */
class UpstreamResponseTooLarge extends Error {
  constructor() {
    super(`upstream response exceeded ${MAX_RESPONSE_BYTES} bytes`);
  }
}

/** An upstream answer the proxy will not relay: a redirect or a bad status. */
class UpstreamUnusable extends Error {
  constructor(readonly reason: "redirect" | "status") {
    super(reason);
  }
}

/** Configuration problems already reported by this process. */
const reported = new Set<string>();

/** Error codes that only say a connection could not be made or kept. */
const CONNECT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

/**
 * A one-line description of a failure that names only its kind, such as
 * `upstream request failed: connect (ECONNREFUSED)`. Error messages are never
 * copied: they can carry the upstream host, port or URL.
 */
function describe(error: unknown): string {
  if (error instanceof UpstreamResponseTooLarge)
    return "upstream request failed: too_large";
  if (error instanceof UpstreamUnusable)
    return `upstream request failed: ${error.reason}`;
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  const code =
    typeof cause?.code === "string" && /^[A-Z0-9_]{1,40}$/.test(cause.code)
      ? cause.code
      : "";
  const kind = CONNECT_CODES.has(code)
    ? "connect"
    : /^(ERR_TLS|ERR_SSL|CERT_|UNABLE_TO|SELF_SIGNED|DEPTH_ZERO|HOSTNAME_MISMATCH)/.test(
          code,
        )
      ? "tls"
      : "other";
  return `upstream request failed: ${kind}${code ? ` (${code})` : ""}`;
}

/** Validates configured cross-origin browser origins. */
function parseAllowedOrigins(
  origins: readonly string[] | undefined,
): ReadonlySet<string> {
  const out = new Set<string>();
  if (origins === undefined) return out;
  if (!Array.isArray(origins))
    throw new TypeError("allowedOrigins must be an array of origin strings");
  for (const raw of origins) {
    if (typeof raw !== "string")
      throw new TypeError("allowedOrigins entries must be strings");
    const normalized = normalizeOrigin(raw.trim());
    if (new URL(normalized).origin !== normalized)
      throw new TypeError("allowedOrigins entries must be bare origins");
    out.add(normalized);
  }
  return out;
}

/** Applies cross-origin CORS headers when an allowed origin matched. */
function applyCors(headers: Headers, cors: string | null): Headers {
  if (cors !== null) {
    headers.set("access-control-allow-origin", cors);
    headers.set("vary", "Origin");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", CORS_ALLOW_HEADERS);
    headers.set("access-control-expose-headers", CORS_EXPOSE_HEADERS);
  }
  return headers;
}

/** Answers a matched cross-origin preflight request. */
function preflight(cors: string): Response {
  const headers = applyCors(
    new Headers({
      "cache-control": "no-store",
      allow: "POST, OPTIONS",
    }),
    cors,
  );
  return new Response(null, { status: 204, headers });
}

/** Builds a plain-text refusal that never reaches Fingerly. */
function refuse(
  status: number,
  message: string,
  extra: HeadersInit = {},
  cors: string | null = null,
): Response {
  const headers = applyCors(
    new Headers({
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    }),
    cors,
  );
  return new Response(message, { status, headers });
}

/** Builds a structured JSON refusal before upstream forwarding. */
function jsonRefuse(
  status: number,
  body: string,
  cors: string | null = null,
): Response {
  const headers = applyCors(
    new Headers({
      "content-type": "application/json",
      "cache-control": "no-store",
    }),
    cors,
  );
  return new Response(body, { status, headers });
}

/**
 * Returns the upstream response to the browser, with only the allowlisted
 * headers.
 *
 * The whole body is read before anything is answered, inside the caller's
 * deadline and under {@link MAX_RESPONSE_BYTES}: a stalled upstream times out
 * instead of holding a connection open, and a cut-off or oversized one is a
 * 502 rather than a truncated success.
 *
 * @throws {UpstreamResponseTooLarge} Past the response cap.
 */
async function relay(
  response: Response,
  signal: AbortSignal,
  cors: string | null = null,
): Promise<Response> {
  const bytes = await readLimited(response.body, MAX_RESPONSE_BYTES, signal);
  if (bytes === null) throw new UpstreamResponseTooLarge();
  const headers = applyCors(new Headers({ "cache-control": "no-store" }), cors);
  for (const name of RELAYED_HEADERS) {
    const value = response.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  return new Response(BODILESS_STATUSES.has(response.status) ? null : bytes, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
