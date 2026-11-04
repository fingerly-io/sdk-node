# @fingerly/node

Server-side event reads, webhook verification, and a same-origin proxy for the
browser SDK. Node.js 18.16 or newer. No runtime dependencies.

```sh
npm install @fingerly/node
```

## Read events

```ts
import { Fingerly } from "@fingerly/node";

const fingerly = new Fingerly({ secretKey: process.env.FINGERLY_SECRET_KEY });

const page = await fingerly.events.list({ limit: 50, level: "high" });
const event = await fingerly.events.get(requestId);
```

Create the client once and reuse it. Event reads need a
`fly_sk_{production|staging|development}_…` key. The key is checked on the
first request, not when the client is created, so a build that runs without
secrets can still load the module; a public, proxy, malformed or missing key
makes that request reject with a `TypeError` before any network access.
Requests go to `https://api.fingerly.io`; `endpoint` overrides that for a local
API, and `apiVersion` selects a route version (`v1` by default).

An event is readable as soon as identification answers, so reading one right
after identifying a visitor needs nothing special. `404 event_not_found` means
a request id that was never issued. `suspect_score: null` means unscored and
must not be treated as zero. The archived `document` arrives moments after the
event: check `has_document` rather than assuming.

`get` and `list` each make one request and never retry. One deadline
(`timeoutMs`, 5000 by default) covers connecting, the response and its body.
Both accept an `AbortSignal` (`list` through its options) and keep the caller's
abort reason. Redirects are never followed. Failures are always one of these:

| Error | When | Carries |
|---|---|---|
| `FingerlyAPIError` | any non-2xx answer, redirects included, or a 2xx that is not JSON or exceeds 4 MiB (`code` `invalid_response` or `response_too_large`) | `status`, `code`, `details`, `requestId`, `retryAfter` (seconds, or `null`) |
| `FingerlyTimeoutError` | the deadline passed | |
| `FingerlyConnectionError` | the API could not be reached or the connection dropped mid-response; `FingerlyTimeoutError` is a kind of it | `cause` |

Error messages never quote a response body or a key. `console.log(fingerly)` and
`JSON.stringify(fingerly)` show `[redacted]` in place of the key. `instanceof`
works even when an app loads both the ESM and the CommonJS build.

```ts
import { FingerlyAPIError, FingerlyConnectionError } from "@fingerly/node";

try {
  await fingerly.events.get(requestId);
} catch (error) {
  if (error instanceof FingerlyAPIError && error.status === 429)
    console.log(`retry in ${error.retryAfter ?? 1} s`);
  else if (error instanceof FingerlyConnectionError) console.log("unreachable");
  else throw error;
}
```

## Verify a backend action

Read the event with a server-only key. Check that its tag matches your action,
that it is recent, that its environment is correct, and that it was scored.
Apply your own policy to the server's verdict. Do not authorize an action using
scores or visitor identifiers supplied by the browser. Tags correlate events;
they do not replace your application's authentication or replay protection.

## Webhooks

```ts
const valid = Fingerly.verifyWebhook({
  secret: process.env.FINGERLY_WEBHOOK_SECRET!,
  payload: rawBody, // the exact bytes received, as a Buffer, Uint8Array or string
  timestamp: request.headers.get("x-fingerly-timestamp"),
  signature: request.headers.get("x-fingerly-signature"),
});
```

Verify the exact raw bytes before JSON parsing: re-serialising parsed JSON
changes the digest. Signatures cover the timestamp and body, and the default
replay tolerance is 300 seconds. During a signing-secret rotation any one of
the first 32 comma-separated signatures may match. Verification does not
deduplicate, so persist processed webhook ids. The framework guides below show
where each framework keeps the raw body.

## Same-origin proxy

The proxy serves the browser SDK from a path on your own site, which is what
gets it past content blockers. Create a proxy in the dashboard
(**Integration > Proxy keys**), mount the handler at the exact path it issued,
and point the browser SDK at that path with `endpoints: "/k7x2qm4a"`.

The proxy forwards to Fingerly's one ingest URL with the browser's public key,
your proxy key and the visitor's address. It never forwards cookies or
authorization headers. It relays back only `content-type`, `x-request-id` and
the rate limit headers (`retry-after` included), so nothing on the response
names Fingerly, and marks every response `no-store`. It answers:

- **404** for any path but the issued one: no prefix, trailing or doubled
  slash, dot segment or encoded character, and case-sensitive.
- **401** when the browser's public key is missing or for another environment,
  **405** for anything but `POST`, **413** for bodies over 1 MiB
  (`maxBodyBytes`), all without calling upstream.
- **504** when the exchange takes longer than `timeoutMs` (5000 by default),
  **502** when the upstream is unreachable, resets, or answers more than 4 MiB.
  The handler never throws, so your framework never turns an outage into a 500
  with a stack trace. Each failure is one line on `console.error`, or passed
  to `onError` if you give one.
- **500** with a one-line message when the proxy is misconfigured: the proxy
  key is missing or invalid, or `clientIp` returned anything but one IP
  address. This is logged once per process, not per request.

When the visitor disconnects, the upstream call is cancelled and nothing is
logged. The proxy key, like the secret key, is checked on the first request,
so a build without secrets can load the route module.

### The visitor's address

`clientIp(request, peer)` must return exactly one IPv4 or IPv6 address. Take it
from the header your CDN or load balancer sets, and otherwise from
`peer.remoteAddress`, the TCP peer, where the server exposes it (the Node
handler below does; a Fetch route handler cannot). Trust that header only when
traffic can reach your app solely through that CDN or load balancer, since
anyone else can send it. `null`, an empty string, a comma-separated list or
anything else is a configuration error: the request is answered 500 without
calling upstream.

### Next.js (App Router)

The route file for the issued path, here `app/k7x2qm4a/route.ts`:

```ts
import { Fingerly } from "@fingerly/node";

export const POST = Fingerly.createProxy({
  proxyKey: process.env.FINGERLY_PROXY_KEY,
  // The header your CDN or load balancer sets to the visitor's address.
  clientIp: (request) => request.headers.get("x-real-ip") ?? "",
});
```

Route handlers do not see the TCP peer, so the address has to come from a
header your infrastructure sets. Next.js fills `X-Forwarded-For` only when the
request did not already carry one, so do not trust it unless your load balancer
overwrites it. A webhook route reads the raw bytes with
`new Uint8Array(await request.arrayBuffer())`.

### Express

Mount the Node handler before any body parser: it reads the body itself.

```ts
import express from "express";
import { Fingerly } from "@fingerly/node";

const app = express();

app.use(
  Fingerly.createNodeProxy({
    proxyKey: process.env.FINGERLY_PROXY_KEY,
    path: "/k7x2qm4a",
    clientIp: (request, peer) =>
      request.headers.get("x-real-ip") ?? peer.remoteAddress ?? "",
  }),
);

// Webhooks need the raw bytes, so this route also comes before express.json().
app.post("/webhooks/fingerly", express.raw({ type: "*/*" }), (req, res) => {
  const valid = Fingerly.verifyWebhook({
    secret: process.env.FINGERLY_WEBHOOK_SECRET!,
    payload: req.body,
    timestamp: req.get("x-fingerly-timestamp"),
    signature: req.get("x-fingerly-signature"),
  });
  res.sendStatus(valid ? 204 : 401);
});

app.use(express.json());
// ...the rest of your app
app.listen(3000);
```

The handler answers only its path and calls `next()` for every other request,
so it can be mounted globally. Mounted after a body parser that consumed the
stream, it answers 500 and logs why once.

### NestJS

The same Node handler, registered with `app.use()` before `listen()`, which is
when NestJS adds its body parsers. `rawBody: true` keeps the raw bytes for
webhooks. With the Express adapter:

```ts
import { NestFactory } from "@nestjs/core";
import { Fingerly } from "@fingerly/node";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(
    Fingerly.createNodeProxy({
      proxyKey: process.env.FINGERLY_PROXY_KEY,
      path: "/k7x2qm4a",
      clientIp: (request, peer) =>
        request.headers.get("x-real-ip") ?? peer.remoteAddress ?? "",
    }),
  );
  await app.listen(3000);
}
void bootstrap();
```

With the Fastify adapter, only the factory call changes; NestJS runs `app.use`
middleware before Fastify parses the body:

```ts
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { rawBody: true },
);
```

Reading events and verifying webhooks from a controller, for either adapter:

```ts
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { Fingerly } from "@fingerly/node";

const fingerly = new Fingerly({ secretKey: process.env.FINGERLY_SECRET_KEY });

@Controller()
export class FingerlyController {
  @Get("events/:id")
  event(@Param("id") id: string) {
    return fingerly.events.get(id);
  }

  @Post("webhooks/fingerly")
  @HttpCode(204)
  webhook(
    @Req() req: RawBodyRequest<{ headers: unknown }>,
    @Headers("x-fingerly-timestamp") timestamp: string | undefined,
    @Headers("x-fingerly-signature") signature: string | undefined,
  ) {
    const valid = Fingerly.verifyWebhook({
      secret: process.env.FINGERLY_WEBHOOK_SECRET!,
      payload: req.rawBody ?? "",
      timestamp,
      signature,
    });
    if (!valid) throw new UnauthorizedException();
  }
}
```

### Other frameworks

`Fingerly.createProxy(options)` returns `(request: Request) => Promise<Response>`
for any framework built on Fetch requests; pass `path` where the framework does
not already route only that path to it. `Fingerly.createNodeProxy(options)`
returns `(req, res, next?)` middleware for anything built on `node:http`. Both
are also available as `new FingerlyProxy(options).handle` and `.handleNode`.

The proxy reports itself upstream as `node/0.1.1`, which the dashboard shows
per proxy. `secretKey` remains a deprecated proxy option; do not pass it
together with `proxyKey`.

## Development

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm contract:check
pnpm test:package
```

The vendored synthetic contract snapshot makes tests independent of sibling
repositories. To update it from the integration workspace, set
`FINGERLY_CONTRACT_DIR` to its `contract` directory and run `pnpm contract:sync`.
Generated files record source provenance and checks verify their hashes and
TypeScript output. Never put production secrets in fixtures.

`pnpm test:package` packs the release artifact, installs it, imports it as ESM
and CommonJS, and type-checks it under every TypeScript module resolution. CI
runs everything on Node 18, 20, 22 and 24.

## Source structure

`client.ts` composes the public `Fingerly` class. `events.ts` owns event reads
and the list filters; `transport.ts` owns authenticated HTTP and API errors.
`proxy.ts` handles the proxy path, headers and failures, and `node.ts` adapts
Node servers to it. `body.ts` reads bodies under a size cap. `webhooks.ts`
verifies signatures. `config.ts` validates caller-supplied options. Shared
public types, errors, redaction and cancellation helpers live in `types.ts`,
`errors.ts`, `redact.ts` and `deadline.ts`. `index.ts` only exposes the public
API. `load()`, `createProxy()`, `createNodeProxy()` and `verifyWebhook()` are
also exported as functions; `load(options)` returns a `Fingerly` instance.
