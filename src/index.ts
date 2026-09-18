/**
 * Server-side Fingerly SDK: event reads, webhook verification and a
 * same-origin proxy for the browser SDK.
 *
 * @packageDocumentation
 */

export { Fingerly, load } from "./client.js";
export { EventsClient } from "./events.js";
export { FingerlyProxy, createProxy } from "./proxy.js";
export { verifyWebhook } from "./webhooks.js";
export { FingerlyAPIError, FingerlyTimeoutError } from "./errors.js";
export type { APIErrorMetadata } from "./errors.js";
export type {
  Event,
  EventTrigger,
  EventPage,
  EventListOptions,
  FingerlyOptions,
  ProxyOptions,
  VerifyWebhookOptions,
} from "./types.js";
