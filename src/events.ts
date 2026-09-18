import { positiveInt } from "./config.js";
import type { APITransport } from "./transport.js";
import type { Event, EventListOptions, EventPage } from "./types.js";

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
   * @throws {FingerlyAPIError} `404 event_not_found` if it is not stored yet;
   *   an event is readable as soon as identification answers, so this is a
   *   request id that was never issued rather than one that has not landed.
   */
  get(requestId: string, signal?: AbortSignal): Promise<Event> {
    return this.transport.get<Event>(
      `/events/${encodeURIComponent(requestId)}`,
      signal,
    );
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

    const search = params.toString();
    return this.transport.get<EventPage>(
      search ? `/events?${search}` : "/events",
      query.signal,
    );
  }
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
