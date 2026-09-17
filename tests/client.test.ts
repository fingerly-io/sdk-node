import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Fingerly, EventsClient, FingerlyProxy, load } from "../src/index.js";

const secretKey = "fly_sk_us_development_test";

describe("Fingerly class API", () => {
  it("composes an events client and keeps load compatible", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ request_id: "request-1", suspect_score: 0 }),
        ),
      );
    const client = new Fingerly({ secretKey, fetchImpl });
    expect(client.events).toBeInstanceOf(EventsClient);
    expect(await client.events.get("request-1")).toMatchObject({
      suspect_score: 0,
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://us.api.fingerly.io/api/v1/events/request-1",
    );
    expect(load({ secretKey })).toBeInstanceOf(Fingerly);
  });

  it("verifies raw webhook bytes through the static API", () => {
    const secret = "whsec_test";
    const payload = Buffer.from('{"action":"checkout"}');
    const timestamp = "1789646400";
    const signature =
      "sha256=" +
      createHmac("sha256", secret)
        .update(timestamp + ".")
        .update(payload)
        .digest("hex");
    const options = {
      secret,
      payload,
      timestamp,
      signature,
      now: new Date(Number(timestamp) * 1000),
    };
    expect(Fingerly.verifyWebhook(options)).toBe(true);
    expect(
      Fingerly.verifyWebhook({ ...options, payload: Buffer.from("{}") }),
    ).toBe(false);
    expect(Fingerly.verifyWebhook({ ...options, now: new Date(NaN) })).toBe(
      false,
    );
  });

  it("creates bound proxy handlers for framework callbacks", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response("{}"));
    const options = {
      proxyKey: "fly_px_us_development_test",
      clientIp: () => "203.0.113.1",
      fetchImpl,
    };
    const request = () =>
      new Request("https://shop.test/api/fingerly/api/v1/identify", {
        method: "POST",
        headers: { "x-api-key": "fly_pk_us_development_test" },
        body: "{}",
      });
    const { handle } = new FingerlyProxy(options);
    expect((await handle(request())).status).toBe(200);
    expect((await Fingerly.createProxy(options)(request())).status).toBe(200);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toBeInstanceOf(Headers);
  });
});
