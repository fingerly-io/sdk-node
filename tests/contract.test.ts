import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  load,
  verifyWebhook,
  type Attestation,
  type Event,
  type EventDocument,
  type EventPage,
  type SignalName,
} from "../src/index.js";
const spec = JSON.parse(
  readFileSync(new URL("../contract/openapi.json", import.meta.url), "utf8"),
);
const fixtures = JSON.parse(
  readFileSync(new URL("../contract/fixtures.json", import.meta.url), "utf8"),
);
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(spec, "fingerly");

describe("server-owned contract fixtures", () => {
  for (const fixture of fixtures.responses)
    it(`validates ${fixture.name} against the public schema`, async () => {
      const validate = ajv.compile({
        $ref: `fingerly#/components/schemas/${fixture.schema}`,
      });
      expect(validate(fixture.body), JSON.stringify(validate.errors)).toBe(
        true,
      );
      const client = load({
        secretKey: "fly_sk_development_contract",
        fetchImpl: async () =>
          Response.json(fixture.body, { status: fixture.status }),
      });
      if (fixture.status !== 200)
        await expect(client.events.get("id")).rejects.toMatchObject({
          status: fixture.status,
          code: fixture.body.error.code,
        });
      else if (fixture.schema === "SDKEventsOut") {
        const page: EventPage = await client.events.list();
        expect(page).toEqual(fixture.body);
      } else {
        const event: Event = await client.events.get("id");
        expect(event).toEqual(fixture.body);
      }
    });
  for (const fixture of fixtures.webhooks)
    it(`verifies server signing fixture ${fixture.name}`, () => {
      expect(
        verifyWebhook({
          secret: fixture.secret,
          payload: fixture.payload,
          timestamp: fixture.timestamp,
          signature: fixture.signature,
          now: new Date(Number(fixture.timestamp) * 1000),
        }),
      ).toBe(fixture.valid);
    });
  it("rejects a stale server signing fixture", () => {
    const fixture = fixtures.webhooks[0];
    expect(
      verifyWebhook({
        ...fixture,
        now: new Date((Number(fixture.timestamp) + 301) * 1000),
      }),
    ).toBe(false);
  });
  it("matches the v3 OpenAPI contract and decodes v3 signals, attestation, and empty visitor_id", async () => {
    expect(
      spec.paths["/api/v1/events/{request_id}/supplement"],
    ).toBeUndefined();
    expect(spec.components.schemas.SupplementOut).toBeUndefined();
    expect(spec.components.schemas.AttestEnvelope).toBeDefined();

    const v3Signals: SignalName[] = [
      "attestation_failed",
      "attestation_downgrade",
      "device_inconsistent",
      "report_incomplete",
      "probe_errors",
      "fetch_metadata_missing",
      "web_ticket_missing",
      "web_ticket_invalid",
      "tampering",
      "custom_root_ca",
      "secondary_user_profile",
    ];
    const attestation: Attestation = {
      state: "attested",
      platform: "android",
      status: "verified",
      attestation_security_level: "strongbox",
      revocation_checked: true,
      package_bound: true,
      signer_bound: true,
    };
    const document: EventDocument = {
      schema: 1,
      request_id: "0199a963-e400-7000-8000-000000000099",
      occurred_at: "2026-09-17T12:00:00Z",
      sdk: { platform: "android", version: "0.3.0" },
      ip_network: "203.0.113.0/24",
      risk: {
        platform: "android",
        score: 25,
        level: "high",
        threshold: 20,
        source: "default",
        triggers: v3Signals.map((signal) => ({ signal, weight: 4 })),
      },
      attestation,
    };
    const payload: Event = {
      request_id: "0199a963-e400-7000-8000-000000000099",
      project_id: "0199a963-e400-7000-8000-0000000000a1",
      visitor_id: "",
      occurred_at: "2026-09-17T12:00:00Z",
      state: "enriched",
      environment: "development",
      platform: "android",
      sdk_platform: "android",
      sdk_version: "0.3.0",
      suspect_score: 25,
      suspect_level: "high",
      triggers: v3Signals.map((signal) => ({
        signal,
        weight: 4,
        confidence: "high",
      })),
      has_document: true,
      document,
    };
    const validate = ajv.compile({
      $ref: "fingerly#/components/schemas/SDKEventOut",
    });
    expect(validate(payload), JSON.stringify(validate.errors)).toBe(true);

    const client = load({
      secretKey: "fly_sk_development_contract",
      fetchImpl: async () => Response.json(payload),
    });
    const decoded = await client.events.get(payload.request_id);
    expect(decoded.visitor_id).toBe("");
    expect(decoded.triggers.map((t) => t.signal)).toEqual(v3Signals);
    expect(decoded.document?.attestation?.status).toBe("verified");
  });

  it("decodes attest_skipped and downgrade on an unproven native attestation", async () => {
    const attestation: Attestation = {
      state: "not_attested",
      platform: "ios",
      status: "absent",
      attest_skipped: "timeout",
      downgrade: true,
    };
    const payload: Event = {
      request_id: "0199a963-e400-7000-8000-000000000098",
      project_id: "0199a963-e400-7000-8000-0000000000a1",
      visitor_id: "",
      occurred_at: "2026-09-17T12:00:00Z",
      state: "enriched",
      environment: "development",
      platform: "ios",
      sdk_platform: "ios",
      sdk_version: "0.3.0",
      suspect_score: 30,
      suspect_level: "high",
      triggers: [
        { signal: "attestation_failed", weight: 30, confidence: "high" },
      ],
      has_document: true,
      document: {
        schema: 1,
        request_id: "0199a963-e400-7000-8000-000000000098",
        occurred_at: "2026-09-17T12:00:00Z",
        sdk: { platform: "ios", version: "0.3.0" },
        risk: {
          platform: "ios",
          score: 30,
          level: "high",
          threshold: 20,
          source: "default",
          triggers: [{ signal: "attestation_downgrade", weight: 30 }],
        },
        attestation,
      },
    };

    const client = load({
      secretKey: "fly_sk_development_contract",
      fetchImpl: async () => Response.json(payload),
    });
    const decoded = await client.events.get(payload.request_id);
    expect(decoded.document?.attestation?.attest_skipped).toBe("timeout");
    expect(decoded.document?.attestation?.downgrade).toBe(true);
    expect(decoded.document?.risk?.triggers[0]?.signal).toBe(
      "attestation_downgrade",
    );
  });
});
