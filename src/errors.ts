/**
 * Raised when the Fingerly API cannot be reached, or the connection drops
 * before the whole response arrived. The runtime's own error is kept as
 * `cause` for debugging; the message names no host internals.
 */
export class FingerlyConnectionError extends Error {
  override readonly name: string = "FingerlyConnectionError";

  /** @param cause The runtime error behind the failure, if any. */
  constructor(cause?: unknown, message = "Could not reach the Fingerly API") {
    super(message);
    if (cause !== undefined)
      Object.defineProperty(this, "cause", {
        value: cause,
        configurable: true,
        writable: true,
      });
  }
}

/**
 * Raised when an SDK deadline elapses.
 *
 * Deadlines cover the whole operation, including reading the response body, so
 * a stalled stream times out like a stalled connection. A kind of
 * {@link FingerlyConnectionError}.
 */
export class FingerlyTimeoutError extends FingerlyConnectionError {
  override readonly name = "FingerlyTimeoutError";

  constructor() {
    super(undefined, "Fingerly request timed out");
  }
}

/** Structured detail the API returns alongside an error response. */
export interface APIErrorMetadata {
  /** Stable machine-readable code, such as `event_not_found`. */
  code?: string;
  /** Additional context; shape depends on the code. */
  details?: unknown;
  /** Server-side trace id to quote in support requests. */
  requestId?: string;
  /**
   * Seconds to wait before trying again, from `Retry-After`; null when the
   * response did not say. Reads are never retried automatically.
   */
  retryAfter?: number | null;
}

/**
 * Raised for any non-2xx response from the Fingerly API.
 *
 * The message carries only the HTTP status: response bodies are never echoed,
 * and any occurrence of the secret key in the metadata is redacted.
 */
export class FingerlyAPIError extends Error {
  override readonly name = "FingerlyAPIError";
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;
  /** Seconds to wait before retrying, from `Retry-After`, or null. */
  readonly retryAfter: number | null;

  /**
   * @param message Human-readable summary.
   * @param status The HTTP status code.
   * @param metadata Structured detail parsed from the error body, if any.
   */
  constructor(
    message: string,
    readonly status: number,
    metadata: APIErrorMetadata = {},
  ) {
    super(message);
    if (metadata.code !== undefined) this.code = metadata.code;
    if (metadata.details !== undefined) this.details = metadata.details;
    if (metadata.requestId !== undefined) this.requestId = metadata.requestId;
    this.retryAfter = metadata.retryAfter ?? null;
  }
}
