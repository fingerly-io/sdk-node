import { describe, expect, expectTypeOf, it } from "vitest";
import {
  AnonymityNetwork,
  AttestSkippedReason,
  AttestationState,
  AttestationStatus,
  Confidence,
  DeviceCheckErrorCode,
  DeviceKind,
  Environment,
  EventState,
  Platform,
  ProxyFailureKind,
  Signal,
  SuspectLevel,
  VerifyReason,
  VisitorKind,
  WebhookEventType,
  type Attestation,
  type Event,
  type EventDocument,
  type EventListOptions,
  type EventTrigger,
  type ProxyFailure,
  type SignalName,
  type VerifyResult,
} from "../src/index.js";

// Snapshots of the server's own lists, which the constants must match exactly.
// Signal groups: server domain/risk/groups.go. Raw signals: domain/risk/signals.go.
const SERVER_GROUPS = [
  "active_call",
  "android_emulator",
  "attestation_failed",
  "attestation_missing",
  "bot",
  "browser_tampering",
  "cloned_app",
  "custom_root_ca",
  "datacenter_proxy",
  "developer_tools",
  "device_farm",
  "device_inconsistent",
  "embedded_web_view",
  "fingerprint_suppressed",
  "frida_detected",
  "high_activity",
  "incognito_mode",
  "ios_simulator",
  "ip_blocklist",
  "ip_reputation",
  "jailbroken_device",
  "location_spoofing",
  "mitm_attack",
  "network_anomaly",
  "privacy_settings",
  "remote_control",
  "report_incomplete",
  "residential_proxy",
  "rooted_device",
  "secondary_user_profile",
  "tor",
  "virtual_machine",
  "vpn",
];
const SERVER_SIGNALS = [
  "active_call",
  "antidetect_browser",
  "anycast_ip",
  "app_cloner",
  "attestation_downgrade",
  "attestation_failed",
  "attestation_missing",
  "automation",
  "bad_bot",
  "bogon_ip",
  "custom_root_ca",
  "datacenter_ip",
  "developer_tools",
  "device_activity_high",
  "device_activity_very_high",
  "device_farm",
  "device_inconsistent",
  "embedded_web_view",
  "emulator",
  "fetch_metadata_missing",
  "fingerprint_suppressed",
  "frida",
  "geo_mismatch",
  "high_activity",
  "incognito",
  "ip_abuser",
  "ip_blocklist_attack_source",
  "ip_blocklist_email_spam",
  "jailbreak",
  "mitm_attack",
  "play_app_unrecognized",
  "play_device_integrity_failed",
  "privacy_settings",
  "probe_errors",
  "proxy",
  "remote_control",
  "repeated_reinstall",
  "report_incomplete",
  "residential_proxy",
  "residential_proxy_high_confidence",
  "residential_proxy_low_confidence",
  "residential_proxy_medium_confidence",
  "root_apps",
  "secondary_user_profile",
  "simulator",
  "tampering",
  "tor",
  "virtual_machine",
  "vpn_high_confidence",
  "vpn_low_confidence",
  "vpn_medium_confidence",
  "vpn_mobile",
  "vpn_os_mismatch",
  "vpn_public",
  "vpn_relay",
  "vpn_timezone",
  "web_ticket_invalid",
  "web_ticket_missing",
];

/** The member name a value gets: PascalCase, word by word. */
const memberName = (value: string) =>
  value
    .split(/[._-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

const constants: Record<string, Record<string, string>> = {
  AnonymityNetwork,
  AttestSkippedReason,
  AttestationState,
  AttestationStatus,
  Confidence,
  DeviceCheckErrorCode,
  DeviceKind,
  Environment,
  EventState,
  Platform,
  ProxyFailureKind,
  Signal,
  SuspectLevel,
  VerifyReason,
  VisitorKind,
  WebhookEventType,
};

describe("enum constants", () => {
  for (const [name, constant] of Object.entries(constants))
    it(`${name} names every value after itself, once`, () => {
      const values = Object.values(constant);
      expect(new Set(values).size).toBe(values.length);
      for (const [key, value] of Object.entries(constant))
        expect(key).toBe(value === "" ? "Ok" : memberName(value));
    });

  it("Signal lists every server signal group and raw signal", () => {
    expect(sorted(Object.values(Signal))).toEqual(
      sorted([...SERVER_GROUPS, ...SERVER_SIGNALS]),
    );
  });

  it("matches the server's other closed sets", () => {
    expect(Object.values(SuspectLevel)).toEqual(["low", "medium", "high"]);
    expect(Object.values(Confidence)).toEqual(["low", "medium", "high"]);
    expect(Object.values(AttestationState)).toEqual([
      "attested",
      "not_attested",
      "failed",
    ]);
    expect(Object.values(AttestationStatus)).toEqual([
      "verified",
      "indeterminate",
      "invalid",
      "absent",
      "unconfigured",
    ]);
    expect(Object.values(WebhookEventType)).toEqual([
      "identification.completed",
      "identification.refused",
      "visitor.suspect",
      "billing.status_changed",
      "usage.daily_settled",
      "webhook.test",
    ]);
    expect(Object.values(EventState)).toEqual([
      "pending",
      "enriched",
      "unavailable",
    ]);
    expect(Object.values(AttestSkippedReason)).toEqual([
      "not_offered",
      "unsupported",
      "challenge_unavailable",
      "key_error",
      "timeout",
      "backoff",
      "install_unavailable",
    ]);
    expect(Object.values(Platform)).toEqual(["web", "android", "ios"]);
    expect(Object.values(Environment)).toEqual([
      "production",
      "staging",
      "development",
    ]);
    expect(Object.values(AnonymityNetwork)).toEqual([
      "tor",
      "relay",
      "vpn",
      "proxy",
      "hosting",
    ]);
    expect(Object.values(DeviceKind)).toEqual([
      "desktop",
      "mobile",
      "tablet",
      "server",
    ]);
    expect(Object.values(VisitorKind)).toEqual([
      "human",
      "ai_bot",
      "automation",
      "search_crawler",
    ]);
  });

  it("matches the SDK's own closed sets", () => {
    expect(Object.values(VerifyReason)).toEqual([
      "",
      "not_found",
      "too_old",
      "tag_mismatch",
      "unidentifiable",
      "unscored",
      "already_consumed",
    ]);
    expect(Object.values(DeviceCheckErrorCode)).toEqual([
      "device_check_not_held",
      "device_check_spent",
      "device_check_busy",
      "credential_unavailable",
      "bits_required",
      "apple_rejected",
      "device_check_unavailable",
    ]);
    expect(Object.values(ProxyFailureKind)).toEqual([
      "timeout",
      "upstream",
      "misconfigured",
    ]);
  });
});

describe("enum types", () => {
  it("derives each type from its constant's values", () => {
    expectTypeOf<SuspectLevel>().toEqualTypeOf<"low" | "medium" | "high">();
    expectTypeOf<AttestationState>().toEqualTypeOf<
      "attested" | "not_attested" | "failed"
    >();
    expectTypeOf<VerifyReason>().toEqualTypeOf<
      | ""
      | "not_found"
      | "too_old"
      | "tag_mismatch"
      | "unidentifiable"
      | "unscored"
      | "already_consumed"
    >();
    expectTypeOf<SignalName>().toEqualTypeOf<Signal | (string & {})>();
    expectTypeOf(
      Signal.FingerprintSuppressed,
    ).toEqualTypeOf<"fingerprint_suppressed">();
  });

  it("types SDK-produced values closed", () => {
    expectTypeOf<VerifyResult["reason"]>().toEqualTypeOf<VerifyReason>();
    expectTypeOf<ProxyFailure["kind"]>().toEqualTypeOf<ProxyFailureKind>();
    expectTypeOf<EventListOptions["level"]>().toEqualTypeOf<
      SuspectLevel | undefined
    >();
  });

  it("types server values open, accepting constants, literals and new values", () => {
    expectTypeOf<Event["suspect_level"]>().toEqualTypeOf<
      SuspectLevel | (string & {}) | undefined
    >();
    expectTypeOf<Event["state"]>().toEqualTypeOf<EventState | (string & {})>();
    expectTypeOf<EventTrigger["signal"]>().toEqualTypeOf<SignalName>();
    expectTypeOf<EventTrigger["confidence"]>().toEqualTypeOf<
      Confidence | (string & {}) | undefined
    >();
    expectTypeOf<Attestation["state"]>().toEqualTypeOf<
      AttestationState | (string & {})
    >();
    expectTypeOf<NonNullable<EventDocument["risk"]>["level"]>().toEqualTypeOf<
      SuspectLevel | (string & {})
    >();

    const event = {} as Event;
    // Both spellings compile, and so does a value a newer server adds.
    const literal = event.suspect_level === "high";
    const constant = event.suspect_level === SuspectLevel.High;
    const future = event.visitor_kind === "not_yet_a_kind";
    const signals: SignalName[] = [
      Signal.FingerprintSuppressed,
      "fingerprint_suppressed",
      "not_yet_a_signal",
    ];
    expect([literal, constant, future, signals.length]).toEqual([
      false,
      false,
      false,
      3,
    ]);
    expect(signals.includes(Signal.FingerprintSuppressed)).toBe(true);
  });
});
