import {
  DEFAULT_ENDPOINT,
  normalizeApiVersion,
  normalizeOrigin,
  parseKey,
  positiveInt,
} from "./config.js";
import { withDeadline } from "./deadline.js";
import { MAX_RESPONSE_BYTES, readLimited } from "./body.js";
import { FingerlyAPIError, FingerlyConnectionError } from "./errors.js";
import type { APIErrorMetadata } from "./errors.js";
import { REDACTED, inspectCustom } from "./redact.js";
import type { FingerlyOptions } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5_000;

/** Shape of the API's error envelope; every field is treated as untrusted. */
interface ErrorBody {
  error?: { code?: unknown; details?: unknown };
  request_id?: unknown;
}

/**
 * Authenticated JSON reads against the Fingerly API.
 *
 * Every request carries a deadline that covers receiving the body, refuses
 * redirects so the key is never replayed to another host, and reports failures
 * as {@link FingerlyAPIError} without echoing the response body.
 */
export class APITransport {
  /** Versioned base URL, e.g. `https://api.fingerly.io/api/v1`. */
  private readonly baseUrl: string;
  /** Deadline covering both the request and reading its JSON body. */
  private readonly timeoutMs: number;
  /** Replacement HTTP implementation; the global `fetch` when absent. */
  private readonly fetchImpl: typeof fetch | undefined;
  /**
   * Server-only read key, sent as `x-api-key` and redacted from errors. A
   * `#private` field, so inspecting or serialising the client never shows it.
   */
  readonly #secretKey: string | undefined;

  /**
   * @param options Client options; all of them are validated here.
   * @throws {TypeError} If the endpoint, version or timeout is invalid. The
   *   key is checked on the first request, which rejects with a TypeError
   *   before any network access when it is not a secret key.
   */
  constructor(options: FingerlyOptions) {
    const origin = normalizeOrigin(options.endpoint ?? DEFAULT_ENDPOINT);
    const apiVersion = normalizeApiVersion(options.apiVersion);

    this.baseUrl = `${origin}/api/${apiVersion}`;
    this.timeoutMs = positiveInt(
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      "timeoutMs",
    );
    this.fetchImpl = options.fetchImpl;
    this.#secretKey = options.secretKey;
  }

  /**
   * Performs one GET and parses its JSON body. Never retries.
   *
   * @param path Path below the versioned base URL, already encoded.
   * @param signal Caller cancellation; its reason is preserved.
   * @throws {FingerlyAPIError} On any non-2xx response, redirects included,
   *   and on a 2xx that is not JSON or exceeds 4 MiB.
   * @throws {FingerlyTimeoutError} When the deadline elapses.
   * @throws {FingerlyConnectionError} When the API cannot be reached or the
   *   connection drops mid-response.
   */
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    // Validated on use rather than at construction, so a build without
    // secrets can load the module that creates the client. A public, proxy or
    // management key still never reaches the network, whatever the endpoint.
    try {
      parseKey(this.#secretKey ?? "", "sk");
    } catch (error) {
      return Promise.reject(error);
    }
    return withDeadline(this.timeoutMs, signal, async (bounded) => {
      let response: Response;
      let bytes: Buffer | null;
      try {
        // Read at call time: a client made at module scope predates a
        // framework's fetch patch, and the framework must see `no-store` to
        // treat this read as dynamic.
        response = await (this.fetchImpl ?? fetch)(this.baseUrl + path, {
          headers: {
            "x-api-key": this.#secretKey!,
            accept: "application/json",
          },
          redirect: "manual",
          // Frameworks that patch fetch (Next.js) otherwise serve a read from
          // their cache, or freeze it into a build, as a stale event.
          cache: "no-store",
          signal: bounded,
        });
        bytes = await readLimited(response.body, MAX_RESPONSE_BYTES, bounded);
      } catch (error) {
        // The deadline and the caller's cancellation win the race in
        // withDeadline; anything else is the network or a cut-off body.
        if (bounded.aborted) throw bounded.reason;
        // Next.js throws from a `no-store` fetch during static generation to
        // make the page dynamic; wrapped, that signal fails the build instead.
        if ((error as { digest?: unknown } | null)?.digest !== undefined)
          throw error;
        throw new FingerlyConnectionError(error);
      }
      if (!response.ok) throw this.toApiError(response, bytes);
      if (bytes === null)
        throw this.invalidResponse(response, "response_too_large");
      try {
        return JSON.parse(bytes.toString("utf8")) as T;
      } catch {
        throw this.invalidResponse(response, "invalid_response");
      }
    });
  }

  /**
   * A 2xx the SDK cannot use: too large or not JSON. Its body is never quoted,
   * not even in the parser's message.
   */
  private invalidResponse(response: Response, code: string): FingerlyAPIError {
    return new FingerlyAPIError(
      `Fingerly API returned an unusable HTTP ${response.status} response`,
      response.status,
      this.headerMetadata(response, { code }),
    );
  }

  /**
   * Maps an error response, redirects included, to a redacted
   * {@link FingerlyAPIError}.
   */
  private toApiError(
    response: Response,
    bytes: Buffer | null,
  ): FingerlyAPIError {
    const metadata: APIErrorMetadata = {};
    try {
      const body = JSON.parse(
        bytes?.toString("utf8") ?? "",
      ) as ErrorBody | null;
      if (typeof body?.error?.code === "string")
        metadata.code = this.redact(body.error.code);
      if (body?.error?.details !== undefined)
        // A JSON round-trip redacts nested values without walking the tree.
        metadata.details = JSON.parse(
          this.redact(JSON.stringify(body.error.details)),
        );
      if (typeof body?.request_id === "string")
        metadata.requestId = this.redact(body.request_id);
    } catch {
      // A non-JSON, oversized or truncated body still reports its HTTP
      // status, and its contents are deliberately dropped.
    }
    return new FingerlyAPIError(
      `Fingerly API returned HTTP ${response.status}`,
      response.status,
      this.headerMetadata(response, metadata),
    );
  }

  /** Adds what the headers say: the request id fallback and Retry-After. */
  private headerMetadata(
    response: Response,
    metadata: APIErrorMetadata,
  ): APIErrorMetadata {
    const requestId = response.headers.get("x-request-id");
    if (metadata.requestId === undefined && requestId)
      metadata.requestId = this.redact(requestId);
    metadata.retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    return metadata;
  }

  /** What `JSON.stringify` and `console.log` show: everything but the key. */
  toJSON(): Record<string, unknown> {
    return {
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs,
      secretKey: REDACTED,
    };
  }

  [inspectCustom](): Record<string, unknown> {
    return this.toJSON();
  }

  /** Strips the secret key from anything an error may carry to logs. */
  private redact(value: string): string {
    const key = this.#secretKey;
    return key ? value.split(key).join(REDACTED) : value;
  }
}

/**
 * Reads `Retry-After` as whole seconds from now: either form the header
 * allows, delta-seconds or an HTTP date. Null when absent or unreadable.
 */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  // An HTTP date names its weekday and month; bare numbers like "-5" are not
  // dates, however leniently Date.parse reads them.
  if (!/[A-Za-z]/.test(trimmed)) return null;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - now) / 1000));
}
