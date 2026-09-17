import { EventsClient } from "./events.js";
import { FingerlyProxy } from "./proxy.js";
import { APITransport } from "./transport.js";
import { verifyWebhook } from "./webhooks.js";
import type {
  FingerlyOptions,
  ProxyOptions,
  VerifyWebhookOptions,
} from "./types.js";

/** Server SDK. Keep secret keys and webhook secrets in server-side code. */
export class Fingerly {
  /** Event reads and bounded polling under this client's secret key. */
  readonly events: EventsClient;

  constructor(options: FingerlyOptions) {
    this.events = new EventsClient(new APITransport(options));
  }

  /** Verify exact raw bytes before parsing a webhook's JSON body. */
  static verifyWebhook(options: VerifyWebhookOptions): boolean {
    return verifyWebhook(options);
  }

  /** Create a handler for customer-owned same-origin proxy infrastructure. */
  static createProxy(options: ProxyOptions): FingerlyProxy["handle"] {
    return new FingerlyProxy(options).handle;
  }
}

/** Compatibility factory; equivalent to new Fingerly(options). */
export function load(options: FingerlyOptions): Fingerly {
  return new Fingerly(options);
}
