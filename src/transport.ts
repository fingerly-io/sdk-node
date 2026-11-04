import {
  DEFAULT_ENDPOINT,
  normalizeApiVersion,
  normalizeOrigin,
  parseKey,
  positiveInt,
} from "./config.js";
import { withDeadline } from "./deadline.js";
import { FingerlyAPIError } from "./errors.js";
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
  /** HTTP implementation; replaceable in tests or custom hosts. */
  private readonly fetchImpl: typeof fetch;
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
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.#secretKey = options.secretKey;
  }

  /**
   * Performs one GET and parses its JSON body. Never retries.
   *
   * @param path Path below the versioned base URL, already encoded.
   * @param signal Caller cancellation; its reason is preserved.
   * @throws {FingerlyAPIError} On any non-2xx response.
   * @throws {FingerlyTimeoutError} When the deadline elapses.
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
      const response = await this.fetchImpl(this.baseUrl + path, {
        headers: { "x-api-key": this.#secretKey!, accept: "application/json" },
        redirect: "manual",
        signal: bounded,
      });
      if (!response.ok) throw await this.toApiError(response);
      return (await response.json()) as T;
    });
  }

  /** Maps an error response to a redacted {@link FingerlyAPIError}. */
  private async toApiError(response: Response): Promise<FingerlyAPIError> {
    const metadata: APIErrorMetadata = {};
    try {
      const body = (await response.json()) as ErrorBody | null;
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
      // A non-JSON or truncated body still reports its HTTP status, and its
      // contents are deliberately dropped rather than surfaced.
    }
    return new FingerlyAPIError(
      `Fingerly API returned HTTP ${response.status}`,
      response.status,
      metadata,
    );
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
