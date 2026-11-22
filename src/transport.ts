import {
  DEFAULT_ENDPOINT,
  normalizeApiOrigin,
  normalizeApiVersion,
  parseKey,
  positiveInt,
  SDK_VERSION,
} from "./config.js";
import { withDeadline } from "./deadline.js";
import { MAX_RESPONSE_BYTES, readLimited } from "./body.js";
import { isObject } from "./decode.js";
import {
  FingerlyAPIError,
  FingerlyConnectionError,
  FingerlyEventAlreadyConsumedError,
} from "./errors.js";
import type { APIErrorMetadata } from "./errors.js";
import { REDACTED, inspectCustom } from "./redact.js";
import type { FingerlyOptions } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5_000;
/** Retries of a DeviceCheck spend after a `503` or a transport failure. */
const SPEND_RETRIES = 2;
/** Base pause before a retry; the nth retry waits n times this. */
const RETRY_DELAY_MS = 200;
/** What every call names itself as, in place of the runtime's own `node`. */
const USER_AGENT = `fingerly-node/${SDK_VERSION}`;

/** Waits `ms`, or rejects with the signal's reason when it aborts first. */
function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** Per-call options for {@link APITransport.postJSON}. */
export interface SendOptions {
  /** Caller cancellation; its reason is preserved. */
  signal?: AbortSignal | undefined;
  /** Deadline for this call, replacing the client's. */
  timeoutMs?: number;
  /** Set to true once the answer's status line arrived. */
  progress?: { responded: boolean };
  /**
   * Checks a 2xx answer's object, and may tidy it in place; false turns it
   * into an `invalid_response` error.
   */
  accept?: (body: Record<string, unknown>) => boolean;
}

/** Shape of the API's error envelope; every field is treated as untrusted. */
interface ErrorBody {
  error?: { code?: unknown; details?: unknown; consumed_at?: unknown };
  code?: unknown;
  consumed_at?: unknown;
  request_id?: unknown;
}

/**
 * When an `event_already_consumed` answer says the event was consumed: a
 * top-level `consumed_at`, one inside `error`, or a `consumed_at` detail.
 */
function consumedAtOf(body: ErrorBody | null): string | null {
  if (typeof body?.consumed_at === "string") return body.consumed_at;
  if (typeof body?.error?.consumed_at === "string")
    return body.error.consumed_at;
  if (Array.isArray(body?.error?.details))
    for (const entry of body.error.details as unknown[]) {
      const detail = entry as { field?: unknown; issue?: unknown } | null;
      if (detail?.field === "consumed_at" && typeof detail.issue === "string")
        return detail.issue;
    }
  return null;
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
    if (
      options.allowInsecureLoopback !== undefined &&
      typeof options.allowInsecureLoopback !== "boolean"
    )
      throw new TypeError("allowInsecureLoopback must be a boolean");
    const origin = normalizeApiOrigin(
      options.endpoint ?? DEFAULT_ENDPOINT,
      options.allowInsecureLoopback === true,
      "endpoint",
    );
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
   * @param accept Checks the answer's object; false makes it unusable.
   * @throws {FingerlyAPIError} On any non-2xx response, redirects included,
   *   and on a 2xx that exceeds 4 MiB, is not a JSON object or fails
   *   `accept`.
   * @throws {FingerlyTimeoutError} When the deadline elapses.
   * @throws {FingerlyConnectionError} When the API cannot be reached or the
   *   connection drops mid-response.
   */
  get<T>(
    path: string,
    signal?: AbortSignal,
    accept?: SendOptions["accept"],
  ): Promise<T> {
    return this.send<T>(
      "GET",
      path,
      undefined,
      signal,
      accept ? { accept } : {},
    );
  }

  /**
   * Performs one POST without a body and parses its JSON answer. Never
   * retries, so a lost answer is never sent twice.
   *
   * @param path Path below the versioned base URL, already encoded.
   * @param signal Caller cancellation; its reason is preserved.
   */
  post<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.send<T>("POST", path, undefined, signal);
  }

  /**
   * Sends one POST or PUT with an optional JSON body, retrying the identical
   * request only after a `503` or a transport failure (timeouts included), at
   * most {@link SPEND_RETRIES} times. Any other answer is returned or thrown
   * as is. Used for spends that the API allows to be retried only unchanged.
   *
   * @param method `POST` or `PUT`.
   * @param path Path below the versioned base URL, already encoded.
   * @param body JSON value to send, serialised once for every attempt.
   * @param signal Caller cancellation; it stops further attempts.
   */
  async retrySame<T>(
    method: "POST" | "PUT",
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.send<T>(method, path, payload, signal);
      } catch (error) {
        const retryable =
          error instanceof FingerlyConnectionError ||
          (error instanceof FingerlyAPIError && error.status === 503);
        if (!retryable || attempt >= SPEND_RETRIES || signal?.aborted)
          throw error;
        await pause(RETRY_DELAY_MS * (attempt + 1), signal);
      }
    }
  }

  /**
   * Sends one POST with a JSON body and parses its JSON answer. One attempt,
   * never retried.
   *
   * @param path Path below the versioned base URL, already encoded.
   * @param body JSON value to send.
   * @param options Caller cancellation, a deadline replacing the client's,
   *   and a progress record whose `responded` turns true once the answer's
   *   status arrived, so a caller can tell a request that never reached the
   *   API from one whose answer was lost.
   */
  postJSON<T>(
    path: string,
    body: unknown,
    options: SendOptions = {},
  ): Promise<T> {
    return this.send<T>("POST", path, JSON.stringify(body), options.signal, {
      ...(options.timeoutMs !== undefined
        ? { timeoutMs: options.timeoutMs }
        : {}),
      ...(options.progress !== undefined ? { progress: options.progress } : {}),
    });
  }

  private send<T>(
    method: string,
    path: string,
    payload: string | undefined,
    signal?: AbortSignal,
    extra: Omit<SendOptions, "signal"> = {},
  ): Promise<T> {
    // Validated on use rather than at construction, so a build without
    // secrets can load the module that creates the client. A public, proxy or
    // management key still never reaches the network, whatever the endpoint.
    try {
      parseKey(this.#secretKey ?? "", "sk");
    } catch (error) {
      return Promise.reject(error);
    }
    return withDeadline(
      extra.timeoutMs ?? this.timeoutMs,
      signal,
      async (bounded) => {
        let response: Response;
        let bytes: Buffer | null;
        try {
          const headers: Record<string, string> = {
            "x-api-key": this.#secretKey!,
            accept: "application/json",
            "user-agent": USER_AGENT,
          };
          if (payload !== undefined)
            headers["content-type"] = "application/json";
          // Read at call time: a client made at module scope predates a
          // framework's fetch patch, and the framework must see `no-store` to
          // treat this read as dynamic.
          response = await (this.fetchImpl ?? fetch)(this.baseUrl + path, {
            method,
            headers,
            ...(payload !== undefined ? { body: payload } : {}),
            redirect: "manual",
            // Frameworks that patch fetch (Next.js) otherwise serve a read from
            // their cache, or freeze it into a build, as a stale event.
            cache: "no-store",
            signal: bounded,
          });
          if (extra.progress) extra.progress.responded = true;
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
        let parsed: unknown;
        try {
          parsed = JSON.parse(bytes.toString("utf8"));
        } catch {
          throw this.invalidResponse(response, "invalid_response");
        }
        // Every answer the API sends is a JSON object. Anything else, or an
        // object the caller's check refuses, would otherwise surface later
        // as a TypeError in the code reading it.
        if (!isObject(parsed) || (extra.accept && !extra.accept(parsed)))
          throw this.invalidResponse(response, "invalid_response");
        return parsed as T;
      },
    );
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
    let consumedAt: string | null = null;
    try {
      const body = JSON.parse(
        bytes?.toString("utf8") ?? "",
      ) as ErrorBody | null;
      if (typeof body?.error?.code === "string")
        metadata.code = this.redact(body.error.code);
      else if (typeof body?.code === "string")
        metadata.code = this.redact(body.code);
      if (metadata.code === "event_already_consumed") {
        const at = consumedAtOf(body);
        consumedAt = at === null ? null : this.redact(at);
      }
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
    if (metadata.code === "event_already_consumed")
      return new FingerlyEventAlreadyConsumedError(
        `Fingerly API returned HTTP ${response.status}`,
        response.status,
        this.headerMetadata(response, metadata),
        consumedAt,
      );
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
    const scope = response.headers.get("fingerly-ratelimit-scope");
    if (scope && /^[a-z_]{1,32}$/.test(scope)) metadata.rateLimitScope = scope;
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
