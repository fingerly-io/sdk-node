import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createProxy, load, verifyWebhook } from "../src/index.js";

describe("verifyWebhook", () => {
  it("verifies the raw payload and rejects stale timestamps", () => {
    const payload = '{"ok":true}';
    const timestamp = "1700000000";
    const signature =
      "sha256=" +
      createHmac("sha256", "secret")
        .update(timestamp + "." + payload)
        .digest("hex");
    expect(
      verifyWebhook({
        secret: "secret",
        payload,
        timestamp,
        signature,
        now: new Date(1700000000_000),
      }),
    ).toBe(true);
    expect(
      verifyWebhook({
        secret: "secret",
        payload,
        timestamp,
        signature,
        now: new Date(1700001000_000),
      }),
    ).toBe(false);
  });

  it("accepts any of the signatures sent during a secret rotation", () => {
    const payload = '{"ok":true}';
    const timestamp = "1700000000";
    const sign = (secret: string) =>
      "sha256=" +
      createHmac("sha256", secret)
        .update(timestamp + "." + payload)
        .digest("hex");
    const now = new Date(1700000000_000);
    const header = `${sign("new")},${sign("old")}`;
    expect(
      verifyWebhook({
        secret: "new",
        payload,
        timestamp,
        signature: header,
        now,
      }),
    ).toBe(true);
    expect(
      verifyWebhook({
        secret: "old",
        payload,
        timestamp,
        signature: header,
        now,
      }),
    ).toBe(true);
    expect(
      verifyWebhook({
        secret: "other",
        payload,
        timestamp,
        signature: header,
        now,
      }),
    ).toBe(false);
  });
});

describe("release metadata", () => {
  it("reports the package version upstream and in the changelog", async () => {
    const read = (name: string) =>
      readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
    const { version } = JSON.parse(read("package.json")) as {
      version: string;
    };
    let header: string | null = null;
    const proxy = createProxy({
      proxyKey: "fly_px_development_proxy",
      clientIp: () => "203.0.113.10",
      fetchImpl: async (_url, init) => {
        header = new Headers(init?.headers).get("x-fingerly-proxy-version");
        return Response.json({});
      },
    });
    await proxy(
      new Request("https://shop.test/k7x2qm4a", {
        method: "POST",
        headers: { "x-api-key": "fly_pk_development_public" },
        body: "{}",
      }),
    );
    expect(header).toBe(`node/${version}`);
    expect(read("CHANGELOG.md")).toMatch(new RegExp(`^## ${version}$`, "m"));
    expect(read("CHANGELOG.md").indexOf(`## ${version}`)).toBe(
      read("CHANGELOG.md").indexOf("## "),
    );
  });
});

describe("verifyWebhook with untrusted input", () => {
  const timestamp = "1700000000";
  const now = new Date(1700000000_000);
  const signature = "sha256=" + "a".repeat(64);

  it("rejects a body parser's empty result instead of throwing", () => {
    for (const payload of [undefined, {}, null, 7, []]) {
      expect(
        verifyWebhook({
          secret: "secret",
          payload: payload as never,
          timestamp,
          signature,
          now,
        }),
      ).toBe(false);
    }
  });

  it("rejects headers that are not strings", () => {
    expect(
      verifyWebhook({
        secret: "secret",
        payload: "{}",
        timestamp: [timestamp] as never,
        signature,
        now,
      }),
    ).toBe(false);
    expect(
      verifyWebhook({
        secret: "secret",
        payload: "{}",
        timestamp,
        signature: [signature] as never,
        now,
      }),
    ).toBe(false);
  });
});

describe("verifyWebhook signature list", () => {
  it("considers only the first 32 candidates", () => {
    const payload = '{"ok":true}';
    const timestamp = "1700000000";
    const now = new Date(1700000000_000);
    const good =
      "sha256=" +
      createHmac("sha256", "secret")
        .update(timestamp + "." + payload)
        .digest("hex");
    const decoy = "sha256=" + "0".repeat(64);
    const header = (before: number) =>
      [...Array<string>(before).fill(decoy), good].join(",");
    const verify = (signature: string) =>
      verifyWebhook({ secret: "secret", payload, timestamp, signature, now });
    expect(verify(header(31))).toBe(true);
    expect(verify(header(32))).toBe(false);
    const huge = Array<string>(200_000).fill(decoy).join(",");
    const started = performance.now();
    expect(verify(huge)).toBe(false);
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe("event client", () => {
  it("rejects unsupported keys before any network access", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    for (const secretKey of [
      undefined,
      "",
      "not-a-fingerly-key",
      "fly_pk_production_test",
      "fly_px_development_test",
      "fly_mk_test",
      "fly_sk_unknown_test",
      "fly_sk_production_",
    ]) {
      // Constructing never throws for the key, so a build without secrets can
      // load the module; the first read refuses it instead.
      const client = load({
        secretKey,
        endpoint: "https://custom.test",
        fetchImpl,
      });
      await expect(client.events.list()).rejects.toThrow(TypeError);
      await expect(client.events.get("id")).rejects.toThrow(TypeError);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("scopes reads through the secret key and encodes filters", async () => {
    let seen: { url: string; key: string | null } | undefined;
    const client = load({
      secretKey: "fly_sk_development_test",
      endpoint: "https://fingerly.test",
      fetchImpl: async (input, init) => {
        seen = {
          url: String(input),
          key: new Headers(init?.headers).get("x-api-key"),
        };
        return Response.json({ rows: [], page: 1, page_size: 20 });
      },
    });
    await client.events.list({ limit: 20, level: "high" });
    expect(seen).toEqual({
      url: "https://fingerly.test/api/v1/events?limit=20&level=high",
      key: "fly_sk_development_test",
    });
  });
});

describe("same-origin proxy", () => {
  it("forwards trusted visitor metadata and only accepted SDK paths", async () => {
    let upstream: Request | undefined;
    const proxy = createProxy({
      proxyKey: "fly_px_production_proxy",
      path: "/k7x2qm4a",
      clientIp: () => "203.0.113.10",
      fetchImpl: async (input, init) => {
        upstream = new Request(input, init);
        return Response.json(
          { request_id: "one" },
          {
            headers: {
              "x-request-id": "one",
              "fingerly-balance-micros": "100",
              "set-cookie": "a=b",
            },
          },
        );
      },
    });
    const response = await proxy(
      new Request("https://shop.test/k7x2qm4a", {
        method: "POST",
        headers: {
          origin: "https://shop.test",
          "user-agent": "Firefox",
          "x-api-key": "fly_pk_production_public",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(upstream?.url).toBe("https://api.fingerly.io/api/v1/ingest");
    expect(upstream?.headers.get("x-fingerly-proxy-version")).toBe(
      "node/0.2.0",
    );
    expect(upstream?.headers.get("x-fingerly-client-ip")).toBe("203.0.113.10");
    expect(upstream?.headers.get("x-fingerly-origin")).toBe(
      "https://shop.test",
    );
    expect(upstream?.headers.get("x-api-key")).toBe("fly_pk_production_public");
    expect(upstream?.headers.get("x-fingerly-proxy-key")).toBe(
      "fly_px_production_proxy",
    );
    expect(upstream?.headers.get("cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe("one");
    // Nothing relayed may name Fingerly: a blocker can match a header name.
    const relayed: string[] = [];
    response.headers.forEach((_value, name) => relayed.push(name));
    expect(relayed.join(" ")).not.toMatch(/fingerly|set-cookie/);

    expect(
      (
        await proxy(
          new Request("https://shop.test/k7x2qm4a/admin", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(404);
  });

  it("rejects missing public keys and oversized bodies before forwarding", async () => {
    let calls = 0;
    const proxy = createProxy({
      proxyKey: "fly_px_development_proxy",
      maxBodyBytes: 2,
      clientIp: () => "203.0.113.10",
      fetchImpl: async () => {
        calls++;
        return Response.json({});
      },
    });
    expect(
      (
        await proxy(
          new Request("https://shop.test/k7x2qm4a", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await proxy(
          new Request("https://shop.test/k7x2qm4a", {
            method: "POST",
            headers: { "x-api-key": "fly_pk_development_public" },
            body: "long",
          }),
        )
      ).status,
    ).toBe(413);
    expect(calls).toBe(0);
  });
});
