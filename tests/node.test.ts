import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createNodeProxy } from "../src/index.js";

/** What the fake ingest saw for each forwarded request. */
interface Seen {
  ip: string | undefined;
  bytes: number;
}

const seen: Seen[] = [];
let upstreamClosed = 0;
let hang = false;

const upstream = http.createServer((req, res) => {
  let bytes = 0;
  req.on("data", (chunk: Buffer) => (bytes += chunk.length));
  req.on("end", () => {
    seen.push({
      ip: req.headers["x-fingerly-client-ip"] as string | undefined,
      bytes,
    });
    if (hang) {
      res.on("close", () => upstreamClosed++);
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"request_id":"one"}');
  });
});

let appPort = 0;
let app: http.Server;

beforeAll(async () => {
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve),
  );
  const handler = createNodeProxy({
    proxyKey: "fly_px_development_test",
    upstream: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,
    path: "/k7x2qm4a",
    maxBodyBytes: 1_048_576,
    timeoutMs: 2_000,
    clientIp: (_request, peer) => peer.remoteAddress!,
    onError: () => {},
  });
  app = http.createServer((req, res) => {
    // A framework that buffered the body itself, as NestJS rawBody does.
    if (req.url === "/buffered") {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        Object.assign(req, {
          rawBody: Buffer.concat(chunks),
          _body: true,
          originalUrl: "/k7x2qm4a",
        });
        void handler(req, res);
      });
      return;
    }
    // A parser that consumed the body and kept nothing.
    if (req.url === "/parsed") {
      req.resume();
      req.on("end", () => {
        Object.assign(req, { _body: true, originalUrl: "/k7x2qm4a" });
        void handler(req, res);
      });
      return;
    }
    void handler(req, res, () => {
      res.statusCode = 418;
      res.end("app");
    });
  });
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  appPort = (app.address() as AddressInfo).port;
});

afterAll(() => {
  app.close();
  upstream.close();
});

function post(
  path: string,
  body: Buffer,
  options: { chunked?: boolean; abortAfterMs?: number } = {},
): Promise<{ status?: number; text?: string; error?: string }> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": "fly_pk_development_test",
    };
    if (!options.chunked) headers["content-length"] = String(body.length);
    const req = http.request(
      { host: "127.0.0.1", port: appPort, method: "POST", path, headers },
      (res) => {
        let text = "";
        res.on("data", (c: Buffer) => (text += c));
        res.on("end", () => resolve({ status: res.statusCode!, text }));
      },
    );
    req.on("error", (e: NodeJS.ErrnoException) =>
      resolve({ error: e.code ?? e.message }),
    );
    if (options.abortAfterMs)
      setTimeout(() => {
        req.destroy();
        resolve({ error: "aborted" });
      }, options.abortAfterMs);
    if (!options.chunked) return req.end(body);
    let offset = 0;
    const pump = () => {
      while (offset < body.length) {
        const piece = body.subarray(offset, offset + 65_536);
        offset += piece.length;
        if (!req.write(piece)) return req.once("drain", pump);
      }
      req.end();
    };
    pump();
  });
}

describe("Node handler", () => {
  it("forwards the streamed body with the TCP peer address", async () => {
    seen.length = 0;
    const r = await post("/k7x2qm4a", Buffer.from('{"sdk":{}}'));
    expect(r).toEqual({ status: 200, text: '{"request_id":"one"}' });
    expect(seen).toEqual([{ ip: "127.0.0.1", bytes: 10 }]);
  });

  it("leaves a failing next handler's rejection to the framework", async () => {
    const handler = createNodeProxy({
      proxyKey: "fly_px_development_test",
      path: "/k7x2qm4a",
      clientIp: () => "127.0.0.1",
      onError: () => {},
    });
    const next = (() => Promise.reject(new Error("boom"))) as () => void;
    await expect(
      handler(
        { method: "GET", url: "/elsewhere", headers: {} },
        {} as never,
        next,
      ),
    ).rejects.toThrow("boom");
  });

  it("passes every other raw path to the app, dot segments included", async () => {
    seen.length = 0;
    for (const path of [
      "/k7x2qm4a/",
      "/k7x2qm4a/x",
      "/x/../k7x2qm4a",
      "/k7x2qm4%61",
      "//k7x2qm4a",
      "/K7X2QM4A",
    ])
      expect((await post(path, Buffer.from("{}"))).status, path).toBe(418);
    expect(seen).toHaveLength(0);
  });

  it("answers 413 to an oversized chunked upload rather than resetting", async () => {
    seen.length = 0;
    // Answering mid-upload used to race Node closing the socket: some
    // visitors saw EPIPE or ECONNRESET instead of the 413.
    const outcomes: (number | string | undefined)[] = [];
    for (const mib of [2, 4, 8, 2, 4, 8, 2, 4, 8, 16]) {
      const r = await post("/k7x2qm4a", Buffer.alloc(mib * 1_048_576, 0x20), {
        chunked: true,
      });
      outcomes.push(r.status ?? r.error);
    }
    expect(outcomes).toEqual(Array(10).fill(413));
    expect(seen).toHaveLength(0);
  }, 30_000);

  it("answers a refused request without reading its body", async () => {
    seen.length = 0;
    const r = await new Promise<number | string>((resolve) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port: appPort,
          method: "POST",
          path: "/k7x2qm4a",
          headers: {
            "content-type": "application/json",
            "x-api-key": "fly_pk_development_test",
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode!));
        },
      );
      req.on("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? ""));
      req.end(Buffer.alloc(2 * 1_048_576, 0x20));
    });
    // Refused on the declared length, before a byte of the body is read.
    expect(r).toBe(413);
    expect(seen).toHaveLength(0);
  });

  it("uses a body the framework buffered, and refuses one it discarded", async () => {
    seen.length = 0;
    expect((await post("/buffered", Buffer.from('{"a":1}'))).status).toBe(200);
    expect(seen).toEqual([{ ip: "127.0.0.1", bytes: 7 }]);
    const parsed = await post("/parsed", Buffer.from('{"a":1}'));
    expect(parsed.status).toBe(500);
    expect(parsed.text).toBe(
      "Proxy misconfigured: the request body was already read",
    );
  });

  it("cancels the upstream call when the visitor disconnects", async () => {
    hang = true;
    upstreamClosed = 0;
    await post("/k7x2qm4a", Buffer.from("{}"), { abortAfterMs: 100 });
    await new Promise((resolve) => setTimeout(resolve, 200));
    hang = false;
    expect(upstreamClosed).toBe(1);
  });
});
