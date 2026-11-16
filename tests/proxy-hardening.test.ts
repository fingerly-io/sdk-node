/**
 * Regression tests for the proxy rules shared by every server SDK. Every
 * server here listens on 127.0.0.1.
 */
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FingerlyProxy, createNodeProxy, createProxy } from "../src/index.js";

const proxyKey = "fly_px_development_test";
const publicKey = "fly_pk_development_test";
const base = { proxyKey, clientIp: () => "203.0.113.7" };

function post(headers: Record<string, string>, method = "POST"): Request {
  return new Request("https://shop.test/k7x2qm4a", {
    method,
    headers: { "x-api-key": publicKey, ...headers },
    body: method === "GET" || method === "HEAD" ? null : "{}",
  });
}

function capture() {
  const seen: Headers[] = [];
  const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return Response.json({ request_id: "one" });
  });
  return { seen, fetchImpl };
}

describe("one channel header upstream", () => {
  it("sends only the origin when a request carries both", async () => {
    const { seen, fetchImpl } = capture();
    const proxy = createProxy({ ...base, fetchImpl });
    const r = await proxy(
      post({ origin: "https://shop.test", "x-fingerly-sdk-platform": "ios" }),
    );
    expect(r.status).toBe(200);
    expect(seen[0]?.get("x-fingerly-origin")).toBe("https://shop.test");
    expect(seen[0]?.has("x-fingerly-sdk-platform")).toBe(false);
  });

  it("sends the platform when there is no origin", async () => {
    const { seen, fetchImpl } = capture();
    const proxy = createProxy({ ...base, fetchImpl });
    await proxy(post({ "x-fingerly-sdk-platform": "android" }));
    expect(seen[0]?.get("x-fingerly-sdk-platform")).toBe("android");
    expect(seen[0]?.has("x-fingerly-origin")).toBe(false);
  });
});

describe("plain HTTP upstream", () => {
  it.each([
    "http://upstream.invalid",
    "http://192.0.2.10:8080",
    "http://127.0.0.1:8080",
    "http://localhost",
  ])("refuses %j by default", (upstream) => {
    expect(() => new FingerlyProxy({ ...base, upstream })).toThrow(TypeError);
  });

  it.each(["http://upstream.invalid", "http://192.0.2.10", "http://127.0.0.2"])(
    "refuses plain http to %j even with allowInsecureLoopback",
    (upstream) => {
      expect(
        () =>
          new FingerlyProxy({ ...base, upstream, allowInsecureLoopback: true }),
      ).toThrow(TypeError);
    },
  );

  it.each([
    ["http://127.0.0.1:9", "http://127.0.0.1:9/api/v1/ingest"],
    ["http://localhost:9", "http://localhost:9/api/v1/ingest"],
    ["http://[::1]:9", "http://[::1]:9/api/v1/ingest"],
  ])("accepts %j only with allowInsecureLoopback", (upstream, target) => {
    expect(() => new FingerlyProxy({ ...base, upstream })).toThrow(TypeError);
    const proxy = new FingerlyProxy({
      ...base,
      upstream,
      allowInsecureLoopback: true,
    });
    expect(proxy.toJSON().upstreamUrl).toBe(target);
  });

  it("refuses a flag that is not a boolean", () => {
    expect(
      () =>
        new FingerlyProxy({
          ...base,
          upstream: "http://127.0.0.1:9",
          allowInsecureLoopback: "yes" as unknown as boolean,
        }),
    ).toThrow(TypeError);
  });
});

async function listen(server: net.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

const proxyFor = (port: number, fetchImpl?: typeof fetch) =>
  createProxy({
    ...base,
    upstream: `http://127.0.0.1:${port}`,
    allowInsecureLoopback: true,
    onError: () => {},
    ...(fetchImpl ? { fetchImpl } : {}),
  });

describe("redirects from upstream", () => {
  let targetHits: string[] = [];
  let status = 307;
  let upstreamPort = 0;
  let targetPort = 0;
  const target = http.createServer((req, res) => {
    targetHits.push(String(req.headers["x-fingerly-proxy-key"] ?? ""));
    req.resume();
    res.end("{}");
  });
  const upstream = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(status, {
        location: `http://127.0.0.1:${targetPort}/collect`,
        "content-type": "application/json",
      });
      res.end("{}");
    });
  });

  beforeAll(async () => {
    targetPort = await listen(target);
    upstreamPort = await listen(upstream);
  });
  afterAll(() => {
    target.close();
    upstream.close();
  });

  it.each([300, 301, 302, 303, 304, 307, 308])(
    "answers an upstream %i with 502 and follows nothing",
    async (code) => {
      status = code;
      targetHits = [];
      const r = await proxyFor(upstreamPort)(
        post({ origin: "https://shop.test" }),
      );
      expect(r.status).toBe(502);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(r.headers.get("location")).toBeNull();
      expect(targetHits).toEqual([]);
    },
  );

  it("answers 502 when a supplied fetch followed a redirect anyway", async () => {
    status = 307;
    targetHits = [];
    const following: typeof fetch = (input, init) =>
      fetch(input, { ...init, redirect: "follow" });
    const r = await proxyFor(
      upstreamPort,
      following,
    )(post({ origin: "https://shop.test" }));
    expect(r.status).toBe(502);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});

describe("statuses from upstream", () => {
  // Answers whatever status line it is told, byte for byte.
  let rawStatus = "600";
  let rawPort = 0;
  const raw = net.createServer((socket) => {
    socket.once("data", () => {
      socket.end(
        `HTTP/1.1 ${rawStatus} Odd\r\ncontent-type: application/json\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}`,
      );
    });
    socket.on("error", () => {});
  });

  beforeAll(async () => {
    rawPort = await listen(raw);
  });
  afterAll(() => raw.close());

  it.each(["099", "000", "100", "199", "600", "700", "999"])(
    "answers an upstream status %s with 502",
    async (code) => {
      rawStatus = code;
      const r = await proxyFor(rawPort)(post({ origin: "https://shop.test" }));
      expect(r.status).toBe(502);
      expect(r.headers.get("cache-control")).toBe("no-store");
    },
  );

  it("still relays an ordinary 4xx and 5xx", async () => {
    for (const code of ["200", "409", "429", "503"]) {
      rawStatus = code;
      const r = await proxyFor(rawPort)(post({ origin: "https://shop.test" }));
      expect(r.status).toBe(Number(code));
    }
  });
});

describe("exact method and no-store answers", () => {
  it.each(["GET", "PUT", "DELETE", "PATCH", "OPTIONS"])(
    "answers %s with 405 no-store",
    async (method) => {
      const { fetchImpl } = capture();
      const proxy = createProxy({ ...base, path: "/k7x2qm4a", fetchImpl });
      const r = await proxy(post({ origin: "https://shop.test" }, method));
      expect(r.status).toBe(405);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("answers a near-miss path with 404 no-store", async () => {
    const { fetchImpl } = capture();
    const proxy = createProxy({ ...base, path: "/k7x2qm4a", fetchImpl });
    for (const path of ["/k7x2qm4a/", "/K7x2qm4a", "/k7x2qm4a/x", "/k7x2qm4"]) {
      const r = await proxy(
        new Request(`https://shop.test${path}`, {
          method: "POST",
          headers: { origin: "https://shop.test", "x-api-key": publicKey },
          body: "{}",
        }),
      );
      expect(r.status).toBe(404);
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  describe("over a Node socket", () => {
    let calls = 0;
    let appPort = 0;
    const fetchImpl: typeof fetch = async () => {
      calls++;
      return Response.json({ request_id: "one" });
    };
    const handler = createNodeProxy({ ...base, path: "/k7x2qm4a", fetchImpl });
    const app = http.createServer((req, res) => {
      // Stands in for a server in front that passes a method through as sent;
      // Node's own parser refuses a lowercase one before any handler runs.
      const asSent = /^\/as-sent\/([A-Za-z]+)$/.exec(req.url ?? "");
      if (asSent)
        Object.assign(req, { method: asSent[1], originalUrl: "/k7x2qm4a" });
      void handler(req, res);
    });

    beforeAll(async () => {
      appPort = await listen(app);
    });
    afterAll(() => app.close());

    /** Sends a raw request and returns the whole answer. */
    function rawRequest(method: string, path = "/k7x2qm4a"): Promise<string> {
      return new Promise((resolve) => {
        const socket = net.connect(appPort, "127.0.0.1");
        let text = "";
        socket.on("data", (chunk) => (text += chunk.toString("latin1")));
        socket.on("close", () => resolve(text));
        socket.on("error", () => resolve(text));
        socket.write(
          `${method} ${path} HTTP/1.1\r\nhost: shop.test\r\norigin: https://shop.test\r\n` +
            `x-api-key: ${publicKey}\r\ncontent-type: application/json\r\n` +
            `content-length: 2\r\nconnection: close\r\n\r\n{}`,
        );
      });
    }

    it.each(["post", "Post", "pOST"])(
      "never forwards the method %j",
      async (method) => {
        calls = 0;
        const answer = await rawRequest(method);
        expect(calls).toBe(0);
        const statusLine = answer.split("\r\n", 1)[0] ?? "";
        // Node's parser may refuse the method itself (400); when it passes it
        // through, the proxy answers 405 with no-store.
        if (/^HTTP\/1\.1 405 /.test(statusLine))
          expect(answer.toLowerCase()).toContain("cache-control: no-store");
        else expect(statusLine).toMatch(/^HTTP\/1\.1 400 /);
      },
    );

    it.each(["post", "Post", "pOST", "options"])(
      "answers %j passed through by a front server with 405 no-store",
      async (method) => {
        calls = 0;
        const answer = await rawRequest("POST", `/as-sent/${method}`);
        expect(answer.split("\r\n", 1)[0]).toMatch(/^HTTP\/1\.1 405 /);
        expect(answer.toLowerCase()).toContain("cache-control: no-store");
        expect(calls).toBe(0);
      },
    );

    it("forwards an exact POST", async () => {
      calls = 0;
      const answer = await rawRequest("POST");
      expect(answer.split("\r\n", 1)[0]).toMatch(/^HTTP\/1\.1 200 /);
      expect(calls).toBe(1);
    });

    it.each(["/k7x2qm4a/", "//k7x2qm4a", "/x/../k7x2qm4a", "/k7x2qm4%61"])(
      "answers %j with 404 no-store",
      async (path) => {
        calls = 0;
        const answer = await rawRequest("POST", path);
        expect(answer.split("\r\n", 1)[0]).toMatch(/^HTTP\/1\.1 404 /);
        expect(answer.toLowerCase()).toContain("cache-control: no-store");
        expect(calls).toBe(0);
      },
    );
  });
});

describe("upstream shape", () => {
  it.each([
    "https://upstream.invalid/prefix",
    "https://upstream.invalid/a/../b",
    "https://upstream.invalid/..",
    "https://upstream.invalid\n",
    "https://upstream.invalid ",
    " https://upstream.invalid",
    "https://upstream.invalid\r\nx-injected: 1",
    "https://upstream.invalid\t",
    "https://upstream.invalid?",
    "https://upstream.invalid/?x=1",
    "https://upstream.invalid#",
    "https://upstream.invalid#frag",
    "https://user:pass@upstream.invalid",
    "https://upstream.invalid\\",
    "https://upstream.invalid\\@evil.invalid",
    "https:upstream.invalid",
    "ftp://upstream.invalid",
    "file:///private",
    "",
  ])("refuses %j without naming it", (upstream) => {
    let error: unknown;
    try {
      new FingerlyProxy({ ...base, upstream });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).not.toContain("upstream.invalid");
  });

  it.each([
    ["https://upstream.invalid", "https://upstream.invalid/api/v1/ingest"],
    ["https://upstream.invalid/", "https://upstream.invalid/api/v1/ingest"],
    [
      "https://UPSTREAM.invalid:8443",
      "https://upstream.invalid:8443/api/v1/ingest",
    ],
    ["https://upstream.invalid:443", "https://upstream.invalid/api/v1/ingest"],
  ])("accepts %j as a bare origin", (upstream, target) => {
    const proxy = new FingerlyProxy({ ...base, upstream });
    expect(proxy.toJSON().upstreamUrl).toBe(target);
  });
});

describe("failure lines", () => {
  it("name neither the upstream nor the key when it is unreachable", async () => {
    const lines: string[] = [];
    const proxy = createProxy({
      ...base,
      upstream: "http://127.0.0.1:1",
      allowInsecureLoopback: true,
      onError: (failure) => lines.push(failure.message),
    });
    const r = await proxy(post({ origin: "https://shop.test" }));
    expect(r.status).toBe(502);
    expect(await r.text()).toBe("Bad gateway");
    expect(lines).toHaveLength(1);
    for (const text of lines) {
      expect(text).not.toContain("127.0.0.1");
      expect(text).not.toContain("ingest");
      expect(text).not.toContain(proxyKey);
    }
  });

  it("never copies an error message that carries the URL", async () => {
    const lines: string[] = [];
    const proxy = createProxy({
      ...base,
      upstream: "https://upstream.invalid",
      onError: (failure) => lines.push(failure.message),
      fetchImpl: async () => {
        throw Object.assign(
          new TypeError(
            "request to https://upstream.invalid/api/v1/ingest failed",
          ),
          { cause: new Error("connect to upstream.invalid:443 refused") },
        );
      },
    });
    await proxy(post({ origin: "https://shop.test" }));
    expect(lines).toEqual(["upstream request failed: other"]);
  });
});
