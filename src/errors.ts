/** SDK-owned deadlines cover both fetch and reading its response body. */
export class FingerlyTimeoutError extends Error {
  override readonly name = "FingerlyTimeoutError";
  constructor(readonly operation: "request" | "event_wait" = "request") {
    super(
      operation === "event_wait"
        ? "Timed out waiting for the event"
        : "Fingerly request timed out",
    );
  }
}

export interface APIErrorMetadata {
  code?: string;
  details?: unknown;
  requestId?: string;
}
export class FingerlyAPIError extends Error {
  override readonly name = "FingerlyAPIError";
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;
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
