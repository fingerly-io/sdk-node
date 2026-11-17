/**
 * The ESM and CommonJS builds are separate copies, so an app that loads both
 * (a bundler on one side, `require` on the other) has two of every class and
 * a plain `instanceof` fails across them. Each error carries a registry-wide
 * symbol brand instead, and `instanceof` checks that.
 */
function brand(instance: object, kind: string): void {
  Object.defineProperty(instance, Symbol.for(`@fingerly/node:${kind}`), {
    value: true,
  });
}

/** True when `value` was branded `kind` by either copy of the SDK. */
function branded(value: unknown, kind: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<symbol, unknown>)[Symbol.for(`@fingerly/node:${kind}`)] ===
      true
  );
}

/**
 * Raised when the Fingerly API cannot be reached, or the connection drops
 * before the whole response arrived. The runtime's own error is kept as
 * `cause` for debugging; the message names no host internals.
 */
export class FingerlyConnectionError extends Error {
  override readonly name: string = "FingerlyConnectionError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return branded(value, "FingerlyConnectionError");
  }

  /** @param cause The runtime error behind the failure, if any. */
  constructor(cause?: unknown, message = "Could not reach the Fingerly API") {
    super(message);
    brand(this, "FingerlyConnectionError");
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

  static override [Symbol.hasInstance](value: unknown): boolean {
    return branded(value, "FingerlyTimeoutError");
  }

  constructor() {
    super(undefined, "Fingerly request timed out");
    brand(this, "FingerlyTimeoutError");
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
  override readonly name: string = "FingerlyAPIError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return branded(value, "FingerlyAPIError");
  }
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
    brand(this, "FingerlyAPIError");
    if (metadata.code !== undefined) this.code = metadata.code;
    if (metadata.details !== undefined) this.details = metadata.details;
    if (metadata.requestId !== undefined) this.requestId = metadata.requestId;
    this.retryAfter = metadata.retryAfter ?? null;
  }

  /**
   * True for `404 event_pending`: the request id was accepted but its event is
   * not recorded yet. Not a verdict; try again after `retryAfter` seconds.
   * `event_not_found` (never issued, or past retention) is not pending.
   */
  get isPending(): boolean {
    return this.code === "event_pending";
  }

  /**
   * Apple's HTTP status for `422 apple_rejected` on a DeviceCheck call, read
   * from the `apple_status` entry of `details`; null for any other error.
   */
  get appleStatus(): number | null {
    if (this.code !== "apple_rejected" || !Array.isArray(this.details))
      return null;
    for (const entry of this.details as unknown[]) {
      const detail = entry as { field?: unknown; issue?: unknown } | null;
      if (detail?.field !== "apple_status" || typeof detail.issue !== "string")
        continue;
      return /^\d{3}$/.test(detail.issue) ? Number(detail.issue) : null;
    }
    return null;
  }
}

/**
 * Raised by `fingerly.events.consume` (`409 event_already_consumed`) when the
 * event was consumed by an earlier call. A kind of {@link FingerlyAPIError}
 * with `status` 409 and `code` `event_already_consumed`.
 */
export class FingerlyEventAlreadyConsumedError extends FingerlyAPIError {
  override readonly name: string = "FingerlyEventAlreadyConsumedError";

  static override [Symbol.hasInstance](value: unknown): boolean {
    return branded(value, "FingerlyEventAlreadyConsumedError");
  }

  /**
   * When the first call consumed the event (RFC 3339, as the API sent it), or
   * null when the answer did not say.
   */
  readonly consumedAt: string | null;

  /**
   * @param message Human-readable summary.
   * @param status The HTTP status code, 409.
   * @param metadata Structured detail parsed from the error body.
   * @param consumedAt When the event was first consumed, if known.
   */
  constructor(
    message: string,
    status: number,
    metadata: APIErrorMetadata,
    consumedAt: string | null,
  ) {
    super(message, status, metadata);
    brand(this, "FingerlyEventAlreadyConsumedError");
    this.consumedAt = consumedAt;
  }
}
