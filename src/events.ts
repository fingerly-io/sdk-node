import { positiveInt } from "./config.js";
import { sleep, withDeadline } from "./deadline.js";
import { FingerlyAPIError } from "./errors.js";
import type { APITransport } from "./transport.js";
import type {
  Event,
  EventListOptions,
  EventPage,
  WaitForOptions,
} from "./types.js";

const DEFAULT_WAIT_TIMEOUT_MS = 10_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

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
   *   use {@link EventsClient.waitFor} to wait for a fresh identification.
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

  /**
   * Polls until a newly identified event becomes readable.
   *
   * Identification answers before the event is archived, so opt in to this
   * only when you have just identified a visitor. Only a structured
   * `404 event_not_found` is retried; every other failure propagates at once.
   *
   * @param requestId The `request_id` returned by identification.
   * @param options Total deadline, poll interval and caller cancellation.
   * @throws {FingerlyTimeoutError} With `operation: 'event_wait'` if the event
   *   is still missing at the deadline.
   * @throws {TypeError} If a timeout or interval is not a positive integer.
   */
  waitFor(requestId: string, options: WaitForOptions = {}): Promise<Event> {
    const timeoutMs = positiveInt(
      options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS,
      "timeoutMs",
    );
    const intervalMs = positiveInt(
      options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS,
      "intervalMs",
    );
    return withDeadline(
      timeoutMs,
      "event_wait",
      options.signal,
      async (signal) => {
        for (;;) {
          try {
            return await this.get(requestId, signal);
          } catch (error) {
            if (!isPending(error)) throw error;
          }
          await sleep(intervalMs, signal);
        }
      },
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

/** True for the one retryable failure: the event has not landed yet. */
function isPending(error: unknown): boolean {
  return (
    error instanceof FingerlyAPIError &&
    error.status === 404 &&
    error.code === "event_not_found"
  );
}
