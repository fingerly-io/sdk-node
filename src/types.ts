import type { components } from "./generated/contract.js";

/**
 * Signal group and raw detector identifiers reported in event triggers and
 * archived risk reports, with open string compatibility for future server
 * additions.
 */
export type SignalName =
  | "tor"
  | "datacenter_proxy"
  | "proxy"
  | "datacenter_ip"
  | "residential_proxy"
  | "residential_proxy_low_confidence"
  | "residential_proxy_medium_confidence"
  | "residential_proxy_high_confidence"
  | "vpn"
  | "vpn_public"
  | "vpn_timezone"
  | "vpn_relay"
  | "vpn_mobile"
  | "vpn_os_mismatch"
  | "vpn_low_confidence"
  | "vpn_medium_confidence"
  | "vpn_high_confidence"
  | "ip_blocklist"
  | "ip_blocklist_email_spam"
  | "ip_blocklist_attack_source"
  | "ip_reputation"
  | "ip_abuser"
  | "network_anomaly"
  | "bogon_ip"
  | "anycast_ip"
  | "location_spoofing"
  | "geo_mismatch"
  | "ios_simulator"
  | "simulator"
  | "android_emulator"
  | "emulator"
  | "virtual_machine"
  | "jailbroken_device"
  | "jailbreak"
  | "rooted_device"
  | "root_apps"
  | "play_device_integrity_failed"
  | "cloned_app"
  | "app_cloner"
  | "play_app_unrecognized"
  | "device_farm"
  | "app_attest_key_churn"
  | "mitm_attack"
  | "frida_detected"
  | "frida"
  | "browser_tampering"
  | "tampering"
  | "antidetect_browser"
  | "fingerprint_suppressed"
  | "developer_tools"
  | "remote_control"
  | "bot"
  | "automation"
  | "bad_bot"
  | "high_activity"
  | "incognito_mode"
  | "incognito"
  | "privacy_settings"
  | "embedded_web_view"
  | "active_call"
  | "attestation_missing"
  | "attestation_failed"
  | "device_inconsistent"
  | "report_incomplete"
  | "custom_root_ca"
  | "secondary_user_profile"
  | (string & {});

/** Top-level hardware attestation verdict on native events. */
export type AttestationState =
  "attested" | "not_attested" | "failed" | (string & {});

/** Platform-neutral hardware attestation verification status. */
export type AttestationStatus =
  | "verified"
  | "indeterminate"
  | "invalid"
  | "absent"
  | "unconfigured"
  | (string & {});

/** Platform-neutral hardware attestation verdict inside an archived document. */
export interface Attestation {
  state: AttestationState;
  platform?: string;
  status: AttestationStatus;
  reason?: string;
  chain_length?: number;
  attestation_security_level?: string;
  keymint_security_level?: string;
  device_locked?: boolean;
  verified_boot_state?: string;
  nonce?: string;
  revocation_checked?: boolean;
  package_bound?: boolean;
  signer_bound?: boolean;
  mode?: string;
  app_id?: string;
  environment?: string;
  receipt?: string;
  risk_metric?: number;
  risk_metric_age_h?: number;
  device_check?: string;
  play_integrity?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Allow-listed view of an archived identification submission. */
export interface EventDocument {
  schema: number;
  request_id: string;
  occurred_at: string;
  sdk: {
    platform: string;
    version: string;
  };
  ip_network?: string;
  ip?: Record<string, unknown>;
  ip_error?: string;
  risk?: {
    platform: string;
    score: number;
    level: string;
    threshold: number;
    source: string;
    revision?: number;
    triggers: Array<{
      signal: SignalName;
      weight: number;
      confidence?: string;
      reason?: string;
    }>;
  };
  attestation?: Attestation;
  velocity?: Record<string, unknown>;
  [key: string]: unknown;
}

/** One signal that contributed to an event's suspect score. */
export type EventTrigger = Omit<
  components["schemas"]["EventTriggerOut"],
  "signal"
> & {
  signal: SignalName;
};

/**
 * A stored identification event.
 *
 * Mirrors the server schema with `suspect_score` as `number | null` where
 * `null` means unscored (never treat it as zero), `visitor_id` as `""` when the
 * submission was unidentifiable (`identifiable === false`), and `document` as
 * an allow-listed view of the archived submission (schema, request id, time,
 * SDK platform and version, IP network, the classified IP with city-level
 * location or IP error, risk, attestation and velocity flags) carrying no raw
 * signals, no user agent and no IP address. `ip_network` is the IPv4 /24 or
 * IPv6 /40 the request came from, such as `203.0.113.0/24`; the API never
 * returns the address.
 */
export type Event = Omit<
  components["schemas"]["SDKEventOut"],
  "suspect_score" | "document" | "triggers"
> & {
  suspect_score: number | null;
  triggers: EventTrigger[];
  document?: EventDocument | null;
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
  proxyKey: string | undefined;
  /** API route version forwarded upstream. Defaults to v1. */
  apiVersion?: string;
  /**
   * Overrides the upstream origin implied by the key: `https://host` or
   * `https://host:port`, with no path, query, fragment, credentials,
   * whitespace or control bytes. Anything else throws at construction.
   */
  upstream?: string;
  /**
   * Accepts a plain `http://` upstream on 127.0.0.1, localhost or [::1], for a
   * local development API. Off by default; plain HTTP to any other host is
   * always refused, because the proxy key would travel unencrypted.
   */
  allowInsecureLoopback?: boolean;
  /**
   * The path the dashboard issued for this proxy, such as `/k7x2qm4a`, matched
   * exactly: no prefix, trailing slash, doubled slash, dot segment or encoded
   * character, and case-sensitive. Omit it when the framework already routes only that path to the
   * handler, as a Next.js `app/k7x2qm4a/route.ts` does.
   */
  path?: string;
  /** Request body limit; larger requests get HTTP 413. Defaults to 1 MiB. */
  maxBodyBytes?: number;
  /** Deadline covering the body read, IP lookup and upstream call. Defaults to 5000. */
  timeoutMs?: number;
  /**
   * Origins permitted to make cross-origin browser requests to this proxy. Omit
   * for same-origin routes.
   */
  allowedOrigins?: readonly string[] | undefined;
  /**
   * Returns the visitor's address: exactly one IPv4 or IPv6 literal. Take it
   * only from infrastructure your app trusts. `peer.remoteAddress` is the TCP
   * peer where the server exposes it (the Node handler does; a Fetch route
   * usually cannot). Anything else, including null from a missing header, is
   * a configuration error: the request is answered 500 without calling
   * upstream, and the problem is logged once per process.
   */
  clientIp(request: Request, peer: ProxyPeer): string | Promise<string>;
  /**
   * Replacement `fetch` for the upstream call. It must honour
   * `redirect: "manual"`: the proxy never follows a redirect, answers any 3xx
   * with 502, and answers 502 for a response marked `redirected` or whose
   * final URL is not the pinned ingest URL.
   */
  fetchImpl?: typeof fetch;
  /**
   * Receives one concise line per failure, for your own logger. Without it
   * failures go to `console.error`. Upstream failures are answered 502 or 504
   * and configuration problems 500; the handler itself never throws.
   */
  onError?: ((failure: ProxyFailure) => void) | undefined;
}

/** What the server knows about the connection a request arrived on. */
export interface ProxyPeer {
  /** The TCP peer address, when the server exposes it. */
  remoteAddress?: string | undefined;
}

/** A problem the proxy answered for instead of forwarding. */
export interface ProxyFailure {
  /**
   * `timeout`: the exchange (reading the visitor's body, the upstream call and
   * its answer) did not finish within the deadline (504).
   * `upstream`: it was unreachable or answered unusably (502).
   * `misconfigured`: the key or client IP callback is unusable (500); these
   * are reported once per process.
   */
  kind: "timeout" | "upstream" | "misconfigured";
  /** One line, without stack, body or credentials. */
  message: string;
}

/**
 * The parts of a Node `IncomingMessage` the Node handler reads. Express,
 * NestJS and Fastify middleware all pass one; typed structurally so the
 * declarations do not require `@types/node`.
 */
export interface NodeRequest {
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly headers: Record<string, string | string[] | undefined>;
}

/** The parts of a Node `ServerResponse` the Node handler writes. */
export interface NodeResponse {
  statusCode: number;
  setHeader(name: string, value: number | string | readonly string[]): unknown;
  end(chunk?: unknown): unknown;
}

/** Express-style continuation, called when the request is not for the proxy. */
export type NodeNext = (error?: unknown) => void;
