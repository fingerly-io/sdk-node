import { describe, expect, it, vi } from "vitest";
import {
  Fingerly,
  FingerlyAPIError,
  FingerlyEventAlreadyConsumedError,
} from "../src/index.js";
import type { Event, VerifyReason } from "../src/index.js";

const secretKey = "fly_sk_development_test";
const id = "01a1e665-198c-760c-abf9-3666cb1c8e85";
const base = "https://api.fingerly.io/api/v1/events/" + id;
const consumedAt = "2026-11-17T10:00:00Z";

const failure = (status: number, code: string, details?: unknown) =>
  Response.json(
    { error: { code, message: "no", status, details }, request_id: "trace" },
    { status },
  );

/** The literal R9 body of a second consumption. */
const consumedFlat = () =>
  Response.json(
    { code: "event_already_consumed", consumed_at: consumedAt },
    { status: 409 },
  );

/** The same answer in the standard error envelope. */
const consumedEnvelope = () =>
  failure(409, "event_already_consumed", [
    { field: "consumed_at", issue: consumedAt, location: "body" },
  ]);

const consumed = () =>
  Response.json({ request_id: id, consumed_at: consumedAt, first: true });

function event(overrides: Partial<Event> = {}, ageSeconds = 10): Event {
  return {
    request_id: id,
    occurred_at: new Date(Date.now() - ageSeconds * 1000).toISOString(),
    environment: "development",
    has_document: false,
    platform: "web",
    sdk_platform: "web",
    sdk_version: "0.3.0",
    state: "scored",
    visitor_id: "v_123",
    suspect_score: 12,
    suspect_level: "low",
    tag: "signup:s1",
    triggers: [],
    ...overrides,
  } as Event;
}

/** A client whose mock fetch routes on method and path. */
function api(options: { get?: () => Response; consume?: () => Response }) {
  const calls: Array<{ method: string; url: string; key: string }> = [];
  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({
      method,
      url,
      key: (init?.headers as Record<string, string>)["x-api-key"]!,
    });
    if (method === "GET" && url === base)
      return (options.get ?? (() => Response.json(event())))();
    if (method === "POST" && url === base + "/consume")
      return (options.consume ?? consumed)();
    return failure(500, "unexpected_route");
  });
  const consumes = () => calls.filter((call) => call.method === "POST").length;
  return { fingerly: new Fingerly({ secretKey, fetchImpl }), calls, consumes };
}

describe("events.consume", () => {
  it("posts once to the consume route with the secret key and no body", async () => {
    const { fingerly, calls } = api({});
    expect(await fingerly.events.consume(id)).toEqual({
      request_id: id,
      consumed_at: consumedAt,
      first: true,
    });
    expect(calls).toEqual([
      { method: "POST", url: base + "/consume", key: secretKey },
    ]);
  });

  it("escapes the request id in the path", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => consumed());
    await new Fingerly({ secretKey, fetchImpl }).events.consume("a/b?c");
    expect(String(fetchImpl.mock.calls[0]![0])).toBe(
      "https://api.fingerly.io/api/v1/events/a%2Fb%3Fc/consume",
    );
  });

  for (const [shape, answer] of [
    ["flat", consumedFlat],
    ["envelope", consumedEnvelope],
  ] as const)
    it(`throws a typed error with consumedAt on a ${shape} 409`, async () => {
      const { fingerly, calls } = api({ consume: answer });
      const error = await fingerly.events.consume(id).catch((e) => e);
      expect(error).toBeInstanceOf(FingerlyEventAlreadyConsumedError);
      expect(error).toBeInstanceOf(FingerlyAPIError);
      expect(error).toMatchObject({
        name: "FingerlyEventAlreadyConsumedError",
        status: 409,
        code: "event_already_consumed",
        consumedAt,
      });
      expect(calls).toHaveLength(1);
    });

  it("leaves consumedAt null when the 409 does not say", async () => {
    const { fingerly } = api({
      consume: () => failure(409, "event_already_consumed"),
    });
    const error = await fingerly.events.consume(id).catch((e) => e);
    expect(error).toBeInstanceOf(FingerlyEventAlreadyConsumedError);
    expect(error.consumedAt).toBeNull();
  });

  it("throws the plain API error for an unknown event", async () => {
    const { fingerly } = api({
      consume: () => failure(404, "event_not_found"),
    });
    const error = await fingerly.events.consume(id).catch((e) => e);
    expect(error).toBeInstanceOf(FingerlyAPIError);
    expect(error).not.toBeInstanceOf(FingerlyEventAlreadyConsumedError);
    expect(error).toMatchObject({ status: 404, code: "event_not_found" });
  });

  it("does not retry a failed consumption", async () => {
    const { fingerly, calls } = api({
      consume: () => failure(503, "unavailable"),
    });
    await expect(fingerly.events.consume(id)).rejects.toMatchObject({
      status: 503,
    });
    expect(calls).toHaveLength(1);
  });

  for (const bad of ["", ".", ".."])
    it(`refuses request id ${JSON.stringify(bad)} without a request`, async () => {
      const { fingerly, calls } = api({});
      await expect(fingerly.events.consume(bad)).rejects.toThrow(TypeError);
      expect(calls).toHaveLength(0);
    });
});

describe("events.verify", () => {
  it("passes a fresh, tagged, identified, scored event and consumes it last", async () => {
    const { fingerly, calls } = api({});
    const result = await fingerly.events.verify(id, { tag: "signup:s1" });
    expect(result).toEqual({
      ok: true,
      reason: "",
      event: expect.objectContaining({ request_id: id, visitor_id: "v_123" }),
    });
    expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
    expect(calls[1]).toEqual({
      method: "POST",
      url: base + "/consume",
      key: secretKey,
    });
  });

  it("never posts with consume: false", async () => {
    const { fingerly, consumes } = api({});
    const result = await fingerly.events.verify(id, { consume: false });
    expect(result.ok).toBe(true);
    expect(consumes()).toBe(0);
  });

  it("leaves the score policy to the caller", async () => {
    const { fingerly } = api({
      get: () =>
        Response.json(event({ suspect_score: 99, suspect_level: "high" })),
    });
    const result = await fingerly.events.verify(id);
    expect(result).toMatchObject({ ok: true, reason: "" });
    expect(result.event?.suspect_level).toBe("high");
  });

  const refusals: Array<
    [string, VerifyReason, () => Response, { tag?: string }]
  > = [
    [
      "an unknown event",
      "not_found",
      () => failure(404, "event_not_found"),
      {},
    ],
    ["an old event", "too_old", () => Response.json(event({}, 400)), {}],
    [
      "an unreadable occurred_at",
      "too_old",
      () => Response.json(event({ occurred_at: "yesterday" })),
      {},
    ],
    [
      "a missing occurred_at",
      "too_old",
      () => Response.json(event({ occurred_at: undefined as never })),
      {},
    ],
    [
      "another tag",
      "tag_mismatch",
      () => Response.json(event()),
      { tag: "signup:other" },
    ],
    [
      "an untagged event",
      "tag_mismatch",
      () => Response.json(event({ tag: undefined as never })),
      { tag: "signup:s1" },
    ],
    [
      "an empty visitor_id",
      "unidentifiable",
      () => Response.json(event({ visitor_id: "" })),
      {},
    ],
    [
      "a null suspect_score",
      "unscored",
      () => Response.json(event({ suspect_score: null })),
      {},
    ],
    [
      "a missing suspect_score",
      "unscored",
      () => Response.json(event({ suspect_score: undefined as never })),
      {},
    ],
  ];
  for (const [name, reason, get, options] of refusals)
    it(`refuses ${name} with ${reason} and never consumes`, async () => {
      const { fingerly, consumes } = api({ get });
      const result = await fingerly.events.verify(id, options);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe(reason);
      if (reason === "not_found") expect(result.event).toBeNull();
      else expect(result.event?.request_id).toBe(id);
      expect(consumes()).toBe(0);
    });

  for (const [shape, answer] of [
    ["flat", consumedFlat],
    ["envelope", consumedEnvelope],
  ] as const)
    it(`answers already_consumed on a ${shape} 409`, async () => {
      const { fingerly, consumes } = api({ consume: answer });
      const result = await fingerly.events.verify(id);
      expect(result).toEqual({
        ok: false,
        reason: "already_consumed",
        event: expect.objectContaining({ request_id: id }),
      });
      expect(consumes()).toBe(1);
    });

  it("answers not_found when the event disappears before consumption", async () => {
    const { fingerly } = api({
      consume: () => failure(404, "event_not_found"),
    });
    expect(await fingerly.events.verify(id)).toEqual({
      ok: false,
      reason: "not_found",
      event: null,
    });
  });

  it("checks in order: age before tag, identity and score", async () => {
    const { fingerly } = api({
      get: () =>
        Response.json(
          event({ tag: "other", visitor_id: "", suspect_score: null }, 400),
        ),
    });
    expect((await fingerly.events.verify(id, { tag: "x" })).reason).toBe(
      "too_old",
    );
  });

  it("checks in order: tag before identity and score", async () => {
    const { fingerly } = api({
      get: () =>
        Response.json(
          event({ tag: "other", visitor_id: "", suspect_score: null }),
        ),
    });
    expect((await fingerly.events.verify(id, { tag: "x" })).reason).toBe(
      "tag_mismatch",
    );
  });

  it("checks in order: identity before score", async () => {
    const { fingerly } = api({
      get: () => Response.json(event({ visitor_id: "", suspect_score: null })),
    });
    expect((await fingerly.events.verify(id)).reason).toBe("unidentifiable");
  });

  it("ignores the tag when none is asked for", async () => {
    const { fingerly } = api({
      get: () => Response.json(event({ tag: undefined as never })),
    });
    expect((await fingerly.events.verify(id)).ok).toBe(true);
  });

  it("accepts up to 300 seconds by default", async () => {
    const fresh = api({ get: () => Response.json(event({}, 200)) });
    expect((await fresh.fingerly.events.verify(id)).ok).toBe(true);
    const stale = api({ get: () => Response.json(event({}, 400)) });
    expect((await stale.fingerly.events.verify(id)).reason).toBe("too_old");
  });

  it("honours maxAgeSeconds", async () => {
    const { fingerly, consumes } = api({
      get: () => Response.json(event({}, 200)),
    });
    expect(
      (await fingerly.events.verify(id, { maxAgeSeconds: 100 })).reason,
    ).toBe("too_old");
    expect(consumes()).toBe(0);
  });

  it("accepts an event stamped slightly in the future", async () => {
    const { fingerly } = api({ get: () => Response.json(event({}, -5)) });
    expect((await fingerly.events.verify(id)).ok).toBe(true);
  });

  it("raises event_pending instead of mapping it to a reason", async () => {
    const { fingerly, consumes } = api({
      get: () => failure(404, "event_pending"),
    });
    const error = await fingerly.events.verify(id).catch((e) => e);
    expect(error).toBeInstanceOf(FingerlyAPIError);
    expect(error.isPending).toBe(true);
    expect(consumes()).toBe(0);
  });

  it("raises other read and consume failures", async () => {
    const read = api({ get: () => failure(401, "unauthorized") });
    await expect(read.fingerly.events.verify(id)).rejects.toMatchObject({
      status: 401,
    });
    const spend = api({ consume: () => failure(500, "internal") });
    await expect(spend.fingerly.events.verify(id)).rejects.toMatchObject({
      status: 500,
    });
  });

  for (const [name, options] of [
    ["zero maxAgeSeconds", { maxAgeSeconds: 0 }],
    ["negative maxAgeSeconds", { maxAgeSeconds: -1 }],
    ["fractional maxAgeSeconds", { maxAgeSeconds: 1.5 }],
    ["an empty tag", { tag: "" }],
    ["a non-boolean consume", { consume: "no" as never }],
  ] as const)
    it(`rejects ${name} before any request`, async () => {
      const { fingerly, calls } = api({});
      await expect(fingerly.events.verify(id, options)).rejects.toThrow(
        TypeError,
      );
      expect(calls).toHaveLength(0);
    });

  it("refuses a bad request id before any request", async () => {
    const { fingerly, calls } = api({});
    await expect(fingerly.events.verify("..")).rejects.toThrow(TypeError);
    expect(calls).toHaveLength(0);
  });
});
