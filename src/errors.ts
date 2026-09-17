/**
 * Raised when an SDK deadline elapses.
 *
 * Deadlines cover the whole operation, including reading the response body, so
 * a stalled stream times out like a stalled connection.
 */
export class FingerlyTimeoutError extends Error {
  override readonly name = "FingerlyTimeoutError";

  /**
   * @param operation `event_wait` for `events.waitFor` polling, `request` for
   *   a single HTTP request.
   */
  constructor(readonly operation: "request" | "event_wait" = "request") {
    super(
      operation === "event_wait"
        ? "Timed out waiting for the event"
        : "Fingerly request timed out",
    );
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
  }
}
