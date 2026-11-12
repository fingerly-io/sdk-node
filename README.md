<p align="center">
  <a href="https://fingerly.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/logo-dark.svg">
      <img src="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/logo-light.svg" alt="Fingerly" height="44">
    </picture>
  </a>
</p>

<p align="center"><b>Fingerly for Node.js</b><br>Read events, verify webhooks and serve a first-party proxy from your Node.js backend, with no runtime dependencies.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fingerly/node"><img src="https://img.shields.io/npm/v/@fingerly/node?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/fingerly-io/sdk-node/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/fingerly-io/sdk-node/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
  <img src="https://img.shields.io/badge/node-18.16%2B-blue?style=flat-square" alt="Node.js 18.16 or newer">
  <a href="https://github.com/fingerly-io/sdk-node/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="Apache-2.0 licence"></a>
  <a href="https://docs.fingerly.io/docs/sdks/node"><img src="https://img.shields.io/badge/docs-docs.fingerly.io-blue?style=flat-square" alt="Documentation"></a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/banner.webp" alt="Fingerly" width="100%"></p>

## What is this

`@fingerly/node` is the server-side Node.js package for [Fingerly](https://fingerly.io), which identifies the device behind every web and app session and scores how suspicious it is. Use it to protect signups, logins and payments: read the event the browser SDK produced with a server-only secret key, verify webhook signatures, and serve the browser SDK from a path on your own site with a same-origin proxy.

Node.js 18.16 or newer. No runtime dependencies.

## Getting started

**1. Prerequisites.** A Fingerly account and a secret key (see [API keys and environments](https://docs.fingerly.io/docs/api-keys)). A webhook signing secret to verify webhooks, and a proxy key (see [Proxy integrations](https://docs.fingerly.io/docs/proxy-integrations)) for the proxy.

**2. Install.**

```sh
npm install @fingerly/node
```

**3. Read an event.**

```ts
import { Fingerly } from "@fingerly/node";

const fingerly = new Fingerly({ secretKey: process.env.FINGERLY_SECRET_KEY });

const page = await fingerly.events.list({ limit: 50, level: "high" });
const event = await fingerly.events.get(requestId);
```

**4. Verify a webhook.**

```ts
const valid = Fingerly.verifyWebhook({
  secret: process.env.FINGERLY_WEBHOOK_SECRET!,
  payload: rawBody, // the exact bytes received, as a Buffer, Uint8Array or string
  timestamp: request.headers.get("x-fingerly-timestamp"),
  signature: request.headers.get("x-fingerly-signature"),
});
```

Full documentation: [docs.fingerly.io/docs/sdks/node](https://docs.fingerly.io/docs/sdks/node).

## Choose what you need

| I want to | Go to |
| --- | --- |
| Read an event, or verify a backend action | [Read events](#read-events) |
| Check a webhook signature | [Verify webhooks](#verify-webhooks) |
| Keep identification working behind content blockers | [First-party proxy](#first-party-proxy) |
| Mount the proxy in Next.js, Express, NestJS, Fastify, Koa or Hono | [Frameworks](#frameworks) |

## Contents

- [Read events](#read-events)
- [Verify a backend action](#verify-a-backend-action)
- [Verify webhooks](#verify-webhooks)
- [First-party proxy](#first-party-proxy)
- [Frameworks](#frameworks)
- [Development](#development)
- [Requirements](#requirements)
- [Documentation](#documentation)
- [Help](#help)
- [Licence](#licence)

## Read events

Create the client once and reuse it. Event reads need a `fly_sk_{production|staging|development}_…` key. The key is checked on the first request, not when the client is created, so a build that runs without secrets can still load the module; a public, proxy, malformed or missing key makes that request reject with a `TypeError` before any network access. Requests go to `https://api.fingerly.io`; `endpoint` overrides that for a local API, and `apiVersion` selects a route version (`v1` by default).

A 404 from `get` carries one of two codes:

| Code | Meaning |
| --- | --- |
| `event_pending` (`error.isPending` is `true`) | The request id was accepted but its event is not recorded yet. It is not a verdict. Try again after `error.retryAfter` seconds, or verify asynchronously, for example from a webhook. |
| `event_not_found` | The request id was never issued for this key's environment, or the event is past the 30-day retention. |

`suspect_score: null` means unscored and must not be treated as zero. The archived `document` arrives moments after the event: check `has_document` rather than assuming.

`get` and `list` each make one request and never retry. One deadline (`timeoutMs`, 5000 by default) covers connecting, the response and its body. Both accept an `AbortSignal` (`list` through its options) and keep the caller's abort reason. Redirects are never followed. Failures are always one of these:

| Error | When | Carries |
| --- | --- | --- |
| `FingerlyAPIError` | any non-2xx answer, redirects included, or a 2xx that is not JSON or exceeds 4 MiB (`code` `invalid_response` or `response_too_large`) | `status`, `code`, `details`, `requestId`, `retryAfter` (seconds, or `null`) |
| `FingerlyTimeoutError` | the deadline passed | |
| `FingerlyConnectionError` | the API could not be reached or the connection dropped mid-response; `FingerlyTimeoutError` is a kind of it | `cause` |

Error messages never quote a response body or a key. `console.log(fingerly)` and `JSON.stringify(fingerly)` show `[redacted]` in place of the key. `instanceof` works even when an app loads both the ESM and the CommonJS build.

```ts
import { FingerlyAPIError, FingerlyConnectionError } from "@fingerly/node";

try {
  await fingerly.events.get(requestId);
} catch (error) {
  if (error instanceof FingerlyAPIError && error.isPending)
    console.log(`not recorded yet, retry in ${error.retryAfter ?? 2} s`);
  else if (error instanceof FingerlyAPIError && error.status === 429)
    console.log(`retry in ${error.retryAfter ?? 1} s`);
  else if (error instanceof FingerlyConnectionError) console.log("unreachable");
  else throw error;
}
```

## Verify a backend action

Read the event with a server-only key. Check that its tag matches your action, that it is recent, that its environment is correct, and that it was scored. Apply your own policy to the server's verdict. Do not authorize an action using scores or visitor identifiers supplied by the browser. Tags correlate events; they do not replace your application's authentication or replay protection. Never put a personal identifier (user ID, email, install ID, advertising ID) in a tag: the server keeps tag values in long-lived rollups. An `event_pending` error means the server has not decided yet: retry after `retryAfter` seconds or verify asynchronously, and do not refuse the action as fraud on that answer alone.

`project_id` on an event from `events.get`, and on every row from `events.list`, is the Fingerly project the event belongs to. It is absent when an older server does not send it.

## Verify webhooks

The example under [Getting started](#getting-started) calls `Fingerly.verifyWebhook`.

Verify the exact raw bytes before JSON parsing: re-serialising parsed JSON changes the digest. Signatures cover the timestamp and body, and the default replay tolerance is 300 seconds. During a signing-secret rotation any one of the first 32 comma-separated signatures may match. Verification does not deduplicate, so persist processed webhook ids. The [framework guides](#frameworks) show where each framework keeps the raw body.

The `identification.completed` and `visitor.suspect` payloads carry `data.project_id`, the project the event belongs to; `identification.refused` carries it only when the refused request named a known key. The SDK verifies signatures only and does not model payload fields.

## First-party proxy

The proxy serves the browser SDK from a path on your own site, which is what gets it past content blockers. Create a proxy in the dashboard (**Integration > Proxy keys**), mount the handler at the exact path it issued, and point the browser SDK at that path with `endpoints: "/k7x2qm4a"`.

The proxy forwards to Fingerly's one ingest URL with the browser's public key, your proxy key and the visitor's address. It never forwards cookies or authorization headers. It relays back only `content-type`, `x-request-id` and the rate limit headers (`retry-after` included), so nothing on the response names Fingerly, and marks every response `no-store`. It answers:

| Status | When |
| --- | --- |
| **404** | Any path but the issued one: no prefix, trailing or doubled slash, dot segment or encoded character, and case-sensitive. A Fetch route sees the URL after the runtime resolved dot segments, so only the Node handler can refuse those; the raw path never reaches anything but ingest either way. |
| **401** | The browser's public key is missing or for another environment. Answered without calling upstream. |
| **405** | Anything but `POST`. Answered without calling upstream. |
| **413** | Bodies over 1 MiB (`maxBodyBytes`). Answered without calling upstream. |
| **504** | The exchange takes longer than `timeoutMs` (5000 by default). |
| **502** | The upstream is unreachable, resets, or answers more than 4 MiB. |
| **500** | The proxy is misconfigured, with a one-line message: the proxy key is missing or invalid, or `clientIp` returned anything but one IP address. This is logged once per process, not per request. |

The handler never throws, so your framework never turns an outage into a 500 with a stack trace. Each failure is one line on `console.error`, or passed to `onError` if you give one.

When the visitor disconnects, the upstream call is cancelled and nothing is logged. The proxy key, like the secret key, is checked on the first request, so a build without secrets can load the route module.

The proxy reports itself upstream as `node/0.2.0`, which the dashboard shows per proxy.

<details>
<summary>Proxy options</summary>

| Option | Meaning |
| --- | --- |
| `proxyKey` | The proxy key from the dashboard. Checked on the first request, so it may be unset while a build loads the route module. |
| `path` | The path the dashboard issued, such as `/k7x2qm4a`, matched exactly. Omit it where the framework already routes only that path to the handler, as a Next.js `app/k7x2qm4a/route.ts` does. |
| `clientIp(request, peer)` | Returns the visitor's address. See [The visitor's address](#the-visitors-address). |
| `maxBodyBytes` | Request body limit; larger requests get 413. 1 MiB by default. |
| `timeoutMs` | Deadline covering the body read, IP lookup and upstream call. 5000 by default. |
| `onError` | Receives one concise line per failure, for your own logger. Without it failures go to `console.error`. |
| `apiVersion` | API route version forwarded upstream. `v1` by default. |
| `upstream` | Overrides the upstream origin implied by the key. |
| `fetchImpl` | Replacement `fetch` for the upstream call. |

</details>

### The visitor's address

`clientIp(request, peer)` must return exactly one IPv4 or IPv6 address. Take it from the header your CDN or load balancer sets, and otherwise from `peer.remoteAddress`, the TCP peer, where the server exposes it (the Node handler below does; a Fetch route handler cannot). Trust that header only when traffic can reach your app solely through that CDN or load balancer, since anyone else can send it. `null`, an empty string, a comma-separated list or anything else is a configuration error: the request is answered 500 without calling upstream.

## Frameworks

`Fingerly.createProxy(options)` returns `(request: Request) => Promise<Response>` for any framework built on Fetch requests; pass `path` where the framework does not already route only that path to it. `Fingerly.createNodeProxy(options)` returns `(req, res, next?)` middleware for anything built on `node:http`. Both are also available as `new FingerlyProxy(options).handle` and `.handleNode`.

| Framework | Handler | Mount |
| --- | --- | --- |
| [Next.js (App Router)](#nextjs-app-router) | `createProxy` | `export const POST` in the route file for the issued path |
| [Express](#express) | `createNodeProxy` | `app.use`, before any body parser |
| [NestJS](#nestjs) | `createNodeProxy` | `app.use` before `listen()`, with `rawBody: true` |
| [Other frameworks](#other-frameworks) (Fastify, Koa, Hono) | either | Before anything reads the body |

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

Route handlers do not see the TCP peer, so the address has to come from a header your infrastructure sets. Next.js fills `X-Forwarded-For` only when the request did not already carry one, so do not trust it unless your load balancer overwrites it. A webhook route reads the raw bytes with `new Uint8Array(await request.arrayBuffer())`.

Next.js middleware can use the Fetch handler only on the Node runtime: `export const config = { runtime: "nodejs" }` on Next.js 15.5 or later, or `proxy.ts` on Next.js 16. The default Edge runtime has no `node:net` or `node:crypto`.

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

The handler answers only its path and calls `next()` for every other request, so it can be mounted globally. Mounted after a body parser that consumed the stream, it answers 500 and logs why once.

### NestJS

The same Node handler, registered with `app.use()` before `listen()`, which is when NestJS adds its body parsers. `rawBody: true` keeps the raw bytes for webhooks. With the Express adapter:

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

With the Fastify adapter, only the factory call changes; NestJS runs `app.use` middleware before Fastify parses the body:

```ts
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
  { rawBody: true },
);
```

<details>
<summary>Reading events and verifying webhooks from a controller, for either adapter</summary>

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

</details>

### Other frameworks

The Node handler has to run before anything reads the body. In these snippets, `proxy` is the handler you built with `Fingerly.createNodeProxy(options)` (Fastify, Koa) or `Fingerly.createProxy(options)` (the Hono line, which passes it a Fetch `Request`):

```ts
// Fastify: in an onRequest hook, which runs before body parsing.
app.addHook("onRequest", (req, reply, done) => {
  proxy(req.raw, reply.raw, done);
});

// Koa
app.use((ctx, next) => proxy(ctx.req, ctx.res, next));

// Hono on Node: the Fetch handler, or the Node handler where you want the
// TCP peer, returning RESPONSE_ALREADY_SENT from @hono/node-server afterwards.
app.post("/k7x2qm4a", (c) => proxy(c.req.raw));
```

## Development

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm contract:check
pnpm test:package
```

The vendored synthetic contract snapshot makes tests independent of sibling repositories. To update it from the integration workspace, set `FINGERLY_CONTRACT_DIR` to its `contract` directory and run `pnpm contract:sync`. Generated files record source provenance and checks verify their hashes and TypeScript output. Never put production secrets in fixtures.

`pnpm test:package` packs the release artifact, installs it, imports it as ESM and CommonJS, and type-checks it under every TypeScript module resolution. CI runs everything on Node 18, 20, 22 and 24.

<details>
<summary>Source structure</summary>

`client.ts` composes the public `Fingerly` class. `events.ts` owns event reads and the list filters; `transport.ts` owns authenticated HTTP and API errors. `proxy.ts` handles the proxy path, headers and failures, and `node.ts` adapts Node servers to it. `body.ts` reads bodies under a size cap. `webhooks.ts` verifies signatures. `config.ts` validates caller-supplied options. Shared public types, errors, redaction and cancellation helpers live in `types.ts`, `errors.ts`, `redact.ts` and `deadline.ts`. `index.ts` only exposes the public API. `load()`, `createProxy()`, `createNodeProxy()` and `verifyWebhook()` are also exported as functions; `load(options)` returns a `Fingerly` instance.

</details>

## Requirements

- Node.js 18.16 or newer (`engines.node` is `>=18.16`; CI runs Node 18, 20, 22 and 24).
- No runtime dependencies. The package ships both an ESM and a CommonJS build with types.

## Documentation

- [Node.js SDK guide](https://docs.fingerly.io/docs/sdks/node)
- [Reading events](https://docs.fingerly.io/docs/reading-events) and [Webhooks](https://docs.fingerly.io/docs/webhooks)
- [Proxy integrations](https://docs.fingerly.io/docs/proxy-integrations)
- [API reference](https://docs.fingerly.io/reference/overview)

## Help

Open an issue on this repository, or write to [support@fingerly.io](mailto:support@fingerly.io). Security issues: [security@fingerly.io](mailto:security@fingerly.io).

## Licence

Apache-2.0. See [LICENSE](https://github.com/fingerly-io/sdk-node/blob/main/LICENSE).
