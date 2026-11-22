import { AgentsClient } from "./agents.js";
import { DeviceCheckClient } from "./device-check.js";
import { EventsClient } from "./events.js";
import { FingerlyProxy } from "./proxy.js";
import { AgentSightings } from "./sightings.js";
import { APITransport } from "./transport.js";
import { verifyWebhook } from "./webhooks.js";
import type {
  AgentSightingsOptions,
  FingerlyOptions,
  ProxyOptions,
  VerifyWebhookOptions,
} from "./types.js";

/**
 * The Fingerly server SDK.
 *
 * Construct it once and reuse it. Secret keys and webhook secrets belong in
 * server-side code only; a browser must never see either.
 *
 * @example
 * ```ts
 * const fingerly = new Fingerly({ secretKey: process.env.FINGERLY_SECRET_KEY! })
 * const page = await fingerly.events.list({ limit: 50, level: 'high' })
 * ```
 */
export class Fingerly {
  /** Event reads under this client's secret key. */
  readonly events: EventsClient;
  /** Apple DeviceCheck bits of an iOS event's device, under the same key. */
  readonly deviceCheck: DeviceCheckClient;
  /** Reports of the requests your server served, under the same key. */
  readonly agents: AgentsClient;

  /**
   * @param options Secret key, plus optional endpoint, version and deadline.
   * @throws {TypeError} If any option is invalid. Nothing is sent until then.
   */
  constructor(options: FingerlyOptions) {
    const transport = new APITransport(options);
    this.events = new EventsClient(transport);
    this.deviceCheck = new DeviceCheckClient(transport);
    this.agents = new AgentsClient(transport);
  }

  /**
   * Creates the agent sightings reporter: reports the requests your server
   * served in the background and answers `lookup` from memory.
   *
   * @param options Secret key and the callback resolving the visitor's IP.
   */
  static createAgentSightings(options: AgentSightingsOptions): AgentSightings {
    return new AgentSightings(options);
  }

  /**
   * Verifies a webhook delivery. Stateless, so no client instance is needed.
   *
   * @param options Secret, raw payload, and the signature and timestamp headers.
   * @returns True when the delivery is authentic and recent.
   */
  static verifyWebhook(options: VerifyWebhookOptions): boolean {
    return verifyWebhook(options);
  }

  /**
   * Creates a same-origin proxy handler for the browser SDK.
   *
   * @param options Proxy key and the callback resolving the visitor's IP.
   * @returns A bound handler to mount on your own domain.
   */
  static createProxy(options: ProxyOptions): FingerlyProxy["handle"] {
    return new FingerlyProxy(options).handle;
  }

  /**
   * Creates a same-origin proxy as Node middleware, for Express, NestJS and
   * `node:http`.
   *
   * @param options Proxy key, path and the callback resolving the visitor's IP.
   * @returns A bound `(req, res, next?)` handler; mount it before body parsers.
   */
  static createNodeProxy(options: ProxyOptions): FingerlyProxy["handleNode"] {
    return new FingerlyProxy(options).handleNode;
  }
}

/**
 * Creates a client. Identical to `new Fingerly(options)`.
 *
 * Kept for callers written against the factory form.
 */
export function load(options: FingerlyOptions): Fingerly {
  return new Fingerly(options);
}
