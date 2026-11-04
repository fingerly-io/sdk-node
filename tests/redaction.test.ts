import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { Fingerly, FingerlyProxy } from "../src/index.js";

const secretKey = "fly_sk_development_inspectcheck";
const proxyKey = "fly_px_development_inspectcheck";

describe("credential redaction", () => {
  it("keeps keys out of inspect, console and JSON output", () => {
    const client = new Fingerly({ secretKey });
    const proxy = new FingerlyProxy({
      proxyKey,
      clientIp: () => "203.0.113.1",
    });
    const outputs = [
      inspect(client, { depth: 10, showHidden: true }),
      inspect(client.events, { depth: 10, showHidden: true }),
      JSON.stringify(client),
      inspect(proxy, { depth: 10, showHidden: true }),
      JSON.stringify(proxy),
      String(client),
      String(proxy),
    ];
    for (const text of outputs) {
      expect(text).not.toContain(secretKey);
      expect(text).not.toContain(proxyKey);
    }
    expect(inspect(client, { depth: 10 })).toContain("[redacted]");
    expect(JSON.stringify(proxy)).toContain("[redacted]");
  });
});
