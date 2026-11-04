/**
 * Server-side Fingerly SDK: event reads, webhook verification and a
 * same-origin proxy for the browser SDK.
 *
 * @packageDocumentation
 */

export { Fingerly, load } from "./client.js";
export { EventsClient } from "./events.js";
export { FingerlyProxy, createNodeProxy, createProxy } from "./proxy.js";
export { verifyWebhook } from "./webhooks.js";
export {
  FingerlyAPIError,
  FingerlyConnectionError,
  FingerlyTimeoutError,
} from "./errors.js";
export type { APIErrorMetadata } from "./errors.js";
export type {
  Event,
  EventTrigger,
  EventPage,
  EventListOptions,
  FingerlyOptions,
  NodeNext,
  NodeRequest,
  NodeResponse,
  ProxyFailure,
  ProxyOptions,
  ProxyPeer,
  VerifyWebhookOptions,
} from "./types.js";
