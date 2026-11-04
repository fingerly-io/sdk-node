import {
  DEFAULT_ENDPOINT,
  normalizeApiVersion,
  normalizeOrigin,
  parseKey,
  positiveInt,
} from "./config.js";
import type { KeyScope } from "./config.js";
import { withDeadline } from "./deadline.js";
import { FingerlyTimeoutError } from "./errors.js";
import { REDACTED, inspectCustom } from "./redact.js";
import type { ProxyFailure, ProxyOptions } from "./types.js";

const DEFAULT_MAX_BODY_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 5_000;

/** What this proxy reports itself as upstream; shown per proxy in the dashboard. */
const PROXY_VERSION = "node/0.1.0";

/** Statuses that must not carry a body. */
const BODILESS_STATUSES = new Set([204, 205, 304]);

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

/** A client IP must be a printable one-line token, or `Headers` would reject it. */
const PLAIN_ADDRESS = /^[\x20-\x7e]*$/;

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
   * Server-held proxy key, or deprecated secret key, sent only to Fingerly. A
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
  /** HTTP implementation for the upstream call. */
  private readonly fetchImpl: typeof fetch;
  /** Customer callback resolving the visitor IP from trusted infrastructure. */
  private readonly clientIp: ProxyOptions["clientIp"];
  /** Proxy keys authenticate the browser's public key; secret keys do not. */
  private readonly usesProxyKey: boolean;
  /** Where failures are reported; the console when absent. */
  private readonly onError: ProxyOptions["onError"];

  /**
   * @param options Proxy options. Everything but the key is validated here;
   *   the key is validated on the first request (see {@link handle}).
   * @throws {TypeError} If a route, limit or callback is invalid, or both a
   *   proxy key and the deprecated secret key are passed.
   */
  constructor(options: ProxyOptions) {
    const { proxyKey, secretKey } = options;
    if (proxyKey && secretKey)
      throw new TypeError("Pass proxyKey or deprecated secretKey, not both");
    if (typeof options.clientIp !== "function")
      throw new TypeError("clientIp is required");

    this.usesProxyKey = !secretKey;
    this.#key = proxyKey || secretKey || undefined;
    this.upstreamUrl =
      normalizeOrigin(options.upstream ?? DEFAULT_ENDPOINT) +
      `/api/${normalizeApiVersion(options.apiVersion)}/ingest`;
    this.path = options.path === undefined ? null : normalizePath(options.path);
    this.maxBodyBytes = positiveInt(
      options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
      "maxBodyBytes",
    );
    this.timeoutMs = positiveInt(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "timeoutMs",
    );
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
  readonly handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (this.path !== null && url.pathname.replace(/\/+$/, "") !== this.path)
      return refuse(404, "Not Found");
    if (request.method !== "POST")
      return refuse(405, "Method Not Allowed", { allow: "POST" });

    const scope = this.validatedScope();
    if (scope === null)
      return refuse(
        500,
        "Proxy misconfigured: the proxy key is missing or invalid",
      );

    const apiKey = this.upstreamKeyFor(scope, request.headers.get("x-api-key"));
    if (apiKey === null) return refuse(401, "Unauthorized");

    // Refuse on the declared size first; readBody enforces the real one.
    if (Number(request.headers.get("content-length")) > this.maxBodyBytes)
      return refuse(413, "Payload Too Large");

    try {
      return await withDeadline(
        this.timeoutMs,
        request.signal,
        async (signal) => {
          const body = await readBody(request, this.maxBodyBytes, signal);
          if (body === null) return refuse(413, "Payload Too Large");
          const response = await this.fetchImpl(this.upstreamUrl, {
            method: "POST",
            headers: await this.upstreamHeaders(request, url, apiKey),
            body,
            redirect: "manual",
            signal,
          });
          return await relay(response);
        },
      );
    } catch (error) {
      return this.gatewayFailure(request, error);
    }
  };

  /**
   * Answers an upstream problem the way a gateway does, never by throwing:
   * a framework turns a thrown error into a 500 and a stack trace per request.
   *
   * The visitor having gone is not a failure: the upstream call was cancelled
   * with it and there is nobody to answer, so nothing is logged.
   */
  private gatewayFailure(request: Request, error: unknown): Response {
    if (request.signal.aborted) return refuse(499, "Client Closed Request");
    if (error instanceof FingerlyTimeoutError) {
      this.report({
        kind: "timeout",
        message: `upstream did not answer within ${this.timeoutMs} ms`,
      });
      return refuse(504, "Gateway timeout");
    }
    this.report({ kind: "upstream", message: describe(error) });
    return refuse(502, "Bad gateway");
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
      this.#scope = parseKey(this.#key ?? "", this.usesProxyKey ? "px" : "sk");
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
   * With a proxy key the browser must supply a public key for the same
   * environment, which the proxy forwards alongside its own. The deprecated
   * secret-key mode authenticates on its own and accepts anything.
   *
   * @param presented The browser's `x-api-key` header, if any.
   * @returns The key to forward, or null when the caller is unauthorised.
   */
  private upstreamKeyFor(
    scope: KeyScope,
    presented: string | null,
  ): string | null {
    if (!this.usesProxyKey) return this.#key!;
    try {
      const browser = parseKey(presented ?? "", "pk");
      return browser.environment === scope.environment ? presented : null;
    } catch {
      return null;
    }
  }

  /**
   * Builds the upstream headers.
   *
   * Nothing is copied wholesale: only the body's content type, the visitor
   * metadata Fingerly needs, and an idempotency key when the SDK sent one.
   *
   * @throws {TypeError} If `clientIp` returns a value unusable as a header.
   */
  private async upstreamHeaders(
    request: Request,
    url: URL,
    apiKey: string,
  ): Promise<Headers> {
    const clientIp = await this.clientIp(request);
    if (!PLAIN_ADDRESS.test(clientIp))
      throw new TypeError("clientIp must resolve to a plain address");

    const headers = new Headers({
      "content-type": request.headers.get("content-type") ?? "application/json",
      "x-api-key": apiKey,
      "x-fingerly-client-ip": clientIp,
      "x-fingerly-origin": request.headers.get("origin") ?? url.origin,
      "x-fingerly-user-agent": request.headers.get("user-agent") ?? "",
      "x-fingerly-proxy-version": PROXY_VERSION,
    });
    if (this.usesProxyKey) headers.set("x-fingerly-proxy-key", this.#key!);
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
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
 * Validates the path the dashboard issued and drops trailing slashes. It is
 * matched exactly: the proxy answers that path and nothing under it.
 */
function normalizePath(value: string): string {
  const path = value.trim().replace(/\/+$/, "");
  if (!path.startsWith("/") || path.length < 2 || /[?#]/.test(path))
    throw new TypeError("path must be an absolute URL path such as /k7x2qm4a");
  return path;
}

/** Configuration problems already reported by this process. */
const reported = new Set<string>();

/**
 * A one-line description of a transport failure, without stack or body:
 * `fetch failed (ECONNREFUSED)` rather than the error object.
 */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return "upstream request failed";
  const cause = (error as { cause?: { code?: unknown; message?: unknown } })
    .cause;
  const detail =
    typeof cause?.code === "string"
      ? cause.code
      : typeof cause?.message === "string"
        ? cause.message
        : "";
  return `upstream request failed: ${error.message}${detail ? ` (${detail})` : ""}`;
}

/** Builds a plain-text refusal that never reaches Fingerly. */
function refuse(
  status: number,
  message: string,
  headers: HeadersInit = {},
): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

/**
 * Reads a request body without buffering more than the limit.
 *
 * Streaming the read means an oversized body is cut off at the limit instead
 * of being held in memory first.
 *
 * @returns The bytes, or null when the limit was exceeded.
 */
async function readBody(
  request: Request,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Buffer<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks);
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/**
 * Returns the upstream response to the browser, with only the allowlisted
 * headers.
 *
 * The body is always drained, inside the caller's deadline, so a stalled
 * upstream times out instead of holding a connection open.
 */
async function relay(response: Response): Promise<Response> {
  const bytes = await response.arrayBuffer();
  const headers = new Headers({ "cache-control": "no-store" });
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
