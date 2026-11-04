import type { components } from "./generated/contract.js";

/** One signal that contributed to an event's suspect score. */
export type EventTrigger = components["schemas"]["EventTriggerOut"];

/**
 * A stored identification event.
 *
 * Mirrors the server schema with two deliberate differences: `suspect_score`
 * is `number | null` where `null` means unscored (never treat it as zero), and
 * the archived `document` and `deferred_signals` stay opaque rather than
 * becoming a second public contract.
 */
export type Event = Omit<
  components["schemas"]["SDKEventOut"],
  "suspect_score" | "document" | "deferred_signals"
> & {
  suspect_score: number | null;
  document?: unknown;
  deferred_signals?: Record<string, unknown>;
};

/** One page of events, newest first. */
export type EventPage = Omit<components["schemas"]["SDKEventsOut"], "rows"> & {
  rows: Event[];
};

/** Filters for `events.list`. Omitted filters are not sent. */
export interface EventListOptions {
  /** Start of the window; a `Date` is sent as RFC 3339. */
  from?: Date | string;
  /** End of the window; a `Date` is sent as RFC 3339. */
  to?: Date | string;
  /** 1-based page number. */
  page?: number;
  /** Rows per page; the server clamps it to its own maximum. */
  limit?: number;
  /** Restrict to one visitor id. */
  visitor?: string;
  /** Restrict to one suspect level. */
  level?: "low" | "medium" | "high";
  /** Caller cancellation. */
  signal?: AbortSignal;
}

/** Options for the `Fingerly` client. */
export interface FingerlyOptions {
  /**
   * Server-only key: `fly_sk_{environment}_…`. Never ship it. Checked on the
   * first request, so `process.env.FINGERLY_SECRET_KEY` may be unset while a
   * build loads the module.
   */
  secretKey: string | undefined;
  /** API route version. Defaults to v1; the server must support it. */
  apiVersion?: string;
  /** Overrides the Fingerly API origin, e.g. a local API. */
  endpoint?: string;
  /** Replacement `fetch`, for tests or a host with its own HTTP stack. */
  fetchImpl?: typeof fetch;
  /** Deadline per request, including reading the body. Defaults to 5000. */
  timeoutMs?: number;
}

/** Inputs for `verifyWebhook`. */
export interface VerifyWebhookOptions {
  /** The endpoint's signing secret. */
  secret: string;
  /** The exact bytes received, before any JSON parsing. */
  payload: string | Uint8Array;
  /** The `x-fingerly-signature` header, which may hold several signatures. */
  signature: string | null | undefined;
  /** The `x-fingerly-timestamp` header, in whole seconds. */
  timestamp: string | null | undefined;
  /** Replay window in seconds. Defaults to 300. */
  toleranceSeconds?: number;
  /** Current time; override only in tests. */
  now?: Date;
}

/** Options for the same-origin proxy. */
export interface ProxyOptions {
  /**
   * Write-only credential created for customer-owned proxy infrastructure.
   * Checked on the first request, so it may be unset while a build loads the
   * route module.
   */
  proxyKey?: string | undefined;
  /** @deprecated Use proxyKey. Secret read keys will be refused in the next major version. */
  secretKey?: string | undefined;
  /** API route version forwarded upstream. Defaults to v1. */
  apiVersion?: string;
  /** Overrides the upstream origin implied by the key. */
  upstream?: string;
  /**
   * The path the dashboard issued for this proxy, such as `/k7x2qm4a`, matched
   * exactly. Omit it when the framework already routes only that path to the
   * handler, as a Next.js `app/k7x2qm4a/route.ts` does.
   */
  path?: string;
  /** Request body limit; larger requests get HTTP 413. Defaults to 1 MiB. */
  maxBodyBytes?: number;
  /** Deadline covering the body read, IP lookup and upstream call. Defaults to 5000. */
  timeoutMs?: number;
  /** Resolve the visitor address only from infrastructure your app trusts. */
  clientIp(request: Request): string | Promise<string>;
  /** Replacement `fetch` for the upstream call. */
  fetchImpl?: typeof fetch;
  /**
   * Receives one concise line per failure, for your own logger. Without it
   * failures go to `console.error`. Upstream failures are answered 502 or 504
   * and configuration problems 500; the handler itself never throws.
   */
  onError?: ((failure: ProxyFailure) => void) | undefined;
}

/** A problem the proxy answered for instead of forwarding. */
export interface ProxyFailure {
  /**
   * `timeout`: the upstream did not answer within the deadline (504).
   * `upstream`: it was unreachable or answered unusably (502).
   * `misconfigured`: the key or client IP callback is unusable (500); these
   * are reported once per process.
   */
  kind: "timeout" | "upstream" | "misconfigured";
  /** One line, without stack, body or credentials. */
  message: string;
}
