import { describe, expect, it, vi } from "vitest";
import {
  load,
  createProxy,
  FingerlyAPIError,
  FingerlyTimeoutError,
  verifyWebhook,
} from "../src/index.js";
const key = "fly_sk_development_test";
const missing = () =>
  Response.json(
    {
      error: { code: "event_not_found", message: "Not found", status: 404 },
      request_id: "trace",
    },
    { status: 404 },
  );
const event = { request_id: "stored", suspect_score: null };

describe("bounded event reads", () => {
  it("defaults to the Fingerly API and does not follow redirects", async () => {
    let target = "";
    let redirect: RequestRedirect | undefined;
    const client = load({
      secretKey: "fly_sk_development_test",
      fetchImpl: async (url, init) => {
        target = String(url);
        redirect = init?.redirect;
        return Response.json(event);
      },
    });
    await client.events.get("id/a");
    expect(target).toBe("https://api.fingerly.io/api/v1/events/id%2Fa");
    expect(redirect).toBe("manual");
  });
  it("preserves structured error metadata and the old constructor", async () => {
    const client = load({ secretKey: key, fetchImpl: async () => missing() });
    await expect(client.events.get("missing")).rejects.toMatchObject({
      status: 404,
      code: "event_not_found",
      requestId: "trace",
    });
    expect(new FingerlyAPIError("old", 400).status).toBe(400);
  });
  it("handles non-JSON errors and does not expose bodies or credentials", async () => {
    const client = load({
      secretKey: key,
      fetchImpl: async () => new Response(key, { status: 502 }),
    });
    await expect(client.events.get("missing")).rejects.toMatchObject({
      status: 502,
      message: "Fingerly API returned HTTP 502",
    });
  });
  it("times out a fetch even when an injected implementation ignores cancellation", async () => {
    const client = load({
      secretKey: key,
      timeoutMs: 20,
      fetchImpl: () => new Promise(() => {}),
    });
    await expect(client.events.get("missing")).rejects.toBeInstanceOf(
      FingerlyTimeoutError,
    );
  });
  it("keeps the deadline active while receiving the body", async () => {
    const client = load({
      secretKey: key,
      timeoutMs: 20,
      fetchImpl: async () => new Response(new ReadableStream({ start() {} })),
    });
    await expect(client.events.get("missing")).rejects.toBeInstanceOf(
      FingerlyTimeoutError,
    );
  });
  it("preserves external cancellation and sends no request after pre-abort", async () => {
    const controller = new AbortController();
    const reason = new Error("customer cancelled");
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
    const client = load({ secretKey: key, fetchImpl });
    const read = client.events.get("id", controller.signal);
    controller.abort(reason);
    await expect(read).rejects.toBe(reason);
    fetchImpl.mockClear();
    await expect(client.events.get("id", controller.signal)).rejects.toBe(
      reason,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("does not silently retry get or list", async () => {
    const fetchImpl = vi.fn(async () => missing());
    const client = load({ secretKey: key, fetchImpl });
    await expect(client.events.get("id")).rejects.toBeInstanceOf(
      FingerlyAPIError,
    );
    await expect(client.events.list()).rejects.toBeInstanceOf(FingerlyAPIError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid deadlines and endpoints", () => {
    for (const timeoutMs of [0, -1, NaN, Infinity, 1.5, 2 ** 31])
      expect(() => load({ secretKey: key, timeoutMs })).toThrow(TypeError);
    for (const endpoint of [
      "file:///private",
      "https://user:pass@host",
      "https://host?key=value",
    ])
      expect(() => load({ secretKey: key, endpoint })).toThrow();
  });
});

describe("reading one event", () => {
  it("makes exactly one request and never retries, whatever comes back", async () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const fetchImpl = vi.fn(async () =>
        Response.json({ error: { code: "other" } }, { status }),
      );
      await expect(
        load({ secretKey: key, fetchImpl }).events.get("id"),
      ).rejects.toMatchObject({ status });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });
  it("surfaces a missing event rather than waiting for one", async () => {
    // An event is readable as soon as identification answers, so this is a
    // request id that was never issued - there is nothing to wait for.
    const fetchImpl = vi.fn(async () => missing());
    await expect(
      load({ secretKey: key, fetchImpl }).events.get("id"),
    ).rejects.toMatchObject({ status: 404, code: "event_not_found" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("propagates a transport failure unchanged", async () => {
    const error = new Error("offline");
    const fetchImpl = vi.fn(async () => {
      throw error;
    });
    await expect(
      load({ secretKey: key, fetchImpl }).events.get("id"),
    ).rejects.toBe(error);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("cancels immediately and cleans up its cancellation listeners", async () => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const fetchImpl = vi.fn(
      () => new Promise<Response>(() => {}),
    ) as unknown as typeof fetch;
    const read = load({ secretKey: key, fetchImpl }).events.get(
      "id",
      controller.signal,
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort(new Error("stop"));
    await expect(read).rejects.toThrow("stop");
    expect(add.mock.calls.length).toBe(remove.mock.calls.length);
  });
});

describe("proxy boundary", () => {
  it("loads without a key and answers 500 until one is configured", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => Response.json({}));
    for (const proxyKey of [undefined, "", key, "fly_px_nope"]) {
      // Module scope in a route file: must not throw during a build.
      const proxy = createProxy({
        proxyKey,
        clientIp: () => "127.0.0.1",
        fetchImpl,
      });
      for (let i = 0; i < 2; i++) {
        const r = await proxy(
          new Request("https://shop.test/k7x2qm4a", {
            method: "POST",
            headers: { "x-api-key": "fly_pk_development_test" },
            body: "{}",
          }),
        );
        expect(r.status).toBe(500);
        expect(r.headers.get("content-type")).toMatch(/^text\/plain/);
        expect(await r.text()).not.toMatch(/fingerly/i);
      }
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    // Once per process, not once per request.
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });
  it("refuses mismatched public credentials", async () => {
    const fetchImpl = vi.fn(async () => Response.json({}));
    const proxy = createProxy({
      proxyKey: "fly_px_development_test",
      clientIp: () => "127.0.0.1",
      fetchImpl,
    });
    for (const publicKey of [
      // Another environment, the proxy's own key, and rubbish.
      "fly_pk_production_test",
      key,
      "invalid",
    ]) {
      const r = await proxy(
        new Request("https://shop.test/k7x2qm4a", {
          method: "POST",
          headers: { "x-api-key": publicKey },
          body: "{}",
        }),
      );
      expect(r.status).toBe(401);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("answers upstream trouble as a gateway instead of throwing", async () => {
    const failures: string[] = [];
    const request = (init: RequestInit = {}) =>
      new Request("https://shop.test/k7x2qm4a", {
        method: "POST",
        body: "{}",
        ...init,
      });
    const proxyWith = (fetchImpl: typeof fetch) =>
      createProxy({
        secretKey: key,
        timeoutMs: 20,
        clientIp: () => "127.0.0.1",
        fetchImpl,
        onError: (failure) => failures.push(failure.kind),
      });
    // A body that never finishes still meets the deadline.
    const stalled = await proxyWith(
      async () => new Response(new ReadableStream({ start() {} })),
    )(request());
    expect(stalled.status).toBe(504);
    expect(await stalled.text()).toBe("Gateway timeout");
    const refused = await proxyWith(async () => {
      throw Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("connect"), { code: "ECONNREFUSED" }),
      });
    })(request());
    expect(refused.status).toBe(502);
    expect(await refused.text()).toBe("Bad gateway");
    for (const response of [stalled, refused]) {
      expect(response.headers.get("content-type")).toMatch(/^text\/plain/);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(failures).toEqual(["timeout", "upstream"]);

    // The visitor leaving cancels the upstream call and is not a failure.
    const visitor = new AbortController();
    let upstreamSignal: AbortSignal | undefined;
    const pending = proxyWith(
      (_url, init) =>
        new Promise<Response>(() => {
          upstreamSignal = init?.signal ?? undefined;
        }),
    )(request({ signal: visitor.signal }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    visitor.abort();
    expect((await pending).status).toBe(499);
    expect(upstreamSignal?.aborted).toBe(true);
    expect(failures).toEqual(["timeout", "upstream"]);
  });

  it("caps upstream bodies at 4 MiB and never relays a truncated one", async () => {
    const MiB = 1_048_576;
    const proxyFor = (body: () => BodyInit) =>
      createProxy({
        secretKey: key,
        clientIp: () => "127.0.0.1",
        fetchImpl: async () => new Response(body()),
        onError: () => {},
      });
    const request = () =>
      new Request("https://shop.test/k7x2qm4a", { method: "POST", body: "{}" });
    const exact = await proxyFor(() => new Uint8Array(4 * MiB))(request());
    expect(exact.status).toBe(200);
    expect((await exact.arrayBuffer()).byteLength).toBe(4 * MiB);
    const over = await proxyFor(() => new Uint8Array(4 * MiB + 1))(request());
    expect(over.status).toBe(502);
    // An upstream that dies mid-body must not reach the browser as a 200.
    const truncated = await proxyFor(
      () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"request_id":'));
            controller.error(new Error("socket reset"));
          },
        }),
    )(request());
    expect(truncated.status).toBe(502);
  });

  it("logs one line per failure to the console without a hook", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const proxy = createProxy({
      secretKey: key,
      clientIp: () => "127.0.0.1",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const r = await proxy(
      new Request("https://shop.test/k7x2qm4a", { method: "POST", body: "{}" }),
    );
    expect(r.status).toBe(502);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(errors.mock.calls[0]).toHaveLength(1);
    expect(String(errors.mock.calls[0]?.[0])).not.toContain("\n");
    expect(String(errors.mock.calls[0]?.[0])).not.toContain(key);
    errors.mockRestore();
  });
});

describe("webhook malformed input", () => {
  it("rejects missing/noncanonical timestamps, tampering and invalid tolerance", () => {
    for (const timestamp of [
      null,
      undefined,
      "",
      " ",
      "1.5",
      "-1",
      "0x10",
      "Infinity",
    ])
      expect(
        verifyWebhook({
          secret: "secret",
          payload: "{}",
          timestamp,
          signature: "sha256=" + "0".repeat(64),
        }),
      ).toBe(false);
    expect(
      verifyWebhook({
        secret: "secret",
        payload: "{}",
        timestamp: "1",
        signature: "sha256=" + "0".repeat(64),
        toleranceSeconds: NaN,
      }),
    ).toBe(false);
  });
});
