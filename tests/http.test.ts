import { describe, expect, it, vi } from "vitest";
import {
  load,
  createProxy,
  FingerlyAPIError,
  FingerlyConnectionError,
  FingerlyTimeoutError,
  verifyWebhook,
} from "../src/index.js";
import { parseRetryAfter } from "../src/transport.js";
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
    // event_not_found is a request id that was never issued or is past
    // retention: there is nothing to wait for.
    const fetchImpl = vi.fn(async () => missing());
    await expect(
      load({ secretKey: key, fetchImpl }).events.get("id"),
    ).rejects.toMatchObject({
      status: 404,
      code: "event_not_found",
      isPending: false,
      retryAfter: null,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("tells a pending event apart from a missing one and does not wait", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        {
          error: { code: "event_pending", message: "Pending", status: 404 },
          request_id: "trace",
        },
        { status: 404, headers: { "retry-after": "2" } },
      ),
    );
    const error = (await load({ secretKey: key, fetchImpl })
      .events.get("id")
      .catch((e: unknown) => e)) as FingerlyAPIError;
    expect(error).toBeInstanceOf(FingerlyAPIError);
    expect(error).toMatchObject({
      status: 404,
      code: "event_pending",
      isPending: true,
      retryAfter: 2,
      requestId: "trace",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("wraps a transport failure in a connection error", async () => {
    const error = new Error("offline");
    const fetchImpl = vi.fn(async () => {
      throw error;
    });
    const read = load({ secretKey: key, fetchImpl }).events.get("id");
    await expect(read).rejects.toBeInstanceOf(FingerlyConnectionError);
    await expect(read).rejects.toMatchObject({
      message: "Could not reach the Fingerly API",
      cause: error,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("wraps a body cut off mid-stream in a connection error", async () => {
    const fetchImpl = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"request_id":'));
            controller.error(new Error("socket reset"));
          },
        }),
      );
    await expect(
      load({ secretKey: key, fetchImpl }).events.get("id"),
    ).rejects.toBeInstanceOf(FingerlyConnectionError);
  });
  it("reports redirects, rate limits and unusable bodies as API errors", async () => {
    const respond = (response: Response) =>
      load({ secretKey: key, fetchImpl: async () => response }).events.get(
        "id",
      );
    await expect(
      respond(
        new Response(null, {
          status: 302,
          headers: { location: "https://elsewhere.test/" },
        }),
      ),
    ).rejects.toMatchObject({ status: 302, retryAfter: null });
    await expect(
      respond(
        Response.json(
          { error: { code: "rate_limited" }, request_id: "trace" },
          { status: 429, headers: { "retry-after": "7" } },
        ),
      ),
    ).rejects.toMatchObject({
      status: 429,
      code: "rate_limited",
      requestId: "trace",
      retryAfter: 7,
    });
    const later = new Date(Date.now() + 30_000).toUTCString();
    const dated = (await respond(
      new Response("", {
        status: 503,
        headers: { "retry-after": later, "x-request-id": "from-header" },
      }),
    ).catch((e: unknown) => e)) as FingerlyAPIError;
    expect(dated.requestId).toBe("from-header");
    expect(dated.retryAfter).toBeGreaterThanOrEqual(29);
    expect(dated.retryAfter).toBeLessThanOrEqual(30);
    // Neither a non-JSON success nor an oversized one is quoted or parsed.
    const garbled = await respond(
      new Response(`not json ${key}`, { status: 200 }),
    ).catch((e: Error) => e);
    expect(garbled).toBeInstanceOf(FingerlyAPIError);
    expect(garbled).toMatchObject({ status: 200, code: "invalid_response" });
    expect(String(garbled) + JSON.stringify(garbled)).not.toMatch(
      /not json|fly_sk/,
    );
    await expect(
      respond(new Response(new Uint8Array(4 * 1_048_576 + 1))),
    ).rejects.toMatchObject({ status: 200, code: "response_too_large" });
  });
  it("parses both forms of Retry-After", () => {
    const now = Date.parse("2026-11-04T12:00:00Z");
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter("0", now)).toBe(0);
    expect(parseRetryAfter(" 120 ", now)).toBe(120);
    expect(parseRetryAfter("Wed, 04 Nov 2026 12:00:10 GMT", now)).toBe(10);
    expect(parseRetryAfter("Wed, 04 Nov 2026 11:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("-5", now)).toBeNull();
    expect(parseRetryAfter("soon", now)).toBeNull();
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

  it("accepts exactly one IP address from clientIp", async () => {
    const failures: string[] = [];
    const seen: (string | null)[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("x-fingerly-client-ip"));
      return Response.json({});
    });
    const send = (clientIp: () => unknown) =>
      createProxy({
        secretKey: key,
        clientIp: clientIp as () => string,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        onError: (failure) => failures.push(failure.message),
      })(
        new Request("https://shop.test/k7x2qm4a", {
          method: "POST",
          body: "{}",
        }),
      );
    for (const value of [
      null,
      undefined,
      "",
      "null",
      "203.0.113.1, 198.51.100.2",
      " 203.0.113.1",
      "fe80::1%en0",
      "unknown",
      42,
    ]) {
      const r = await send(() => value);
      expect(r.status).toBe(500);
      expect(await r.text()).toBe(
        "Proxy misconfigured: the client IP callback returned no valid address",
      );
    }
    const thrown = await send(() => {
      throw new Error("header missing");
    });
    expect(thrown.status).toBe(500);
    expect(fetchImpl).not.toHaveBeenCalled();
    // Once per process, however many requests repeat the mistake.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/client IP callback returned null/);

    for (const value of ["203.0.113.1", "2001:db8::1", "::ffff:203.0.113.9"])
      expect((await send(() => value)).status).toBe(200);
    expect(seen).toEqual(["203.0.113.1", "2001:db8::1", "203.0.113.9"]);
  });

  it("answers only the exact configured path", async () => {
    const fetchImpl = vi.fn(async () => Response.json({}));
    const proxy = createProxy({
      secretKey: key,
      path: "/k7x2qm4a/",
      clientIp: () => "127.0.0.1",
      fetchImpl,
    });
    const status = async (path: string) =>
      (
        await proxy(
          new Request(`https://shop.test${path}`, {
            method: "POST",
            body: "{}",
          }),
        )
      ).status;
    expect(await status("/k7x2qm4a")).toBe(200);
    expect(await status("/k7x2qm4a?v=1")).toBe(200);
    for (const path of [
      "/k7x2qm4a/",
      "/k7x2qm4a//",
      "//k7x2qm4a",
      "/k7x2qm4a/x",
      "/k7x2qm4ax",
      "/K7X2QM4A",
      "/k7x2qm4%61",
      "/k7x2qm4a%2F",
      "/x/k7x2qm4a",
    ])
      expect(await status(path), path).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const path of ["k7x2qm4a", "/", "/a/../b", "/a%2fb", "/a b", "/a?b"])
      expect(() =>
        createProxy({ secretKey: key, path, clientIp: () => "127.0.0.1" }),
      ).toThrow(TypeError);
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
