import type { APITransport, SendOptions } from "./transport.js";
import type { AgentSighting, AgentSightingsResponse } from "./types.js";

/** Most requests one call reports. */
export const MAX_SIGHTINGS_PER_CALL = 200;

/**
 * Reports the requests your server served, so that clients which never run a
 * page's JavaScript, AI crawlers and fetchers above all, are seen.
 *
 * Reached as `fingerly.agents`; it is never constructed directly. Most apps
 * use the reporter from `createAgentSightings`, which batches, remembers the
 * answers and never delays a response; this is the call underneath it.
 */
export class AgentsClient {
  constructor(private readonly transport: APITransport) {}

  /**
   * Reports up to 200 requests as raw input and answers what sent each one,
   * in the same order. One POST, never retried.
   *
   * @param items The requests; the server refuses an empty list or more
   *   than 200. An item it cannot use (a field over 4096 bytes, an address
   *   that is not one literal, a count over 1000000) is answered
   *   `VisitorKind.Unknown` with `ttl` 0 in its place, and the others as
   *   usual.
   * @param signal Caller cancellation.
   * @throws {FingerlyAPIError} On any non-2xx answer: `422 invalid_request`
   *   when no item in the batch was usable, `429 rate_limited` with `retryAfter` and
   *   `rateLimitScope` (`daily` for the organisation's daily allowance).
   * @throws {FingerlyTimeoutError} When the deadline elapses.
   * @throws {FingerlyConnectionError} When the API cannot be reached.
   */
  sightings(
    items: readonly AgentSighting[],
    signal?: AbortSignal,
  ): Promise<AgentSightingsResponse> {
    return this.send(items, { signal });
  }

  /** The call behind {@link sightings}, with the reporter's own options. */
  send(
    items: readonly AgentSighting[],
    options: SendOptions,
  ): Promise<AgentSightingsResponse> {
    return this.transport.postJSON<AgentSightingsResponse>(
      "/agents/sightings",
      { items },
      options,
    );
  }
}
