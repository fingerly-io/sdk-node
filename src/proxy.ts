import {
  credential as parseCredential,
  endpointForKey,
  endpoint as normalizeEndpoint,
} from "./credentials.js";
import type { Credential } from "./credentials.js";
import { readBody } from "./body.js";
import { deadline, positive } from "./timing.js";
import type { ProxyOptions } from "./types.js";

/** Same-origin handler for identify and supplement POSTs, never event reads. */
export class FingerlyProxy {
  private readonly key: string;
  private readonly credential: Credential;
  private readonly upstream: string;
  private readonly prefix: string;
  private readonly maxBodyBytes: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly clientIp: ProxyOptions["clientIp"];
  private readonly usesProxyKey: boolean;

  constructor(options: ProxyOptions) {
    if (!options.proxyKey && !options.secretKey)
      throw new TypeError("A Fingerly proxy key is required");
    if (options.proxyKey && options.secretKey)
      throw new TypeError("Pass proxyKey or deprecated secretKey, not both");
    this.usesProxyKey = Boolean(options.proxyKey);
    this.key = options.proxyKey ?? options.secretKey!;
    const kind = this.usesProxyKey ? "px" : "sk";
    this.credential = parseCredential(this.key, kind);
    this.upstream = normalizeEndpoint(
      options.upstream ?? endpointForKey(this.key, kind),
    );
    this.prefix = (options.prefix ?? "/api/fingerly").replace(/\/+$/, "");
    this.maxBodyBytes = positive(
      options.maxBodyBytes ?? 1_048_576,
      "maxBodyBytes",
    );
    this.timeoutMs = positive(options.timeoutMs ?? 5_000, "timeoutMs");
    if (
      !this.prefix.startsWith("/") ||
      this.prefix.includes("?") ||
      this.prefix.includes("#")
    )
      throw new TypeError("prefix must be an absolute URL path");
    if (typeof options.clientIp !== "function")
      throw new TypeError("clientIp is required");
    this.clientIp = options.clientIp;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  // Bound so this can be passed directly to a framework's request handler.
  readonly handle = async (request: Request): Promise<Response> => {
    if (request.method !== "POST")
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "POST" },
      });
    const incoming = new URL(request.url);
    const path = this.allowedPath(incoming.pathname);
    if (!path) return new Response("Not Found", { status: 404 });
    const publicKey = request.headers.get("x-api-key");
    if (this.usesProxyKey && !this.acceptsPublicKey(publicKey))
      return new Response("Unauthorized", { status: 401 });
    if (Number(request.headers.get("content-length")) > this.maxBodyBytes)
      return new Response("Payload Too Large", { status: 413 });

    return deadline(
      this.timeoutMs,
      request.signal,
      "request",
      async (signal) => {
        const body = await readBody(request, this.maxBodyBytes, signal);
        if (body === null)
          return new Response("Payload Too Large", { status: 413 });
        const headers = await this.forwardHeaders(request, incoming, publicKey);
        const response = await this.fetchImpl(this.upstream + path, {
          method: "POST",
          headers,
          body,
          redirect: "manual",
          signal,
        });
        return this.forwardResponse(response);
      },
    );
  };

  private allowedPath(pathname: string): string | null {
    if (!pathname.startsWith(this.prefix + "/api/v1/")) return null;
    const path = pathname.slice(this.prefix.length);
    return path === "/api/v1/identify" ||
      /^\/api\/v1\/events\/[^/]+\/supplement$/.test(path)
      ? path
      : null;
  }

  private acceptsPublicKey(key: string | null): boolean {
    try {
      const presented = parseCredential(key ?? "", "pk");
      return (
        presented.region === this.credential.region &&
        presented.environment === this.credential.environment
      );
    } catch {
      return false;
    }
  }

  private async forwardHeaders(
    request: Request,
    incoming: URL,
    publicKey: string | null,
  ): Promise<Headers> {
    const headers = new Headers({
      "content-type": request.headers.get("content-type") ?? "application/json",
      "x-api-key": this.usesProxyKey ? publicKey! : this.key,
      "x-fingerly-client-ip": await this.clientIp(request),
      "x-fingerly-origin": request.headers.get("origin") ?? incoming.origin,
      "x-fingerly-user-agent": request.headers.get("user-agent") ?? "",
    });
    if (this.usesProxyKey) headers.set("x-fingerly-proxy-key", this.key);
    const idempotency = request.headers.get("idempotency-key");
    if (idempotency) headers.set("idempotency-key", idempotency);
    return headers;
  }

  private async forwardResponse(response: Response): Promise<Response> {
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    const bytes = await response.arrayBuffer();
    return new Response(
      [204, 205, 304].includes(response.status) ? null : bytes,
      {
        status: response.status,
        statusText: response.statusText,
        headers,
      },
    );
  }
}

/** Compatibility factory for frameworks expecting a plain request handler. */
export function createProxy(options: ProxyOptions): FingerlyProxy["handle"] {
  return new FingerlyProxy(options).handle;
}
