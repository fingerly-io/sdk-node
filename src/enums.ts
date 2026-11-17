/**
 * Runtime constants for the closed string values the API sends.
 *
 * Each one is an `as const` object with a same-named type, so
 * `event.suspect_level === SuspectLevel.High` and
 * `event.suspect_level === "high"` both type-check. Member names are the
 * value in PascalCase, word by word: `fingerprint_suppressed` is
 * `Signal.FingerprintSuppressed`, `vpn_os_mismatch` is `Signal.VpnOsMismatch`.
 *
 * The fields that carry these values are typed with the open form
 * (`SuspectLevel | (string & {})`), so a value a newer server adds still
 * type-checks and reaches your code instead of failing to compile.
 */

/**
 * Every signal group and raw detector identifier the API reports.
 *
 * Event `triggers` carry group names, such as `vpn`; archived risk reports
 * (`document.risk.triggers`) carry raw detector names, such as `vpn_public`.
 * Both are listed here.
 */
export const Signal = {
  Tor: "tor",
  DatacenterProxy: "datacenter_proxy",
  Proxy: "proxy",
  DatacenterIp: "datacenter_ip",
  ResidentialProxy: "residential_proxy",
  ResidentialProxyLowConfidence: "residential_proxy_low_confidence",
  ResidentialProxyMediumConfidence: "residential_proxy_medium_confidence",
  ResidentialProxyHighConfidence: "residential_proxy_high_confidence",
  Vpn: "vpn",
  VpnPublic: "vpn_public",
  VpnTimezone: "vpn_timezone",
  VpnRelay: "vpn_relay",
  VpnMobile: "vpn_mobile",
  VpnOsMismatch: "vpn_os_mismatch",
  VpnLowConfidence: "vpn_low_confidence",
  VpnMediumConfidence: "vpn_medium_confidence",
  VpnHighConfidence: "vpn_high_confidence",
  IpBlocklist: "ip_blocklist",
  IpBlocklistEmailSpam: "ip_blocklist_email_spam",
  IpBlocklistAttackSource: "ip_blocklist_attack_source",
  IpReputation: "ip_reputation",
  IpAbuser: "ip_abuser",
  NetworkAnomaly: "network_anomaly",
  BogonIp: "bogon_ip",
  AnycastIp: "anycast_ip",
  LocationSpoofing: "location_spoofing",
  GeoMismatch: "geo_mismatch",
  IosSimulator: "ios_simulator",
  Simulator: "simulator",
  AndroidEmulator: "android_emulator",
  Emulator: "emulator",
  VirtualMachine: "virtual_machine",
  JailbrokenDevice: "jailbroken_device",
  Jailbreak: "jailbreak",
  RootedDevice: "rooted_device",
  RootApps: "root_apps",
  PlayDeviceIntegrityFailed: "play_device_integrity_failed",
  ClonedApp: "cloned_app",
  AppCloner: "app_cloner",
  PlayAppUnrecognized: "play_app_unrecognized",
  DeviceFarm: "device_farm",
  RepeatedReinstall: "repeated_reinstall",
  DeviceActivityHigh: "device_activity_high",
  DeviceActivityVeryHigh: "device_activity_very_high",
  MitmAttack: "mitm_attack",
  FridaDetected: "frida_detected",
  Frida: "frida",
  BrowserTampering: "browser_tampering",
  Tampering: "tampering",
  AntidetectBrowser: "antidetect_browser",
  FingerprintSuppressed: "fingerprint_suppressed",
  DeveloperTools: "developer_tools",
  RemoteControl: "remote_control",
  Bot: "bot",
  Automation: "automation",
  BadBot: "bad_bot",
  FetchMetadataMissing: "fetch_metadata_missing",
  WebTicketMissing: "web_ticket_missing",
  WebTicketInvalid: "web_ticket_invalid",
  HighActivity: "high_activity",
  IncognitoMode: "incognito_mode",
  Incognito: "incognito",
  PrivacySettings: "privacy_settings",
  EmbeddedWebView: "embedded_web_view",
  ActiveCall: "active_call",
  AttestationMissing: "attestation_missing",
  AttestationFailed: "attestation_failed",
  AttestationDowngrade: "attestation_downgrade",
  DeviceInconsistent: "device_inconsistent",
  ReportIncomplete: "report_incomplete",
  ProbeErrors: "probe_errors",
  CustomRootCa: "custom_root_ca",
  SecondaryUserProfile: "secondary_user_profile",
} as const;
/** One of the signals in {@link Signal}. */
export type Signal = (typeof Signal)[keyof typeof Signal];

/** The band an event's suspect score falls into under your threshold. */
export const SuspectLevel = {
  Low: "low",
  Medium: "medium",
  High: "high",
} as const;
/** One of the levels in {@link SuspectLevel}. */
export type SuspectLevel = (typeof SuspectLevel)[keyof typeof SuspectLevel];

/** How strong the evidence for one trigger was. */
export const Confidence = {
  Low: "low",
  Medium: "medium",
  High: "high",
} as const;
/** One of the grades in {@link Confidence}. */
export type Confidence = (typeof Confidence)[keyof typeof Confidence];

/** Top-level hardware attestation verdict on a native event. */
export const AttestationState = {
  Attested: "attested",
  NotAttested: "not_attested",
  Failed: "failed",
} as const;
/** One of the verdicts in {@link AttestationState}. */
export type AttestationState =
  (typeof AttestationState)[keyof typeof AttestationState];

/**
 * The app's own reason for sending no attestation, in `attest_skipped`.
 * Diagnostic only; it never lowers the score.
 */
export const AttestSkippedReason = {
  NotOffered: "not_offered",
  Unsupported: "unsupported",
  ChallengeUnavailable: "challenge_unavailable",
  KeyError: "key_error",
  Timeout: "timeout",
  Backoff: "backoff",
  InstallUnavailable: "install_unavailable",
} as const;
/** One of the reasons in {@link AttestSkippedReason}. */
export type AttestSkippedReason =
  (typeof AttestSkippedReason)[keyof typeof AttestSkippedReason];

/** The detail behind an {@link AttestationState}. */
export const AttestationStatus = {
  Verified: "verified",
  Indeterminate: "indeterminate",
  Invalid: "invalid",
  Absent: "absent",
  Unconfigured: "unconfigured",
} as const;
/** One of the statuses in {@link AttestationStatus}. */
export type AttestationStatus =
  (typeof AttestationStatus)[keyof typeof AttestationStatus];

/**
 * Why `fingerly.events.verify` refused an event.
 *
 * - `Ok` (`""`): every check passed and `ok` is true.
 * - `NotFound`: no event for the request id (`404 event_not_found`).
 * - `TooOld`: `occurred_at` is more than `maxAgeSeconds` ago, or unreadable.
 * - `TagMismatch`: the event's `tag` is not the `tag` asked for.
 * - `Unidentifiable`: the event's `visitor_id` is empty.
 * - `Unscored`: the event's `suspect_score` is null.
 * - `AlreadyConsumed`: an earlier call consumed the event.
 */
export const VerifyReason = {
  Ok: "",
  NotFound: "not_found",
  TooOld: "too_old",
  TagMismatch: "tag_mismatch",
  Unidentifiable: "unidentifiable",
  Unscored: "unscored",
  AlreadyConsumed: "already_consumed",
} as const;
/** One of the reasons in {@link VerifyReason}. */
export type VerifyReason = (typeof VerifyReason)[keyof typeof VerifyReason];

/**
 * The `type` of a webhook delivery. `WebhookTest` is sent only when you ask
 * the dashboard for a test delivery; no endpoint subscribes to it.
 */
export const WebhookEventType = {
  IdentificationCompleted: "identification.completed",
  IdentificationRefused: "identification.refused",
  VisitorSuspect: "visitor.suspect",
  BillingStatusChanged: "billing.status_changed",
  UsageDailySettled: "usage.daily_settled",
  WebhookTest: "webhook.test",
} as const;
/** One of the types in {@link WebhookEventType}. */
export type WebhookEventType =
  (typeof WebhookEventType)[keyof typeof WebhookEventType];

/**
 * An event's `state`: `Enriched` when it was fully processed, `Unavailable`
 * when the network lookup could not run, so it was not scored. `Pending` is
 * accepted and not yet recorded; a read answers it with the `event_pending`
 * error rather than an event.
 */
export const EventState = {
  Pending: "pending",
  Enriched: "enriched",
  Unavailable: "unavailable",
} as const;
/** One of the states in {@link EventState}. */
export type EventState = (typeof EventState)[keyof typeof EventState];

/**
 * The platform an event was scored under. A React Native, Flutter or Lynx app
 * is scored under the operating system it runs on; `sdk_platform` keeps what
 * the SDK called itself.
 */
export const Platform = {
  Web: "web",
  Android: "android",
  Ios: "ios",
} as const;
/** One of the platforms in {@link Platform}. */
export type Platform = (typeof Platform)[keyof typeof Platform];

/** The environment of the key an event arrived with. */
export const Environment = {
  Production: "production",
  Staging: "staging",
  Development: "development",
} as const;
/** One of the environments in {@link Environment}. */
export type Environment = (typeof Environment)[keyof typeof Environment];

/**
 * An event's `anonymity_network`: what the connection came through. Absent
 * for an ordinary connection.
 */
export const AnonymityNetwork = {
  Tor: "tor",
  Relay: "relay",
  Vpn: "vpn",
  Proxy: "proxy",
  Hosting: "hosting",
} as const;
/** One of the networks in {@link AnonymityNetwork}. */
export type AnonymityNetwork =
  (typeof AnonymityNetwork)[keyof typeof AnonymityNetwork];

/** An event's `device_kind`. `Server` is a client with no device at all. */
export const DeviceKind = {
  Desktop: "desktop",
  Mobile: "mobile",
  Tablet: "tablet",
  Server: "server",
} as const;
/** One of the kinds in {@link DeviceKind}. */
export type DeviceKind = (typeof DeviceKind)[keyof typeof DeviceKind];

/** An event's `visitor_kind`: what sort of client made the request. */
export const VisitorKind = {
  Human: "human",
  AiBot: "ai_bot",
  Automation: "automation",
  SearchCrawler: "search_crawler",
} as const;
/** One of the kinds in {@link VisitorKind}. */
export type VisitorKind = (typeof VisitorKind)[keyof typeof VisitorKind];

/**
 * The `code` of a `FingerlyAPIError` from `fingerly.deviceCheck`.
 *
 * - `device_check_not_held` (404): no token is held for the event.
 * - `device_check_spent` (409): the token was used, or a retry was not the
 *   first request.
 * - `device_check_busy` (409): another call is using the token.
 * - `credential_unavailable` (409): the project's Apple key is missing,
 *   refused, or has DeviceCheck off; the token is kept.
 * - `bits_required` (422): a write named neither bit.
 * - `apple_rejected` (422): Apple rejected the token; see `appleStatus`.
 * - `device_check_unavailable` (503): retried automatically, then thrown.
 */
export const DeviceCheckErrorCode = {
  DeviceCheckNotHeld: "device_check_not_held",
  DeviceCheckSpent: "device_check_spent",
  DeviceCheckBusy: "device_check_busy",
  CredentialUnavailable: "credential_unavailable",
  BitsRequired: "bits_required",
  AppleRejected: "apple_rejected",
  DeviceCheckUnavailable: "device_check_unavailable",
} as const;
/** One of the codes in {@link DeviceCheckErrorCode}. */
export type DeviceCheckErrorCode =
  (typeof DeviceCheckErrorCode)[keyof typeof DeviceCheckErrorCode];

/** The `kind` of a `ProxyFailure` passed to the proxy's `onError`. */
export const ProxyFailureKind = {
  Timeout: "timeout",
  Upstream: "upstream",
  Misconfigured: "misconfigured",
} as const;
/** One of the kinds in {@link ProxyFailureKind}. */
export type ProxyFailureKind =
  (typeof ProxyFailureKind)[keyof typeof ProxyFailureKind];
