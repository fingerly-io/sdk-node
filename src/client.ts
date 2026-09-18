import { EventsClient } from "./events.js";
import { FingerlyProxy } from "./proxy.js";
import { APITransport } from "./transport.js";
import { verifyWebhook } from "./webhooks.js";
import type {
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

  /**
   * @param options Secret key, plus optional endpoint, version and deadline.
   * @throws {TypeError} If any option is invalid. Nothing is sent until then.
   */
  constructor(options: FingerlyOptions) {
    this.events = new EventsClient(new APITransport(options));
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
}

/**
 * Creates a client. Identical to `new Fingerly(options)`.
 *
 * Kept for callers written against the factory form.
 */
export function load(options: FingerlyOptions): Fingerly {
  return new Fingerly(options);
}
