import { FingerlyAPIError } from "./errors.js";
import { deadline, pause, positive } from "./timing.js";
import type { APITransport } from "./transport.js";
import type {
  Event,
  EventListOptions,
  EventPage,
  WaitForOptions,
} from "./types.js";

/** Stored events scoped to the client's organisation and key environment. */
export class EventsClient {
  constructor(private readonly transport: APITransport) {}

  get(requestId: string, signal?: AbortSignal): Promise<Event> {
    return this.transport.get<Event>(
      `/events/${encodeURIComponent(requestId)}`,
      signal,
    );
  }

  list(query: EventListOptions = {}): Promise<EventPage> {
    const params = new URLSearchParams();
    if (query.from !== undefined) params.set("from", instant(query.from));
    if (query.to !== undefined) params.set("to", instant(query.to));
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    if (query.visitor !== undefined) params.set("visitor", query.visitor);
    if (query.level !== undefined) params.set("level", query.level);
    const suffix = params.size === 0 ? "" : `?${params}`;
    return this.transport.get<EventPage>(`/events${suffix}`, query.signal);
  }

  /** Poll only event_not_found while the ingestion pipeline persists an event. */
  waitFor(requestId: string, options: WaitForOptions = {}): Promise<Event> {
    const interval = positive(options.intervalMs ?? 250, "intervalMs");
    return deadline(
      options.timeoutMs ?? 10_000,
      options.signal,
      "event_wait",
      async (signal) => {
        for (;;) {
          try {
            return await this.get(requestId, signal);
          } catch (error) {
            if (!isPendingEvent(error)) throw error;
          }
          await pause(interval, signal);
        }
      },
    );
  }
}

function instant(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isPendingEvent(error: unknown): boolean {
  return (
    error instanceof FingerlyAPIError &&
    error.status === 404 &&
    error.code === "event_not_found"
  );
}
