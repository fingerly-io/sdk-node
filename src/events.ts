import { positiveInt } from "./config.js";
import { acceptEvent, acceptEventPage } from "./decode.js";
import {
  FingerlyAPIError,
  FingerlyEventAlreadyConsumedError,
} from "./errors.js";
import type { APITransport } from "./transport.js";
import type {
  Event,
  EventConsumption,
  EventListOptions,
  EventPage,
  VerifyOptions,
  VerifyResult,
} from "./types.js";

/**
 * Reads events stored for the organisation and environment of the secret key.
 *
 * Reached as `fingerly.events`; it is never constructed directly.
 */
export class EventsClient {
  constructor(private readonly transport: APITransport) {}

  /**
   * Fetches one event by request id.
   *
   * @param requestId The `request_id` returned by identification.
   * @param signal Caller cancellation.
   * @throws {FingerlyAPIError} `404 event_pending` (`isPending`, with
   *   `retryAfter`) if the request id was accepted but the event is not
   *   recorded yet; `404 event_not_found` if it was never issued or is past
   *   retention. Neither is retried automatically.
   * @throws {TypeError} If `requestId` is empty, `.` or `..`; no request is
   *   sent.
   */
  get(requestId: string, signal?: AbortSignal): Promise<Event> {
    let path: string;
    try {
      path = eventPath(requestId);
    } catch (error) {
      return Promise.reject(error);
    }
    return this.transport.get<Event>(path, signal, acceptEvent);
  }

  /**
   * Marks an event as consumed, once per organisation. One POST, never
   * retried.
   *
   * @param requestId The `request_id` returned by identification.
   * @param signal Caller cancellation.
   * @throws {FingerlyEventAlreadyConsumedError} `409 event_already_consumed`
   *   when an earlier call consumed the event; `consumedAt` says when.
   * @throws {FingerlyAPIError} `404 event_not_found` for an unknown event.
   * @throws {TypeError} If `requestId` is empty, `.` or `..`; no request is
   *   sent.
   */
  consume(requestId: string, signal?: AbortSignal): Promise<EventConsumption> {
    let path: string;
    try {
      path = eventPath(requestId);
    } catch (error) {
      return Promise.reject(error);
    }
    return this.transport.post<EventConsumption>(`${path}/consume`, signal);
  }

  /**
   * Reads an event handed over by a client and checks, in this order, that it
   * exists, is at most `maxAgeSeconds` old, carries `tag` (when given), is
   * identifiable and was scored. Only when all of them pass, and `consume` is
   * not false, it consumes the event, so one event backs one decision.
   *
   * It never judges the score: apply your own policy to `result.event` when
   * `result.ok` is true.
   *
   * @param requestId The `request_id` the client sent.
   * @param options `maxAgeSeconds` (300), `tag`, `consume` (true), `signal`.
   * @returns `{ ok, reason, event }`; `reason` is `""` when `ok`.
   * @throws {FingerlyAPIError} For any answer other than a missing event or
   *   an already consumed one, `404 event_pending` included.
   * @throws {TypeError} If the request id or an option is not usable; no
   *   request is sent.
   */
  async verify(
    requestId: string,
    options: VerifyOptions = {},
  ): Promise<VerifyResult> {
    const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
    if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds <= 0)
      throw new TypeError("maxAgeSeconds must be a positive integer");
    if (
      options.tag !== undefined &&
      (typeof options.tag !== "string" || options.tag === "")
    )
      throw new TypeError("tag must be a non-empty string");
    if (options.consume !== undefined && typeof options.consume !== "boolean")
      throw new TypeError("consume must be a boolean");
    eventPath(requestId);

    let event: Event;
    try {
      event = await this.get(requestId, options.signal);
    } catch (error) {
      if (isCode(error, 404, "event_not_found"))
        return { ok: false, reason: "not_found", event: null };
      throw error;
    }

    const occurredAt =
      typeof event.occurred_at === "string" && RFC3339.test(event.occurred_at)
        ? Date.parse(event.occurred_at)
        : Number.NaN;
    if (
      Number.isNaN(occurredAt) ||
      Date.now() - occurredAt > maxAgeSeconds * 1000
    )
      return { ok: false, reason: "too_old", event };
    if (options.tag !== undefined && (event.tag ?? "") !== options.tag)
      return { ok: false, reason: "tag_mismatch", event };
    if (!event.visitor_id)
      return { ok: false, reason: "unidentifiable", event };
    if (event.suspect_score === null || event.suspect_score === undefined)
      return { ok: false, reason: "unscored", event };

    if (options.consume !== false)
      try {
        await this.consume(requestId, options.signal);
      } catch (error) {
        if (error instanceof FingerlyEventAlreadyConsumedError)
          return { ok: false, reason: "already_consumed", event };
        if (isCode(error, 404, "event_not_found"))
          return { ok: false, reason: "not_found", event: null };
        throw error;
      }
    return { ok: true, reason: "", event };
  }

  /**
   * Lists events within the retention window, newest first.
   *
   * @param query Filters; omitted ones are not sent and the server defaults.
   * @throws {TypeError} If a date, page or limit is not usable.
   */
  list(query: EventListOptions = {}): Promise<EventPage> {
    const params = new URLSearchParams();
    if (query.from !== undefined)
      params.set("from", rfc3339(query.from, "from"));
    if (query.to !== undefined) params.set("to", rfc3339(query.to, "to"));
    if (query.page !== undefined)
      params.set("page", String(positiveInt(query.page, "page")));
    if (query.limit !== undefined)
      params.set("limit", String(positiveInt(query.limit, "limit")));
    if (query.visitor !== undefined) params.set("visitor", query.visitor);
    if (query.level !== undefined) params.set("level", query.level);
    if (query.kind !== undefined) params.set("kind", query.kind);
    if (query.aiProvider !== undefined)
      params.set("ai_provider", query.aiProvider);
    if (query.aiPurpose !== undefined)
      params.set("ai_purpose", query.aiPurpose);

    const search = params.toString();
    return this.transport.get<EventPage>(
      search ? `/events?${search}` : "/events",
      query.signal,
      acceptEventPage,
    );
  }
}

/** How old an event `verify` accepts when `maxAgeSeconds` is omitted. */
const DEFAULT_MAX_AGE_SECONDS = 300;

/** An RFC 3339 date-time with a zone; anything else is unreadable. */
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

/**
 * The path of one event.
 *
 * @throws {TypeError} If `requestId` is empty, `.` or `..`.
 */
function eventPath(requestId: string): string {
  // URL parsers resolve a dot segment even when it is percent-encoded, so
  // escaping cannot keep these in the path: `.` and the empty id would name
  // the list route, and `..` a route above it, key attached.
  if (
    typeof requestId !== "string" ||
    requestId === "" ||
    requestId === "." ||
    requestId === ".."
  )
    throw new TypeError("requestId is not a Fingerly request id");
  return `/events/${encodeURIComponent(requestId)}`;
}

/** True for a {@link FingerlyAPIError} with this status and code. */
function isCode(error: unknown, status: number, code: string): boolean {
  return (
    error instanceof FingerlyAPIError &&
    error.status === status &&
    error.code === code
  );
}

/**
 * Renders a window bound in the RFC 3339 form the API expects.
 *
 * @throws {TypeError} If a `Date` is invalid. Strings pass through so callers
 *   can send a server-supplied cursor unchanged.
 */
function rfc3339(value: Date | string, name: string): string {
  if (typeof value === "string") return value;
  if (Number.isNaN(value.getTime()))
    throw new TypeError(`${name} must be a valid Date`);
  return value.toISOString();
}
