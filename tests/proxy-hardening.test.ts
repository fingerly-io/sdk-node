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
