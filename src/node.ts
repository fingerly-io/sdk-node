import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  NodeNext,
  NodeRequest,
  NodeResponse,
  ProxyPeer,
} from "./types.js";

/** How long a refused upload may keep its connection while it drains. */
const DRAIN_GRACE_MS = 5_000;

/** What the Node adapter needs from the proxy it serves. */
export interface NodeTarget {
  /** The configured path, or null when the framework routes it. */
  path: string | null;
  /** Forwards one Fetch request; never throws. */
  forward(request: Request, peer: ProxyPeer): Promise<Response>;
  /** Reports a deployment mistake once per process. */
  misconfigured(problem: string, message: string): void;
}

/**
 * Serves one Node `IncomingMessage` through the Fetch-based proxy.
 *
 * It does what each Express, NestJS or Fastify integration otherwise has to
 * get right by hand: match the raw path before any normalisation, stream the
 * body unread (bounded by the proxy), pass the TCP peer address to
 * `clientIp`, cancel upstream when the visitor disconnects, and write the
 * answer back. It never throws and never calls `next` with an error.
 */
export async function serveNode(
  target: NodeTarget,
  nodeRequest: NodeRequest,
  nodeResponse: NodeResponse,
  next?: NodeNext,
): Promise<void> {
  const req = nodeRequest as unknown as IncomingMessage & {
    originalUrl?: string;
    rawBody?: unknown;
    _body?: unknown;
  };
  const res = nodeResponse as unknown as ServerResponse;
  const rawUrl = req.originalUrl ?? req.url ?? "/";
  const rawPath = rawUrl.split("?", 1)[0]!;

  // Exactly the issued path, compared before any URL parsing can resolve dot
  // segments or decode characters. Elsewhere, let the app answer.
  if (target.path !== null && rawPath !== target.path) {
    if (next) return next();
    return write(res, plain(404, "Not Found"));
  }

  const body = requestBody(req);
  if (body === "consumed") {
    target.misconfigured(
      "node-body",
      "the request body was already read by a body parser; mount the proxy before it",
    );
    return write(
      res,
      plain(500, "Proxy misconfigured: the request body was already read"),
    );
  }

  const abort = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) abort.abort();
  });

  let request: Request;
  try {
    const scheme = (req.socket as { encrypted?: boolean }).encrypted
      ? "https"
      : "http";
    const init: RequestInit & { duplex?: "half" } = {
      method: req.method ?? "GET",
      headers: toHeaders(req.headers),
      signal: abort.signal,
    };
    if (init.method !== "GET" && init.method !== "HEAD") {
      init.body = body === "stream" ? streamOf(req) : (body as BodyInit);
      init.duplex = "half";
    }
    request = new Request(
      `${scheme}://${req.headers.host ?? "localhost"}${rawUrl}`,
      init,
    );
  } catch {
    return write(res, plain(400, "Bad Request"));
  }

  const response = await target.forward(request, {
    remoteAddress: req.socket?.remoteAddress,
  });
  // A refused upload may still be arriving. It is discarded as it comes (see
  // streamOf) so the visitor reads the answer instead of a reset connection.
  await write(res, response);
}

/**
 * Where the body is: still in the stream, buffered by a framework that kept
 * the raw bytes (NestJS `rawBody: true`), or consumed and unrecoverable.
 */
function requestBody(
  req: IncomingMessage & { rawBody?: unknown; _body?: unknown },
): "stream" | "consumed" | Uint8Array {
  if (req.rawBody instanceof Uint8Array) return req.rawBody;
  // `_body` is how the common body parsers mark a request they have read.
  if (req.readableEnded || req._body === true) {
    // An empty body was never there to lose.
    return req.headers["content-length"] === "0"
      ? new Uint8Array()
      : "consumed";
  }
  return "stream";
}

/**
 * A Fetch body over the request stream that, when cancelled at the size
 * limit, stops reading without destroying the socket, so the visitor still
 * receives the 413 instead of a reset connection.
 */
function streamOf(req: IncomingMessage): ReadableStream<Uint8Array> {
  let attached = false;
  let detach = () => {};
  // A high-water mark of zero: nothing is read until the proxy asks, so a
  // request refused before its body (401, 405) leaves the stream to Node.
  return new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (!attached) {
          attached = true;
          const onData = (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
            if ((controller.desiredSize ?? 0) <= 0) req.pause();
          };
          const onEnd = () => {
            detach();
            controller.close();
          };
          const onError = (error: unknown) => {
            detach();
            controller.error(error);
          };
          req.on("data", onData);
          req.once("end", onEnd);
          req.once("error", onError);
          detach = () => {
            req.off("data", onData);
            req.off("end", onEnd);
            req.off("error", onError);
          };
        }
        req.resume();
      },
      cancel() {
        detach();
        // Discard the rest so the answer can be delivered, but do not let a
        // client that keeps sending hold the connection.
        req.resume();
        const timer = setTimeout(() => req.destroy(), DRAIN_GRACE_MS);
        timer.unref?.();
        req.once("end", () => clearTimeout(timer));
      },
    },
    { highWaterMark: 0 },
  );
}

/** Copies Node's header object into Fetch headers. */
function toHeaders(raw: IncomingMessage["headers"]): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    try {
      if (Array.isArray(value)) for (const v of value) headers.append(name, v);
      else headers.set(name, value);
    } catch {
      // A header Fetch refuses is not one the proxy forwards anyway.
    }
  }
  return headers;
}

/** A plain-text answer the adapter gives itself. */
function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Writes a Fetch response through Node, unless the visitor has gone. */
async function write(res: ServerResponse, response: Response): Promise<void> {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (res.destroyed || res.writableEnded || res.headersSent) return;
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.setHeader("content-length", bytes.byteLength);
  res.end(bytes);
}
