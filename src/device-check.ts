import type { APITransport } from "./transport.js";
import type {
  DeviceCheckBits,
  DeviceCheckWrite,
  DeviceCheckWriteResult,
} from "./types.js";

/**
 * Spends the Apple DeviceCheck token held for an iOS event: once, to read the
 * device's two bits or to set them.
 *
 * A token pays for one Apple call, a read or a write, never both, so a "check,
 * then mark" flow such as a once-per-device trial reads on one identification
 * and writes on the next. After a `503` or a transport failure the SDK resends
 * the identical request; the API accepts a retry only when it repeats the
 * first request for that token.
 *
 * Reached as `fingerly.deviceCheck`; it is never constructed directly.
 */
export class DeviceCheckClient {
  constructor(private readonly transport: APITransport) {}

  /**
   * Reads the device's bits from Apple, spending the event's token.
   *
   * @param requestId The `request_id` of an iOS identification from the last
   *   hour.
   * @param signal Caller cancellation; it also stops retries.
   * @throws {FingerlyAPIError} With a {@link DeviceCheckErrorCode} `code`.
   * @throws {TypeError} If `requestId` is empty, `.` or `..`; no request is
   *   sent.
   */
  async query(
    requestId: string,
    signal?: AbortSignal,
  ): Promise<DeviceCheckBits> {
    const answer = await this.transport.retrySame<DeviceCheckBits>(
      "POST",
      `${eventPath(requestId)}/device-check/query`,
      undefined,
      signal,
    );
    const bits: DeviceCheckBits = {
      found: answer.found === true,
      bit0: answer.bit0 === true,
      bit1: answer.bit1 === true,
    };
    if (typeof answer.last_update === "string")
      bits.last_update = answer.last_update;
    return bits;
  }

  /**
   * Sets `bit0`, `bit1` or both with Apple, spending the event's token. A bit
   * left out keeps its value.
   *
   * @param requestId The `request_id` of an iOS identification from the last
   *   hour.
   * @param bits The bits to set; at least one.
   * @param signal Caller cancellation; it also stops retries.
   * @returns The bits Apple accepted.
   * @throws {FingerlyAPIError} With a {@link DeviceCheckErrorCode} `code`.
   * @throws {TypeError} If `requestId` is not usable or `bits` names neither
   *   bit as a boolean; no request is sent.
   */
  async write(
    requestId: string,
    bits: DeviceCheckWrite,
    signal?: AbortSignal,
  ): Promise<DeviceCheckWriteResult> {
    const path = `${eventPath(requestId)}/device-check`;
    const body: DeviceCheckWrite = {};
    for (const name of ["bit0", "bit1"] as const) {
      const value = bits?.[name];
      if (value === undefined) continue;
      if (typeof value !== "boolean")
        throw new TypeError(`${name} must be a boolean`);
      body[name] = value;
    }
    if (body.bit0 === undefined && body.bit1 === undefined)
      throw new TypeError("name bit0, bit1 or both");
    const answer = await this.transport.retrySame<{
      bit0?: boolean | null;
      bit1?: boolean | null;
    }>("PUT", path, body, signal);
    const result: DeviceCheckWriteResult = {};
    if (typeof answer.bit0 === "boolean") result.bit0 = answer.bit0;
    if (typeof answer.bit1 === "boolean") result.bit1 = answer.bit1;
    return result;
  }
}

/**
 * The event's path, refusing ids a URL parser would resolve as dot segments
 * even percent-encoded (see `EventsClient.get`).
 */
function eventPath(requestId: string): string {
  if (
    typeof requestId !== "string" ||
    requestId === "" ||
    requestId === "." ||
    requestId === ".."
  )
    throw new TypeError("requestId is not a Fingerly request id");
  return `/events/${encodeURIComponent(requestId)}`;
}
