import {
  DEFAULT_ENDPOINT,
  normalizeApiVersion,
  normalizeOrigin,
  parseKey,
  positiveInt,
} from "./config.js";
import type { KeyScope } from "./config.js";
import { withDeadline } from "./deadline.js";
import type { ProxyOptions } from "./types.js";

const DEFAULT_PREFIX = "/api/fingerly";
const DEFAULT_MAX_BODY_BYTES = 1_048_576;
const DEFAULT_TIMEOUT_MS = 5_000;

/** The only non-literal route a browser may reach through the proxy. */
const SUPPLEMENT_PATH = /^\/events\/[^/]+\/supplement$/;

/** Statuses that must not carry a body. */
const BODILESS_STATUSES = new Set([204, 205, 304]);

/**
 * Upstream headers that describe that connection rather than our response.
 * `fetch` has already decoded and framed the body, so replaying them would
 * misdescribe the bytes we hand back.
 */
const CONNECTION_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

/** A client IP must be a printable one-line token, or `Headers` would reject it. */
const PLAIN_ADDRESS = /^[\x20-\x7e]*$/;

/**
 * Same-origin handler for the browser SDK's identify and supplement calls.
 *
 * It exists so the SDK can post to your own domain instead of Fingerly. Only
 * those two routes are forwarded, never event reads. It sends only vetted
 * visitor metadata, and never passes on customer cookies or authorization
 * headers.
 */
export class FingerlyProxy {
  /** Server-held proxy key, or deprecated secret key, sent only to Fingerly. */
  private readonly key: string;
  /** The key's environment, matched against the browser's key. */
  private readonly scope: KeyScope;
  /** Fingerly origin requests are forwarded to. */
  private readonly upstream: string;
  /** Local mount path, such as `/api/fingerly`, stripped before forwarding. */
  private readonly prefix: string;
  /** API version accepted locally and sent upstream. */
  private readonly apiVersion: string;
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

  /**
   * @param options Proxy options; all of them are validated here.
   * @throws {TypeError} If a credential, route, limit or callback is invalid.
   */
  constructor(options: ProxyOptions) {
    const { proxyKey, secretKey } = options;
    if (!proxyKey && !secretKey)
      throw new TypeError("A Fingerly proxy key is required");
    if (proxyKey && secretKey)
      throw new TypeError("Pass proxyKey or deprecated secretKey, not both");
    if (typeof options.clientIp !== "function")
      throw new TypeError("clientIp is required");

    this.usesProxyKey = Boolean(proxyKey);
    this.key = proxyKey ?? secretKey!;
    this.scope = parseKey(this.key, this.usesProxyKey ? "px" : "sk");
    this.upstream = normalizeOrigin(options.upstream ?? DEFAULT_ENDPOINT);
    this.apiVersion = normalizeApiVersion(options.apiVersion);
    this.prefix = normalizePrefix(options.prefix ?? DEFAULT_PREFIX);
    this.maxBodyBytes = positiveInt(
      options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
      "maxBodyBytes",
    );
    this.timeoutMs = positiveInt(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "timeoutMs",
    );
    this.clientIp = options.clientIp;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  /**
   * Handles one browser request.
   *
   * Bound to the instance so it can be handed straight to a framework route,
   * as in `export const POST = proxy.handle`.
   *
   * @param request The incoming same-origin request.
   * @returns The upstream response, or 405/404/401/413 when it is refused
   *   before any forwarding.
   */
  readonly handle = async (request: Request): Promise<Response> => {
    if (request.method !== "POST")
      return refuse(405, "Method Not Allowed", { allow: "POST" });

    const url = new URL(request.url);
    const upstreamPath = this.routeFor(url.pathname);
    if (!upstreamPath) return refuse(404, "Not Found");

    const apiKey = this.upstreamKeyFor(request.headers.get("x-api-key"));
    if (apiKey === null) return refuse(401, "Unauthorized");

    // Refuse on the declared size first; readBody enforces the real one.
    if (Number(request.headers.get("content-length")) > this.maxBodyBytes)
      return refuse(413, "Payload Too Large");

    return withDeadline(this.timeoutMs, request.signal, async (signal) => {
      const body = await readBody(request, this.maxBodyBytes, signal);
      if (body === null) return refuse(413, "Payload Too Large");
      const response = await this.fetchImpl(this.upstream + upstreamPath, {
        method: "POST",
        headers: await this.upstreamHeaders(request, url, apiKey),
        body,
        redirect: "manual",
        signal,
      });
      return relay(response);
    });
  };

  /**
   * Maps a local path to its upstream path.
   *
   * Event reads need a secret key and must stay unreachable from a browser, so
   * only identify and supplement are proxyable.
   *
   * @returns The upstream path, or null when the route is not proxyable.
   */
  private routeFor(pathname: string): string | null {
    const versioned = `/api/${this.apiVersion}`;
    const mount = this.prefix + versioned;
    if (!pathname.startsWith(mount + "/")) return null;
    const resource = pathname.slice(mount.length);
    if (resource !== "/identify" && !SUPPLEMENT_PATH.test(resource))
      return null;
    return versioned + resource;
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
  private upstreamKeyFor(presented: string | null): string | null {
    if (!this.usesProxyKey) return this.key;
    try {
      const browser = parseKey(presented ?? "", "pk");
      return browser.environment === this.scope.environment ? presented : null;
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
    });
    if (this.usesProxyKey) headers.set("x-fingerly-proxy-key", this.key);
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

/** Validates the local mount path and drops trailing slashes. */
function normalizePrefix(value: string): string {
  const prefix = value.replace(/\/+$/, "");
  if (!prefix.startsWith("/") || prefix.includes("?") || prefix.includes("#"))
    throw new TypeError("prefix must be an absolute URL path");
  return prefix;
}

/** Builds a plain-text refusal that never reaches Fingerly. */
function refuse(
  status: number,
  message: string,
  headers: HeadersInit = {},
): Response {
  return new Response(message, { status, headers });
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
 * Returns the upstream response to the browser.
 *
 * The body is always drained, inside the caller's deadline, so a stalled
 * upstream times out instead of holding a connection open.
 */
async function relay(response: Response): Promise<Response> {
  const bytes = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  for (const name of CONNECTION_HEADERS) headers.delete(name);
  headers.set("cache-control", "no-store");
  return new Response(BODILESS_STATUSES.has(response.status) ? null : bytes, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
