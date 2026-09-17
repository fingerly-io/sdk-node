import type { components } from "./generated/contract.js";
export type EventTrigger = components["schemas"]["EventTriggerOut"];
// Keep the stable SDK type names and nullable score semantics. Archive contents
// deliberately remain opaque rather than becoming a second public contract.
export type Event = Omit<
  components["schemas"]["SDKEventOut"],
  "suspect_score" | "document" | "deferred_signals"
> & {
  suspect_score: number | null;
  document?: unknown;
  deferred_signals?: Record<string, unknown>;
};

export interface EventListOptions {
  from?: Date | string;
  to?: Date | string;
  page?: number;
  limit?: number;
  visitor?: string;
  level?: "low" | "medium" | "high";
  signal?: AbortSignal;
}
export type EventPage = Omit<components["schemas"]["SDKEventsOut"], "rows"> & {
  rows: Event[];
};
export interface FingerlyOptions {
  secretKey: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}
export interface WaitForOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export interface VerifyWebhookOptions {
  secret: string;
  payload: string | Uint8Array;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  toleranceSeconds?: number;
  now?: Date;
}

export interface ProxyOptions {
  /** Write-only credential created for customer-owned proxy infrastructure. */
  proxyKey?: string;
  /** @deprecated Use proxyKey. Secret read keys will be refused in the next major version. */
  secretKey?: string;
  upstream?: string;
  prefix?: string;
  maxBodyBytes?: number;
  timeoutMs?: number;
  /** Resolve the visitor address only from infrastructure your app trusts. */
  clientIp(request: Request): string | Promise<string>;
  fetchImpl?: typeof fetch;
}
