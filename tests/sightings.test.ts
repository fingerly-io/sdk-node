import http from "node:http";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AIVerificationResult,
  AgentSightings,
  Fingerly,
  FingerlyAPIError,
  VisitorKind,
  createAgentSightings,
  load,
  type AgentAnswer,
  type AgentSighting,
  type AgentSightingsOptions,
  type ProxyFailure,
} from "../src/index.js";
import { canonicalIp, sightingKey } from "../src/sightings.js";

const key = "fly_sk_development_test";
const vectors = JSON.parse(
  readFileSync(
    new URL("../contract/agent-sightings-vectors.json", import.meta.url),
    "utf8",
  ),
) as {
  vectors: Array<{
    name: string;
    user_agent: string;
    client_ip: string;
    canonical_ip: string;
    signature_agent: string;
    signed: boolean;
    key: string;
  }>;
};
const fixtures = JSON.parse(
  readFileSync(new URL("../contract/fixtures.json", import.meta.url), "utf8"),
);
const fixture = fixtures.responses.find(
  (entry: { name: string }) => entry.name === "agent_sightings",
);

const browser =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const gptbot =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot";

/** Waits for a condition the background work makes true. */
async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 300; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("condition not reached");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An answer for every item, all with the same ttl and rules version. */
function answer(items: AgentSighting[], ttl = 60, rules = "r1"): Response {
  return Response.json({
    rules_version: rules,
    items: items.map((item) => ({
      ttl,
      visitor_kind: VisitorKind.AiBot,
      agent: item.user_agent,
    })),
  });
}

interface Harness {
  sightings: AgentSightings;
  sent: AgentSighting[][];
  errors: ProxyFailure[];
  clock: { now: number };
}

const open: AgentSightings[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(open.splice(0).map((s) => s.close()));
});

/** A reporter whose API is `reply`, on a clock the test moves. */
function harness(
  reply: (
    items: AgentSighting[],
    init: RequestInit,
  ) => Response | Promise<Response> = (items) => answer(items),
  options: Partial<AgentSightingsOptions> = {},
): Harness {
  const sent: AgentSighting[][] = [];
  const errors: ProxyFailure[] = [];
  const clock = { now: 0 };
  const sightings = new AgentSightings({
    secretKey: key,
    clientIp: (request) => request.headers.get("x-test-ip") ?? "",
    fetchImpl: async (_url, init) => {
      const items = JSON.parse(String(init!.body)).items as AgentSighting[];
      sent.push(items);
      return reply(items, init!);
    },
    now: () => clock.now,
    onError: (failure) => errors.push(failure),
    ...options,
  });
  open.push(sightings);
  return { sightings, sent, errors, clock };
}

function request(
  userAgent: string,
  ip: string,
  headers: Record<string, string> = {},
  url = "https://shop.test/page",
): Request {
  return new Request(url, {
    headers: { "user-agent": userAgent, "x-test-ip": ip, ...headers },
  });
}

const html = () =>
  new Response("<p>hi</p>", {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("the cache key", () => {
  for (const vector of vectors.vectors)
    it(`reproduces the vector: ${vector.name}`, () => {
      expect(canonicalIp(vector.client_ip)).toBe(vector.canonical_ip);
      expect(
        sightingKey(
          vector.user_agent,
          vector.canonical_ip,
          vector.signature_agent,
          vector.signed,
        ),
      ).toBe(vector.key);
    });

  it.each(["", "a, b", "1.2.3.4, 5.6.7.8", "fe80::1%en0", "01.2.3.4", "x"])(
    "refuses %j as an address",
    (value) => {
      expect(canonicalIp(value)).toBeNull();
    },
  );

  it("treats an IPv4-mapped address as the IPv4 address", async () => {
    const { sightings } = harness();
    sightings.report(request(gptbot, "20.171.206.9"), html());
    await sightings.flush();
    expect(sightings.lookup(request(gptbot, "::ffff:20.171.206.9"))).toEqual(
      expect.objectContaining({ agent: gptbot }),
    );
    expect(sightings.lookup(request(gptbot, "::FFFF:14ab:ce09")).agent).toBe(
      gptbot,
    );
  });
});

describe("what is sent", () => {
  it("sends the raw fields and nothing else", async () => {
    const { sightings, sent } = harness();
    sightings.report(
      request(
        gptbot,
        "2001:DB8:0:0:0:0:0:1",
        {
          host: "shop.test",
          cookie: "session=secret-cookie",
          authorization: "Bearer secret-token",
          signature: "sig1=:abc:",
          "signature-input": 'sig1=("@authority");created=1',
          "signature-agent": '"https://chatgpt.com"',
        },
        "https://shop.test/private/path?token=secret-query",
      ),
      html(),
    );
    await sightings.flush();
    expect(sent).toEqual([
      [
        {
          user_agent: gptbot,
          client_ip: "2001:db8::1",
          host: "shop.test",
          method: "GET",
          signature: "sig1=:abc:",
          signature_input: 'sig1=("@authority");created=1',
          signature_agent: '"https://chatgpt.com"',
          count: 1,
        },
      ],
    ]);
    const wire = JSON.stringify(sent);
    for (const secret of ["secret-cookie", "secret-token", "secret-query"])
      expect(wire).not.toContain(secret);
    expect(wire).not.toContain("/private/path");
  });

  it("sends an absent user agent as empty", async () => {
    const { sightings, sent } = harness();
    sightings.report(
      new Request("https://shop.test/", {
        headers: { "x-test-ip": "198.51.100.1" },
      }),
      html(),
    );
    await sightings.flush();
    expect(sent[0]![0]!.user_agent).toBe("");
  });

  it("does not report a user agent over 4096 bytes, and answers it unknown", async () => {
    const { sightings, sent } = harness();
    const long = "a".repeat(4097);
    sightings.report(request(long, "198.51.100.1"), html());
    await sightings.flush();
    expect(sent).toEqual([]);
    expect(sightings.lookup(request(long, "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    sightings.report(request("a".repeat(4096), "198.51.100.1"), html());
    await sightings.flush();
    expect(sent).toHaveLength(1);
  });

  it("leaves out a signature header over 4096 bytes, which also unsigns the request", async () => {
    const { sightings, sent } = harness();
    const headers = {
      signature: "s".repeat(4097),
      "signature-input": "sig1=()",
      "signature-agent": "a".repeat(4097),
    };
    sightings.report(request(gptbot, "198.51.100.1", headers), html());
    sightings.report(request(gptbot, "198.51.100.1", headers), html());
    await sightings.flush();
    // Unsigned once the long header is gone, so the two fold into one item.
    expect(sent).toEqual([
      [
        {
          user_agent: gptbot,
          client_ip: "198.51.100.1",
          host: "shop.test",
          method: "GET",
          signature_input: "sig1=()",
          count: 2,
        },
      ],
    ]);
    expect(
      sightings.lookup(request(gptbot, "198.51.100.1", headers)).agent,
    ).toBe(gptbot);
    expect(sightings.lookup(request(gptbot, "198.51.100.1")).agent).toBe(
      gptbot,
    );
  });

  it("treats an empty or whitespace-only signature header as absent", async () => {
    const { sightings, sent } = harness();
    const headers = {
      signature: " \t ",
      "signature-input": "",
      "signature-agent": "  ",
    };
    sightings.report(request(gptbot, "198.51.100.1", headers), html());
    sightings.report(request(gptbot, "198.51.100.1"), html());
    await sightings.flush();
    // Unsigned and without Signature-Agent, so both fold into one item.
    expect(sent).toEqual([
      [
        {
          user_agent: gptbot,
          client_ip: "198.51.100.1",
          host: "shop.test",
          method: "GET",
          count: 2,
        },
      ],
    ]);
    expect(
      sightings.lookup(request(gptbot, "198.51.100.1", headers)).agent,
    ).toBe(gptbot);
  });

  it("does not report a request whose address cannot be resolved", async () => {
    const { sightings, sent, errors } = harness();
    for (const ip of ["", "1.2.3.4, 5.6.7.8", "unknown"])
      sightings.report(request(gptbot, ip), html());
    await sightings.flush();
    expect(sent).toEqual([]);
    expect(sightings.lookup(request(gptbot, ""))).toBe(AgentSightings.Unknown);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.kind).toBe("misconfigured");
  });

  it("waits for an asynchronous clientIp when reporting, but lookup answers unknown", async () => {
    const { sightings, sent } = harness(undefined, {
      clientIp: async () => "198.51.100.9",
    });
    sightings.report(request(gptbot, ""), html());
    await sleep(0);
    await sightings.flush();
    expect(sent[0]![0]!.client_ip).toBe("198.51.100.9");
    expect(sightings.lookup(request(gptbot, ""))).toBe(AgentSightings.Unknown);
  });
});

describe("the answer cache", () => {
  it("is bounded and evicts the least recently used answer", async () => {
    const { sightings } = harness(undefined, { cacheSize: 2 });
    sightings.report(request("a", "198.51.100.1"), html());
    sightings.report(request("b", "198.51.100.1"), html());
    await sightings.flush();
    // a becomes the most recent, so c evicts b.
    expect(sightings.lookup(request("a", "198.51.100.1")).agent).toBe("a");
    sightings.report(request("c", "198.51.100.1"), html());
    await sightings.flush();
    expect(sightings.lookup(request("b", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    expect(sightings.lookup(request("a", "198.51.100.1")).agent).toBe("a");
    expect(sightings.lookup(request("c", "198.51.100.1")).agent).toBe("c");
  });

  it("caps the size at 65536 and refuses a size below 1", () => {
    const capped = createAgentSightings({
      secretKey: key,
      clientIp: () => "198.51.100.1",
      cacheSize: 1_000_000,
    });
    expect(capped.toJSON().cacheSize).toBe(65_536);
    expect(
      createAgentSightings({ secretKey: key, clientIp: () => "" }).toJSON()
        .cacheSize,
    ).toBe(4096);
    for (const cacheSize of [0, -1, 1.5])
      expect(
        () =>
          new AgentSightings({ secretKey: key, clientIp: () => "", cacheSize }),
      ).toThrow(TypeError);
  });

  it("forgets an answer after its ttl and never keeps a ttl of 0", async () => {
    const { sightings, clock } = harness((items) =>
      Response.json({
        rules_version: "r1",
        items: items.map((item) => ({
          ttl: item.user_agent === "signed" ? 0 : 10,
          visitor_kind: VisitorKind.AiBot,
          agent: item.user_agent,
        })),
      }),
    );
    sightings.report(request("short", "198.51.100.1"), html());
    sightings.report(request("signed", "198.51.100.1"), html());
    await sightings.flush();
    expect(sightings.lookup(request("signed", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    clock.now = 9_999;
    expect(sightings.lookup(request("short", "198.51.100.1")).agent).toBe(
      "short",
    );
    clock.now = 10_000;
    expect(sightings.lookup(request("short", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
  });

  it("never remembers an answer that is not what AgentAnswer declares", async () => {
    const agent = fixture.body.items.find(
      (item: { ai?: unknown }) => item.ai !== undefined,
    ).ai;
    const shapes: Record<string, unknown> = {
      "null-ai-fields": {
        ttl: 60,
        visitor_kind: VisitorKind.AiBot,
        ai: { name: null, provider: null, purpose: null, runtime: null },
      },
      "null-verification": {
        ttl: 60,
        visitor_kind: VisitorKind.AiBot,
        ai: { ...agent, verification: null },
      },
      "ai-string": { ttl: 60, visitor_kind: VisitorKind.AiBot, ai: "GPTBot" },
      "declared-string": {
        ttl: 60,
        visitor_kind: VisitorKind.AiBot,
        ai: { ...agent, declared: "yes" },
      },
      "agent-number": { ttl: 60, visitor_kind: VisitorKind.AiBot, agent: 7 },
      "ttl-string": { ttl: "60", visitor_kind: VisitorKind.AiBot },
      "kind-null": { ttl: 60, visitor_kind: null },
      "item-null": null,
      "nulls-as-absent": {
        ttl: 60,
        visitor_kind: VisitorKind.Human,
        agent: null,
        ai: null,
      },
      "unknown-values": {
        ttl: 60,
        visitor_kind: "hologram",
        agent: "Zed",
        ai: {
          ...agent,
          purpose: "quantum",
          verification: { method: "telepathy", result: "maybe", extra: 1 },
          colour: "blue",
        },
        extra: { big: "x".repeat(10_000) },
      },
    };
    const { sightings } = harness((items) =>
      Response.json({
        rules_version: "r1",
        items: items.map((item) => shapes[item.user_agent]),
      }),
    );
    for (const ua of Object.keys(shapes))
      sightings.report(request(ua, "198.51.100.1"), html());
    await sightings.flush();
    const found = (ua: string) => sightings.lookup(request(ua, "198.51.100.1"));
    for (const ua of [
      "null-ai-fields",
      "null-verification",
      "ai-string",
      "declared-string",
      "agent-number",
      "ttl-string",
      "kind-null",
      "item-null",
    ])
      expect(found(ua), ua).toBe(AgentSightings.Unknown);
    expect(found("nulls-as-absent")).toEqual({
      ttl: 60,
      visitor_kind: VisitorKind.Human,
    });
    // Open values are kept; fields the type does not name are not.
    expect(found("unknown-values")).toEqual({
      ttl: 60,
      visitor_kind: "hologram",
      agent: "Zed",
      ai: {
        ...agent,
        purpose: "quantum",
        verification: { method: "telepathy", result: "maybe" },
      },
    });
  });

  it("remembers an answer for at most 86400 seconds, whatever its ttl", async () => {
    const { sightings, clock } = harness((items) => answer(items, 10_000_000));
    sightings.report(request("long", "198.51.100.1"), html());
    await sightings.flush();
    clock.now = 86_400_000 - 1;
    expect(sightings.lookup(request("long", "198.51.100.1")).agent).toBe(
      "long",
    );
    clock.now = 86_400_000;
    expect(sightings.lookup(request("long", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
  });

  it("drops every answer when rules_version changes", async () => {
    let rules = "r1";
    const { sightings } = harness((items) => answer(items, 60, rules));
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    rules = "r2";
    sightings.report(request("b", "198.51.100.1"), html());
    await sightings.flush();
    expect(sightings.lookup(request("a", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    expect(sightings.lookup(request("b", "198.51.100.1")).agent).toBe("b");
  });

  it("answers frozen copies the caller cannot change", async () => {
    const { sightings } = harness(() =>
      Response.json(fixture.body, { status: 200 }),
    );
    for (const ua of ["h", "g", "c", "s", "x"])
      sightings.report(request(ua, "198.51.100.1"), html());
    await sightings.flush();
    const found = sightings.lookup(request("g", "198.51.100.1"));
    expect(Object.isFrozen(found)).toBe(true);
    expect(Object.isFrozen(found.ai)).toBe(true);
    expect(Object.isFrozen(found.ai!.verification)).toBe(true);
  });
});

describe("buffering", () => {
  it("folds repeats of a request into one count, cache hits included", async () => {
    const { sightings, sent } = harness();
    for (let i = 0; i < 3; i++)
      sightings.report(request(gptbot, "198.51.100.1"), html());
    await sightings.flush();
    expect(sent[0]).toHaveLength(1);
    expect(sent[0]![0]!.count).toBe(3);
    // Answered from the cache now, and still counted.
    expect(sightings.lookup(request(gptbot, "198.51.100.1")).agent).toBe(
      gptbot,
    );
    sightings.report(request(gptbot, "198.51.100.1"), html());
    sightings.report(request(gptbot, "198.51.100.1"), html());
    await sightings.flush();
    expect(sent[1]).toEqual([expect.objectContaining({ count: 2 })]);
  });

  it("never folds signed requests", async () => {
    const { sightings, sent } = harness();
    const signed = {
      signature: "sig1=:abc:",
      "signature-input": "sig1=()",
      "signature-agent": '"https://chatgpt.com"',
    };
    sightings.report(request(gptbot, "198.51.100.1", signed), html());
    sightings.report(request(gptbot, "198.51.100.1", signed), html());
    await sightings.flush();
    expect(sent[0]).toHaveLength(2);
    expect(sent[0]!.map((item) => item.count)).toEqual([1, 1]);
  });

  it("flushes on its own at 200 requests, at most 200 per report", async () => {
    const { sightings, sent } = harness();
    for (let i = 0; i < 201; i++)
      sightings.report(request(`ua-${i}`, "198.51.100.1"), html());
    await until(() => sent.length === 1);
    expect(sent[0]).toHaveLength(200);
  });

  it("flushes on its own at 64 KiB, and keeps each report under it", async () => {
    const { sightings, sent } = harness();
    const ua = (i: number) => `${i}-`.padEnd(4000, "x");
    for (let i = 0; i < 17; i++)
      sightings.report(request(ua(i), "198.51.100.1"), html());
    await until(() => sent.length === 1);
    const bytes = sent[0]!.reduce(
      (sum, item) => sum + item.user_agent.length + 36,
      0,
    );
    expect(bytes).toBeLessThanOrEqual(65_536);
    expect(sent[0]!.length).toBeLessThan(17);
  });

  it("flushes on its own 2 seconds after the oldest request", async () => {
    const { sightings, sent, clock } = harness();
    sightings.report(request(gptbot, "198.51.100.1"), html());
    clock.now = 1_999;
    await sleep(400);
    expect(sent).toEqual([]);
    clock.now = 2_000;
    await until(() => sent.length === 1);
  });

  it("keeps one report in flight at a time", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { sightings, sent } = harness(async (items) => {
      await gate;
      return answer(items);
    });
    for (let i = 0; i < 400; i++)
      sightings.report(request(`ua-${i}`, "198.51.100.1"), html());
    await until(() => sent.length === 1);
    void sightings.flush();
    await sleep(300);
    expect(sent).toHaveLength(1);
    release();
    await sightings.flush();
    expect(sent.map((batch) => batch.length)).toEqual([200, 200]);
  });

  it("waits at most 6 seconds for a report already in flight, and resolves", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { sightings, sent } = harness(() => new Promise<Response>(() => {}));
    for (let i = 0; i < 200; i++)
      sightings.report(request(`ua-${i}`, "198.51.100.1"), html());
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(1);
    let done = false;
    const flushed = sightings.flush().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(6_000);
    expect(done).toBe(true);
    await flushed;
  });

  it("holds at most 1000 requests and counts the rest as dropped", async () => {
    const { sightings, sent, clock } = harness((items) =>
      sent.length === 1
        ? new Response("{}", { status: 429, headers: { "retry-after": "30" } })
        : answer(items),
    );
    sightings.report(request("ua-0", "198.51.100.1"), html());
    await sightings.flush();
    for (let i = 1; i < 1100; i++)
      sightings.report(request(`ua-${i}`, "198.51.100.1"), html());
    expect(sightings.dropped).toBe(100);
    // A key already waiting keeps counting.
    sightings.report(request("ua-0", "198.51.100.1"), html());
    expect(sightings.dropped).toBe(100);
    expect(sightings.lookup(request("ua-1050", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    clock.now = 30_000;
    await sightings.flush();
    const items = sent.slice(1).flat();
    expect(items).toHaveLength(1000);
    expect(items[0]).toEqual(
      expect.objectContaining({ user_agent: "ua-0", count: 2 }),
    );
  });
});

describe("the failure table", () => {
  it("drops a 422 batch and logs once a minute", async () => {
    const { sightings, sent, errors, clock } = harness(
      () => new Response("{}", { status: 422 }),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    sightings.report(request("b", "198.51.100.1"), html());
    await sightings.flush();
    await sightings.flush();
    expect(sent.map((batch) => batch.map((item) => item.user_agent))).toEqual([
      ["a"],
      ["b"],
    ]);
    expect(errors).toHaveLength(1);
    clock.now = 60_000;
    sightings.report(request("c", "198.51.100.1"), html());
    await sightings.flush();
    expect(errors).toHaveLength(2);
  });

  it("keeps a 429 batch and waits for Retry-After", async () => {
    let refuse = true;
    const { sightings, sent, clock } = harness((items) =>
      refuse
        ? new Response("{}", { status: 429, headers: { "retry-after": "30" } })
        : answer(items),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    sightings.report(request("b", "198.51.100.1"), html());
    clock.now = 29_999;
    await sightings.flush();
    expect(sent).toHaveLength(1);
    refuse = false;
    clock.now = 30_000;
    await sightings.flush();
    expect(sent[1]!.map((item) => item.user_agent)).toEqual(["a", "b"]);
  });

  it.each([
    "2147483647",
    "99999999999999999999",
    "Fri, 01 Jan 2100 00:00:00 GMT",
  ])(
    "waits at most 24 hours after a 429 whose Retry-After is %s",
    async (retryAfter) => {
      let refuse = true;
      const { sightings, sent, clock } = harness((items) =>
        refuse
          ? new Response("{}", {
              status: 429,
              headers: { "retry-after": retryAfter },
            })
          : answer(items),
      );
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      refuse = false;
      clock.now = 86_399_999;
      await sightings.flush();
      expect(sent).toHaveLength(1);
      clock.now = 86_400_000;
      await sightings.flush();
      expect(sent).toHaveLength(2);
      expect(sent[1]!.map((item) => item.user_agent)).toEqual(["a"]);
    },
  );

  it.each(["0", "Thu, 01 Jan 1970 00:00:00 GMT"])(
    "waits at least 1 second after a 429 whose Retry-After is %s",
    async (retryAfter) => {
      let refuse = true;
      const { sightings, sent, clock } = harness((items) =>
        refuse
          ? new Response("{}", {
              status: 429,
              headers: { "retry-after": retryAfter },
            })
          : answer(items),
      );
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      refuse = false;
      clock.now = 999;
      await sightings.flush();
      expect(sent).toHaveLength(1);
      clock.now = 1_000;
      await sightings.flush();
      expect(sent).toHaveLength(2);
    },
  );

  it.each(["-5", "soon"])(
    "reads a Retry-After of %s as missing and waits 60 seconds",
    async (retryAfter) => {
      let refuse = true;
      const { sightings, sent, clock } = harness((items) =>
        refuse
          ? new Response("{}", {
              status: 429,
              headers: { "retry-after": retryAfter },
            })
          : answer(items),
      );
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      refuse = false;
      clock.now = 59_999;
      await sightings.flush();
      expect(sent).toHaveLength(1);
      clock.now = 60_000;
      await sightings.flush();
      expect(sent).toHaveLength(2);
    },
  );

  it("waits for the next UTC day after a daily 429 without Retry-After", async () => {
    const { sightings, sent, clock } = harness(
      () =>
        new Response("{}", {
          status: 429,
          headers: { "fingerly-ratelimit-scope": "daily" },
        }),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    const msToMidnight =
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1,
      ) - Date.now();
    clock.now = Math.max(0, msToMidnight - 5_000);
    await sightings.flush();
    expect(sent).toHaveLength(1);
  });

  it.each([401, 403])(
    "drops a %i batch, pauses 60 seconds and logs once",
    async (status) => {
      const { sightings, sent, errors, clock } = harness((items) =>
        sent.length === 1 ? new Response("{}", { status }) : answer(items),
      );
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      sightings.report(request("b", "198.51.100.1"), html());
      clock.now = 59_999;
      await sightings.flush();
      expect(sent).toHaveLength(1);
      clock.now = 60_000;
      await sightings.flush();
      expect(sent[1]!.map((item) => item.user_agent)).toEqual(["b"]);
      expect(errors).toEqual([
        expect.objectContaining({ kind: "misconfigured" }),
      ]);
    },
  );

  it("drops the batch and pauses when the key is not a secret key", async () => {
    const { sightings, sent, errors } = harness(undefined, {
      secretKey: "fly_pk_development_test",
    });
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    expect(sent).toEqual([]);
    expect(errors[0]!.kind).toBe("misconfigured");
  });

  it("keeps a 503 batch and backs off from 1 second, doubling", async () => {
    let failures = 2;
    const { sightings, sent, clock } = harness((items) =>
      failures-- > 0 ? new Response("{}", { status: 503 }) : answer(items),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    clock.now = 999;
    await sightings.flush();
    expect(sent).toHaveLength(1);
    clock.now = 1_000;
    await sightings.flush();
    expect(sent).toHaveLength(2);
    clock.now = 2_999;
    await sightings.flush();
    expect(sent).toHaveLength(2);
    clock.now = 3_000;
    await sightings.flush();
    expect(sent).toHaveLength(3);
    expect(sightings.lookup(request("a", "198.51.100.1")).agent).toBe("a");
  });

  it("caps the backoff at 60 seconds", async () => {
    const { sightings, sent, clock } = harness(
      () => new Response("{}", { status: 503 }),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    for (const wait of [1, 2, 4, 8, 16, 32, 60, 60]) {
      await sightings.flush();
      clock.now += wait * 1000 - 1;
      const before = sent.length;
      await sightings.flush();
      expect(sent.length).toBe(before);
      clock.now += 1;
    }
  });

  it("keeps the batch after a transport error before any answer", async () => {
    let fail = true;
    const { sightings, sent, clock } = harness((items) => {
      if (fail) {
        fail = false;
        throw new TypeError("fetch failed");
      }
      return answer(items);
    });
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    sightings.report(request("a", "198.51.100.1"), html());
    clock.now = 1_000;
    await sightings.flush();
    expect(sent).toHaveLength(2);
    // The repeat seen meanwhile folds into the kept item.
    expect(sent[1]).toEqual([expect.objectContaining({ count: 2 })]);
  });

  it("drops the batch when the answer times out after the request was sent", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { sightings, sent, errors, clock } = harness(
      () => new Promise<Response>(() => {}),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    const done = sightings.flush();
    await vi.advanceTimersByTimeAsync(5_000);
    await done;
    expect(errors).toEqual([expect.objectContaining({ kind: "timeout" })]);
    vi.useRealTimers();
    clock.now = 120_000;
    await sightings.flush();
    expect(sent).toHaveLength(1);
  });

  it("drops the batch when the answer is cut off", async () => {
    const { sightings, sent, clock } = harness(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("reset"));
            },
          }),
          { status: 200 },
        ),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    clock.now = 120_000;
    await sightings.flush();
    expect(sent).toHaveLength(1);
  });

  it.each([400, 413, 500, 502, 504])(
    "drops the batch on any other status (%i)",
    async (status) => {
      const { sightings, sent, errors } = harness(
        () => new Response("{}", { status }),
      );
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      await sightings.flush();
      expect(sent).toHaveLength(1);
      expect(errors).toHaveLength(1);
    },
  );

  it.each([
    ["an empty body", () => new Response("")],
    ["an HTML page", () => new Response("<html>oops</html>")],
    ["JSON null", () => new Response("null")],
    ["an array", () => new Response("[]")],
    ["nulls", () => Response.json({ rules_version: null, items: null })],
  ])(
    "drops a 200 with %s and says the answer was unusable",
    async (_name, reply) => {
      const { sightings, sent, errors } = harness(reply);
      sightings.report(request("a", "198.51.100.1"), html());
      await sightings.flush();
      sightings.report(request("b", "198.51.100.1"), html());
      await sightings.flush();
      expect(sent).toHaveLength(2);
      expect(errors).toEqual([
        {
          kind: "upstream",
          message:
            "the API answered a report unusably; its requests were dropped",
        },
      ]);
      expect(sightings.lookup(request("a", "198.51.100.1"))).toBe(
        AgentSightings.Unknown,
      );
    },
  );

  it("ends a flush when the report it waited for timed out", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { sightings, sent } = harness(() => new Promise<Response>(() => {}));
    for (let i = 0; i < 400; i++)
      sightings.report(request(`ua-${i}`, "198.51.100.1"), html());
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(1);
    let done = false;
    const closed = sightings.close().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(5_001);
    // The API is not answering: the second batch is not sent into it.
    expect(done).toBe(true);
    expect(sent).toHaveLength(1);
    await closed;
  });

  it("drops a 200 whose items do not match the batch", async () => {
    const { sightings, sent, errors } = harness(() =>
      Response.json({ rules_version: "r1", items: [] }),
    );
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.flush();
    await sightings.flush();
    expect(sent).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(sightings.lookup(request("a", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
  });

  it("stops reporting after close but keeps answering", async () => {
    const { sightings, sent } = harness();
    sightings.report(request("a", "198.51.100.1"), html());
    await sightings.close();
    expect(sent).toHaveLength(1);
    sightings.report(request("b", "198.51.100.1"), html());
    await sightings.flush();
    expect(sent).toHaveLength(1);
    expect(sightings.lookup(request("a", "198.51.100.1")).agent).toBe("a");
  });
});

describe("which responses are reported", () => {
  const json = () => Response.json({});
  const text = () =>
    new Response("", { headers: { "content-type": "text/plain" } });
  const at = (path: string) =>
    request(gptbot, "198.51.100.1", {}, `https://shop.test${path}`);

  async function reported(
    cases: Array<[string, () => Response]>,
    options: Partial<AgentSightingsOptions> = {},
  ): Promise<number> {
    const { sightings, sent } = harness(undefined, {
      ...options,
      clientIp: (request) => request.headers.get("x-test-ip") ?? "",
    });
    for (const [path, response] of cases) {
      // A distinct signature header keeps every case its own item.
      const req = request(
        gptbot,
        "198.51.100.1",
        { signature: path, "signature-input": "sig1=()" },
        `https://shop.test${path}`,
      );
      sightings.report(req, response());
    }
    await sightings.flush();
    return sent.flat().length;
  }

  it("reports HTML and the agent files by default, whatever their status", async () => {
    expect(
      await reported([
        ["/page", html],
        [
          "/xhtml",
          () =>
            new Response("", {
              headers: { "content-type": "Application/XHTML+XML" },
            }),
        ],
        [
          "/missing",
          () =>
            new Response("", {
              status: 404,
              headers: { "content-type": "text/html" },
            }),
        ],
        ["/robots.txt", text],
        ["/llms.txt", () => new Response("", { status: 404 })],
        ["/llms-full.txt", text],
      ]),
    ).toBe(6);
  });

  it("does not report API routes, assets or near-miss paths by default", async () => {
    expect(
      await reported([
        ["/api/items", json],
        [
          "/app.js",
          () =>
            new Response("", {
              headers: { "content-type": "text/javascript" },
            }),
        ],
        ["/robots.txt.bak", text],
        ["/ROBOTS.TXT", text],
        ["/health", text],
      ]),
    ).toBe(0);
  });

  it("widens by path prefix and narrows by exclusion, which wins", async () => {
    expect(
      await reported(
        [
          ["/api/items", json],
          ["/admin/page", html],
          ["/robots.txt", text],
          ["/page", html],
        ],
        { includePaths: ["/api/"], excludePaths: ["/admin", "/robots.txt"] },
      ),
    ).toBe(2);
  });

  it("replaces the content types when given", async () => {
    expect(
      await reported(
        [
          ["/api/items", json],
          ["/page", html],
        ],
        {
          contentTypes: ["application/json"],
        },
      ),
    ).toBe(1);
  });

  it("never filters by user agent", async () => {
    const { sightings, sent } = harness();
    sightings.report(at("/"), html());
    for (const ua of [browser, "", "curl/8.7.1"])
      sightings.report(request(ua, "198.51.100.1"), html());
    await sightings.flush();
    expect(sent.flat().map((item) => item.user_agent)).toEqual([
      gptbot,
      browser,
      "",
      "curl/8.7.1",
    ]);
  });

  it("refuses malformed scope options", () => {
    for (const options of [
      { includePaths: ["api"] },
      { excludePaths: [""] },
      { contentTypes: [3] },
      { clientIp: undefined },
    ])
      expect(
        () =>
          new AgentSightings({
            secretKey: key,
            clientIp: () => "",
            ...(options as object),
          } as AgentSightingsOptions),
      ).toThrow(TypeError);
  });
});

describe("the Node middleware", () => {
  async function serve(
    sightings: AgentSightings,
  ): Promise<{ port: number; close: () => Promise<void> }> {
    const app = http.createServer((req, res) => {
      sightings.handleNode(req, res, () => {
        const path = (req.url ?? "/").split("?")[0];
        if (path === "/page") {
          res.setHeader("content-type", "text/html");
          res.end("<p>page</p>");
        } else if (path === "/robots.txt") {
          res.setHeader("content-type", "text/plain");
          res.end("User-agent: *");
        } else {
          res.setHeader("content-type", "application/json");
          res.end("{}");
        }
      });
    });
    await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
    return {
      port: (app.address() as AddressInfo).port,
      close: () => new Promise((resolve) => app.close(() => resolve())),
    };
  }

  function get(
    port: number,
    path: string,
    headers: Record<string, string>,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port, path, headers }, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(body));
        })
        .on("error", reject);
    });
  }

  it("reports in-scope responses after they finish and never delays them", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const sent: AgentSighting[][] = [];
    const sightings = new AgentSightings({
      secretKey: key,
      clientIp: (_request, peer) => peer.remoteAddress ?? "",
      fetchImpl: async (_url, init) => {
        const items = JSON.parse(String(init!.body)).items as AgentSighting[];
        sent.push(items);
        await gate;
        return answer(items);
      },
    });
    open.push(sightings);
    const server = await serve(sightings);
    try {
      const secret = {
        cookie: "session=secret-cookie",
        authorization: "Bearer secret-token",
      };
      // UTF-8 bytes on the wire, as a real client sends them.
      const ornek = "Mozilla/5.0 (compatible; Örnek/1.0)";
      const wire = Buffer.from(ornek, "utf8").toString("latin1");
      expect(
        await get(server.port, "/page?token=secret-query", {
          "user-agent": wire,
          ...secret,
        }),
      ).toBe("<p>page</p>");
      await get(server.port, "/robots.txt", { "user-agent": gptbot });
      await get(server.port, "/api", { "user-agent": gptbot });
      await sleep(20);
      // The report is in flight and held open; pages keep being served.
      void sightings.flush();
      await until(() => sent.length === 1);
      expect(await get(server.port, "/page", { "user-agent": browser })).toBe(
        "<p>page</p>",
      );
      expect(sent[0]!.map((item) => item.user_agent)).toEqual([ornek, gptbot]);
      expect(sent[0]![0]).toEqual({
        user_agent: ornek,
        client_ip: "127.0.0.1",
        host: `127.0.0.1:${server.port}`,
        method: "GET",
        count: 1,
      });
      expect(JSON.stringify(sent)).not.toMatch(/secret|\/page|\/robots/);
      release();
      await sightings.flush();
      expect(
        sightings.lookupNode({
          method: "GET",
          url: "/page",
          headers: { "user-agent": gptbot, host: "shop.test" },
          socket: { remoteAddress: "127.0.0.1" },
        } as never).agent,
      ).toBe(gptbot);
    } finally {
      await server.close();
    }
  });

  it("calls next once and keeps serving after close", async () => {
    const sightings = createAgentSightings({
      secretKey: key,
      clientIp: () => "198.51.100.1",
      fetchImpl: async () => answer([]),
    });
    await sightings.close();
    const next = vi.fn();
    sightings.handleNode(
      { headers: {} },
      { statusCode: 200, setHeader() {}, end() {} },
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("fingerly.agents.sightings", () => {
  it("posts the items under the secret key", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const client = load({
      secretKey: key,
      fetchImpl: async (url, init) => {
        seen = { url: String(url), init: init! };
        return Response.json(fixture.body);
      },
    });
    const items: AgentSighting[] = [
      { user_agent: gptbot, client_ip: "20.171.206.9", count: 3 },
    ];
    await client.agents.sightings(items);
    expect(seen!.url).toBe("https://api.fingerly.io/api/v1/agents/sightings");
    expect(seen!.init.method).toBe("POST");
    expect(seen!.init.redirect).toBe("manual");
    expect((seen!.init.headers as Record<string, string>)["x-api-key"]).toBe(
      key,
    );
    expect(JSON.parse(String(seen!.init.body))).toEqual({ items });
  });

  it("decodes the agent_sightings fixture with the named constants", async () => {
    const client = new Fingerly({
      secretKey: key,
      fetchImpl: async () => Response.json(fixture.body),
    });
    const answer = await client.agents.sightings([
      { user_agent: gptbot, client_ip: "20.171.206.9" },
    ]);
    expect(answer).toEqual(fixture.body);
    const [human, crawler, fetcher, signed, search] = answer.items as [
      AgentAnswer,
      AgentAnswer,
      AgentAnswer,
      AgentAnswer,
      AgentAnswer,
    ];
    expect(human.visitor_kind).toBe(VisitorKind.Human);
    expect(human.ai).toBeUndefined();
    expect(crawler.ai!.verification.result).toBe(AIVerificationResult.Pass);
    expect(fetcher.ai!.verification.result).toBe(AIVerificationResult.Fail);
    expect(signed.ttl).toBe(0);
    expect(search.visitor_kind).toBe(VisitorKind.SearchCrawler);
  });

  it("reports a 429 with Retry-After and the limit's scope", async () => {
    const client = load({
      secretKey: key,
      fetchImpl: async () =>
        Response.json(
          { error: { code: "rate_limited" } },
          {
            status: 429,
            headers: {
              "retry-after": "120",
              "fingerly-ratelimit-scope": "daily",
            },
          },
        ),
    });
    const error = await client.agents
      .sightings([{ user_agent: "", client_ip: "198.51.100.1" }])
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FingerlyAPIError);
    expect(error).toMatchObject({
      status: 429,
      code: "rate_limited",
      retryAfter: 120,
      rateLimitScope: "daily",
    });
  });

  it("answers lookup from the fixture, unknown for the signed request", async () => {
    const { sightings } = harness(() => Response.json(fixture.body));
    const uas = ["human", "gptbot", "chatgpt-user", "agent", "googlebot"];
    for (const ua of uas) sightings.report(request(ua, "198.51.100.1"), html());
    await sightings.flush();
    expect(
      sightings.lookup(request("gptbot", "198.51.100.1")).ai?.verification
        .result,
    ).toBe(AIVerificationResult.Pass);
    expect(
      sightings.lookup(request("chatgpt-user", "198.51.100.1")).ai?.verification
        .result === AIVerificationResult.Fail,
    ).toBe(true);
    expect(sightings.lookup(request("agent", "198.51.100.1"))).toBe(
      AgentSightings.Unknown,
    );
    expect(AgentSightings.Unknown.ai).toBeUndefined();
    expect(AgentSightings.Unknown.agent).toBeUndefined();
  });
});
