import type { components } from "./generated/contract.js";

import type {
  AIPurpose,
  AIRuntime,
  AIVerificationMethod,
  AIVerificationResult,
  AnonymityNetwork,
  AttestSkippedReason,
  AttestationState,
  AttestationStatus,
  Confidence,
  DeviceKind,
  Environment,
  EventState,
  Platform,
  ProxyFailureKind,
  Signal,
  SuspectLevel,
  VerifyReason,
  VisitorKind,
} from "./enums.js";

/**
 * Signal group and raw detector identifiers reported in event triggers and
 * archived risk reports: one of {@link Signal}, or a value a newer server
 * added.
 */
export type SignalName = Signal | (string & {});

/** Platform-neutral hardware attestation verdict inside an archived document. */
export interface Attestation {
  state: AttestationState | (string & {});
  platform?: Platform | (string & {});
  status: AttestationStatus | (string & {});
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
  /**
   * The app's own reason for sending no attestation, such as `not_offered`,
   * `unsupported` or `timeout`. Diagnostic only; it never lowers the score.
   */
  attest_skipped?: AttestSkippedReason | (string & {});
  /**
   * True when an unproven or rejected report named an install an attested
   * device owns, so it was answered unidentifiable.
   */
  downgrade?: boolean;
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
    platform: Platform | (string & {});
    score: number;
    level: SuspectLevel | (string & {});
    threshold: number;
    source: string;
    revision?: number;
    triggers: Array<{
      signal: SignalName;
      weight: number;
      confidence?: Confidence | (string & {});
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
  "signal" | "confidence"
> & {
  signal: SignalName;
  confidence?: Confidence | (string & {});
};

/** How an AI agent's claimed identity was checked, and what that found. */
export interface AIVerification {
  method: AIVerificationMethod | (string & {});
  result: AIVerificationResult | (string & {});
}

/**
 * The AI agent behind an `ai_bot` event: who operates it, what its traffic is
 * for and how far its claim was checked. The identity comes from the user
 * agent, which any client can copy, and is not verified yet.
 */
export interface AIAgent {
  /** The agent as its operator names it, such as `ChatGPT-User`. */
  name: string;
  /** The company that operates it, such as `OpenAI`. An open string. */
  provider: string;
  purpose: AIPurpose | (string & {});
  runtime: AIRuntime | (string & {});
  /** True when the agent named itself, in its user agent or a signature. */
  declared: boolean;
  verification: AIVerification;
}

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
 * returns the address. `ai` is present only when `visitor_kind` is `ai_bot`.
 */
export type Event = Omit<
  components["schemas"]["SDKEventOut"],
  | "suspect_score"
  | "suspect_level"
  | "document"
  | "triggers"
  | "state"
  | "platform"
  | "environment"
  | "anonymity_network"
  | "device_kind"
  | "visitor_kind"
  | "ai"
> & {
  suspect_score: number | null;
  suspect_level?: SuspectLevel | (string & {});
  state: EventState | (string & {});
  platform: Platform | (string & {});
  environment: Environment | (string & {});
  anonymity_network?: AnonymityNetwork | (string & {});
  device_kind?: DeviceKind | (string & {});
  visitor_kind?: VisitorKind | (string & {});
  ai?: AIAgent;
  triggers: EventTrigger[];
  document?: EventDocument | null;
};

/**
 * One request your server served, as raw input for
 * `fingerly.agents.sightings`. Never the path, query, cookies or body.
 */
export interface AgentSighting {
  /** The `User-Agent` header as received, or `""`; at most 4096 bytes. */
  user_agent: string;
  /** One IPv4 or IPv6 literal from a source your app trusts. */
  client_ip: string;
  /** The `Host` the request was sent to. */
  host?: string;
  /** The request method as received; GET when absent. */
  method?: string;
  /** The Web Bot Auth `Signature` header; at most 4096 bytes. */
  signature?: string;
  /** The Web Bot Auth `Signature-Input` header; at most 4096 bytes. */
  signature_input?: string;
  /** The Web Bot Auth `Signature-Agent` header; at most 4096 bytes. */
  signature_agent?: string;
  /** Times this exact request was served since it was last reported; 1 when absent. */
  count?: number;
}

/**
 * What the API says sent one reported request. `ai` is present only when
 * `visitor_kind` is `ai_bot`.
 */
export interface AgentAnswer {
  /**
   * Seconds this answer may be reused for the same user agent, address and
   * `Signature-Agent`; 0 for a signed request, which is checked every time.
   */
  ttl: number;
  visitor_kind: VisitorKind | (string & {});
  /** The agent's name, such as `GPTBot`; absent for a person's browser. */
  agent?: string;
  ai?: AIAgent;
}

/** The answer to `fingerly.agents.sightings`, one item per reported request. */
export interface AgentSightingsResponse {
  /** Names the server's rules; remembered answers are dropped when it changes. */
  rules_version: string;
  items: AgentAnswer[];
}

/** Options for the agent sightings reporter. */
export interface AgentSightingsOptions {
  /**
   * Server-only key: `fly_sk_{environment}_…`. Checked on the first report,
   * so it may be unset while a build loads the module.
   */
  secretKey: string | undefined;
  /**
   * Returns the visitor's address: exactly one IPv4 or IPv6 literal, from
   * infrastructure your app trusts, as for the proxy. `lookup` needs it to
   * answer synchronously; a promise makes `lookup` answer unknown. A request
   * whose address cannot be resolved is not reported.
   */
  clientIp(request: Request, peer: ProxyPeer): string | Promise<string>;
  /** API route version. Defaults to v1. */
  apiVersion?: string;
  /** Overrides the Fingerly API origin, as for the client. */
  endpoint?: string;
  /** Accepts a plain `http://` loopback endpoint, for a local API. */
  allowInsecureLoopback?: boolean;
  /** Replacement `fetch`, for tests or a host with its own HTTP stack. */
  fetchImpl?: typeof fetch;
  /**
   * Answers remembered, at most. Defaults to 4096 (about 1.5 MB); values
   * above 65536 are treated as 65536.
   */
  cacheSize?: number;
  /**
   * Response media types reported. Defaults to `text/html` and
   * `application/xhtml+xml`; a list replaces them.
   */
  contentTypes?: readonly string[];
  /** Path prefixes reported whatever the response's content type. */
  includePaths?: readonly string[];
  /**
   * Path prefixes never reported, including `/robots.txt`, `/llms.txt` and
   * `/llms-full.txt`, which are otherwise always reported.
   */
  excludePaths?: readonly string[];
  /**
   * Receives one concise line per problem, for your own logger, at most once
   * a minute each. Without it problems go to `console.error`. Lines never
   * carry a reported field.
   */
  onError?: ((failure: ProxyFailure) => void) | undefined;
  /** Monotonic clock in milliseconds; override only in tests. */
  now?: () => number;
}

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
  level?: SuspectLevel;
  /** Restrict to one visitor kind, such as `VisitorKind.AiBot`. */
  kind?: VisitorKind;
  /**
   * Restrict to one AI agent operator, exactly as events name it (case
   * sensitive), such as `OpenAI`.
   */
  aiProvider?: string;
  /** Restrict to one AI agent purpose, such as `AIPurpose.UserFetch`. */
  aiPurpose?: AIPurpose;
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
  /**
   * Overrides the Fingerly API origin: `https://host` or `https://host:port`,
   * with no path, query, fragment, credentials, whitespace or control bytes.
   * Anything else throws at construction.
   */
  endpoint?: string;
  /**
   * Accepts a plain `http://` endpoint on 127.0.0.1, localhost or [::1], for a
   * local development API. Off by default; plain HTTP to any other host is
   * always refused, because the secret key would travel unencrypted.
   */
  allowInsecureLoopback?: boolean;
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
  kind: ProxyFailureKind;
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

/**
 * The device's two DeviceCheck bits, from `fingerly.deviceCheck.query`. The
 * bits mean what you decide; Fingerly never reads them.
 */
export type DeviceCheckBits = components["schemas"]["DeviceCheckQueryOut"];

/** The bits to set with `fingerly.deviceCheck.write`; a bit left out keeps its value. */
export interface DeviceCheckWrite {
  bit0?: boolean;
  bit1?: boolean;
}

/** What Apple accepted: the bits the write named, and only those. */
export interface DeviceCheckWriteResult {
  bit0?: boolean;
  bit1?: boolean;
}

/** The first consumption of an event, from `fingerly.events.consume`. */
export interface EventConsumption {
  request_id: string;
  /** When the event was consumed, RFC 3339. */
  consumed_at: string;
  /** Always true: a later call throws `FingerlyEventAlreadyConsumedError`. */
  first: boolean;
}

/** Options for `fingerly.events.verify`. */
export interface VerifyOptions {
  /** Oldest acceptable event age in whole seconds; 300 by default. */
  maxAgeSeconds?: number;
  /** The tag the event must carry exactly; not checked when omitted. */
  tag?: string;
  /** Consume the event once every other check passes; true by default. */
  consume?: boolean;
  /** Caller cancellation, for both the read and the consumption. */
  signal?: AbortSignal;
}

/** The outcome of `fingerly.events.verify`. */
export interface VerifyResult {
  /** True only when every check passed (and the event was consumed, if asked). */
  ok: boolean;
  /** The first check that failed, or `""` when `ok`. */
  reason: VerifyReason;
  /** The event read; null only for `not_found`. */
  event: Event | null;
}
