/**
 * The events client's `endpoint` follows the same rule as the proxy upstream:
 * a bare HTTPS origin, plain HTTP only for a loopback host behind
 * `allowInsecureLoopback`. Every server here listens on 127.0.0.1.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { load } from "../src/index.js";

const secretKey = "fly_sk_development_test";

function errorOf(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected a throw");
}

describe("events client endpoint", () => {
  it.each([
    "http://api.example.invalid",
    "http://192.0.2.10:8080",
    "http://127.0.0.1:8080",
    "http://localhost",
    "https://api.example.invalid/prefix",
    "https://api.example.invalid/a/../b",
    "https://api.example.invalid\n",
    "https://api.example.invalid ",
    "https://api.example.invalid\r\nx-injected: 1",
    "https://api.example.invalid?",
    "https://api.example.invalid?key=value",
    "https://api.example.invalid#",
    "https://user:pass@api.example.invalid",
    "https://api.example.invalid\\",
    "file:///private",
    "",
  ])("refuses %j without naming it or the key", (endpoint) => {
    const error = errorOf(() => load({ secretKey, endpoint }));
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toMatch(/^endpoint must/);
    expect(error.message).not.toContain("example.invalid");
    expect(error.message).not.toContain("192.0.2.10");
    expect(error.message).not.toContain(secretKey);
  });

  it.each(["http://api.example.invalid", "http://127.0.0.2"])(
    "refuses plain http to %j even with allowInsecureLoopback",
    (endpoint) => {
      expect(() =>
        load({ secretKey, endpoint, allowInsecureLoopback: true }),
      ).toThrow(TypeError);
    },
  );

  it("refuses a flag that is not a boolean", () => {
    expect(() =>
      load({
        secretKey,
        endpoint: "http://127.0.0.1:9",
        allowInsecureLoopback: 1 as unknown as boolean,
      }),
    ).toThrow(TypeError);
  });

  it.each([
    [
      "https://API.example.invalid/",
      "https://api.example.invalid/api/v1/events/x",
    ],
    [
      "https://api.example.invalid:8443",
      "https://api.example.invalid:8443/api/v1/events/x",
    ],
  ])("reads from the origin rebuilt from %j", async (endpoint, expected) => {
    let target = "";
    const client = load({
      secretKey,
      endpoint,
      fetchImpl: async (url) => {
        target = String(url);
        return Response.json({ request_id: "x", suspect_score: null });
      },
    });
    await client.events.get("x");
    expect(target).toBe(expected);
  });

  describe("on a loopback API", () => {
    const api = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"request_id":"x","suspect_score":null}');
    });
    let port = 0;
    beforeAll(async () => {
      await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
      port = (api.address() as AddressInfo).port;
    });
    afterAll(() => api.close());

    it("needs allowInsecureLoopback for plain http", async () => {
      const endpoint = `http://127.0.0.1:${port}`;
      expect(() => load({ secretKey, endpoint })).toThrow(TypeError);
      const client = load({ secretKey, endpoint, allowInsecureLoopback: true });
      const event = await client.events.get("x");
      expect(event.request_id).toBe("x");
    });
  });
});
