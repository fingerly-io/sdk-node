<p align="center">
  <a href="https://fingerly.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/logo-dark.svg">
      <img src="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/logo-light.svg" alt="Fingerly" height="44">
    </picture>
  </a>
</p>

<p align="center"><b>Fingerly for Node.js</b><br>Read and verify events, verify webhooks and serve a first-party proxy for browser and native client SDKs from your Node.js backend, with no runtime dependencies.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fingerly/node"><img src="https://img.shields.io/npm/v/@fingerly/node?style=flat-square" alt="npm version"></a>
  <a href="https://github.com/fingerly-io/sdk-node/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/fingerly-io/sdk-node/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
  <img src="https://img.shields.io/badge/node-18.16%2B-blue?style=flat-square" alt="Node.js 18.16 or newer">
  <a href="https://github.com/fingerly-io/sdk-node/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square" alt="Apache-2.0 licence"></a>
  <a href="https://docs.fingerly.io/docs/sdks/node"><img src="https://img.shields.io/badge/docs-docs.fingerly.io-blue?style=flat-square" alt="Documentation"></a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/fingerly-io/.github/main/assets/banner.webp" alt="Fingerly" width="100%"></p>

## What is this

`@fingerly/node` is the server-side Node.js package for [Fingerly](https://fingerly.io), which identifies the device behind every web and app session and scores how suspicious it is. Use it to protect signups, logins and payments: read and verify the event a client SDK produced with a server-only secret key, spend iOS DeviceCheck bits, verify webhook signatures, report the pages your server served so AI crawlers that never run JavaScript are seen, and relay browser and native client SDK traffic from a path on your own site with a first-party proxy.

Node.js 18.16 or newer. No runtime dependencies.

## Getting started

**1. Prerequisites.** A Fingerly account and a secret key (see [API keys and environments](https://docs.fingerly.io/docs/api-keys)). A webhook signing secret to verify webhooks, and a proxy key (see [Proxy integrations](https://docs.fingerly.io/docs/proxy-integrations)) for the proxy.

**2. Install.**

```sh
npm install @fingerly/node@^0.4.1
```

**3. Read an event.**

```ts
import { Fingerly, SuspectLevel } from "@fingerly/node";

const fingerly = new Fingerly({ secretKey: process.env.FINGERLY_SECRET_KEY });

const page = await fingerly.events.list({ limit: 50, level: SuspectLevel.High });
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
| Read an event | [Read events](#read-events) |
| Check and consume a request id before a backend action | [Verify a backend action](#verify-a-backend-action) |
| Run a once-per-device check on iOS | [DeviceCheck bits on iOS](#devicecheck-bits-on-ios) |
| Check a webhook signature | [Verify webhooks](#verify-webhooks) |
| Keep identification working behind content blockers | [First-party proxy](#first-party-proxy) |
| See AI crawlers that never run JavaScript | [Agent sightings](#agent-sightings) |
| Mount the proxy in Next.js, Express, NestJS, Fastify, Koa or Hono | [Frameworks](#frameworks) |

## Contents

- [Read events](#read-events)
- [Verify a backend action](#verify-a-backend-action)
- [DeviceCheck bits on iOS](#devicecheck-bits-on-ios)
- [Verify webhooks](#verify-webhooks)
- [First-party proxy](#first-party-proxy)
- [Agent sightings](#agent-sightings)
- [Frameworks](#frameworks)
- [Development](#development)
- [Requirements](#requirements)
- [Documentation](#documentation)
- [Help](#help)
- [Licence](#licence)

## Read events

Create the client once and reuse it. Event reads need a `fly_sk_{production|staging|development}_…` key. The key is checked on the first request, not when the client is created, so a build that runs without secrets can still load the module; a public, proxy, malformed or missing key makes that request reject with a `TypeError` before any network access. Requests go to `https://api.fingerly.io`; `endpoint` overrides that, and `apiVersion` selects a route version (`v1` by default). `endpoint` must be a bare HTTPS origin, `https://host` or `https://host:port`: a path, query, fragment, credentials, whitespace or control byte throws when the client is created, and the error never repeats the value. Plain `http://` is refused, except for `127.0.0.1`, `localhost` or `[::1]` when you also pass `allowInsecureLoopback: true` for a local development API.

A 404 from `get` carries one of two codes:

| Code | Meaning |
| --- | --- |
| `event_pending` (`error.isPending` is `true`) | The request id was accepted but its event is not recorded yet. It is not a verdict. Try again after `error.retryAfter` seconds, or verify asynchronously, for example from a webhook. |
| `event_not_found` | The request id was never issued for this key's environment, or the event is past the 30-day retention. |

`suspect_score: null` means unscored and must not be treated as zero. When a submission is unidentifiable (`event.identifiable === false`, such as insufficient entropy, a genuine embedded WebView, or an unmatched high-risk Web payload), `event.visitor_id` is `""` rather than a minted identifier. There are no `deferred_token`, `deferred_signals` or `supplements` fields on `v: 3` responses.

The archived `document` (`EventDocument | null`, including platform-neutral `attestation: Attestation` and `risk.triggers`) arrives moments after the event: check `has_document` rather than assuming. `EventTrigger.signal` is typed as `SignalName`, including the `v: 3` anti-spoofing and integrity signals `"attestation_failed"`, `"attestation_downgrade"`, `"device_inconsistent"`, `"report_incomplete"`, `"probe_errors"`, `"fetch_metadata_missing"`, `"web_ticket_missing"`, `"web_ticket_invalid"`, `"tampering"`, `"custom_root_ca"` and `"secondary_user_profile"`. Event `triggers` carry signal groups, such as `vpn`; `document.risk.triggers` carry the raw signals behind them, such as `vpn_public`. A native `attestation` also carries `attest_skipped` (the app's reason for sending no proof) and `downgrade` (the report named an install an attested device owns).

`event.visitor_kind` says what sort of client made the request (`VisitorKind`). When it is `VisitorKind.AiBot`, `event.ai` (`AIAgent`) names the agent: `name` and `provider` (open strings, such as `ChatGPT-User` and `OpenAI`), `purpose` (`AIPurpose`), `runtime` (`AIRuntime`), `declared`, and `verification` with `method` (`AIVerificationMethod`) and `result` (`AIVerificationResult`). On every other event `ai` is absent. The identity comes from the user agent, which any client can copy, and is not verified yet: `verification` is `none` / `not_attempted`. Only clients that run the browser SDK produce events, so a crawler that does not run JavaScript never appears. `list` narrows by `kind`, `aiProvider` (exact and case sensitive, as events name it) and `aiPurpose`, next to `visitor` and `level`:

```ts
import { AIPurpose, VisitorKind } from "@fingerly/node";

const page = await fingerly.events.list({
  kind: VisitorKind.AiBot,
  aiPurpose: AIPurpose.UserFetch,
});
for (const event of page.rows) console.log(event.ai?.provider, event.ai?.name);
```

Every closed set of values has a runtime constant with a same-named type: `Signal`, `SuspectLevel`, `Confidence`, `EventState`, `Platform`, `Environment`, `AnonymityNetwork`, `DeviceKind`, `VisitorKind`, `AIPurpose`, `AIRuntime`, `AIVerificationMethod`, `AIVerificationResult`, `AttestationState`, `AttestationStatus`, `AttestSkippedReason`, `VerifyReason`, `DeviceCheckErrorCode`, `WebhookEventType` and `ProxyFailureKind`. A member is its value in PascalCase, word by word (`Signal.FingerprintSuppressed` is `"fingerprint_suppressed"`). Fields the server fills are typed open, such as `SuspectLevel | (string & {})`, so comparing with the constant or with the string both compile, and a value a newer server adds still reaches your code.

```ts
import { Signal, SuspectLevel } from "@fingerly/node";

const event = await fingerly.events.get(requestId);
if (event.suspect_level === SuspectLevel.High) {
  // Hold for review.
}
const signals = event.triggers.map((trigger) => trigger.signal);
if (signals.includes(Signal.FingerprintSuppressed)) {
  // The report was too thin to identify anyone.
}
```

`get` and `list` each make one request and never retry. One deadline (`timeoutMs`, 5000 by default) covers connecting, the response and its body. Both accept an `AbortSignal` (`list` through its options) and keep the caller's abort reason. Redirects are never followed. Failures are always one of these:

| Error | When | Carries |
| --- | --- | --- |
| `FingerlyAPIError` | any non-2xx answer, redirects included, or a 2xx that is not JSON or exceeds 4 MiB (`code` `invalid_response` or `response_too_large`) | `status`, `code`, `details`, `requestId`, `retryAfter` (seconds, or `null`), `rateLimitScope` (which limit refused a `429`, such as `daily`, or `null`) |
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

A `requestId` posted by the browser is untrusted input until your backend verifies it. `fingerly.events.verify` reads the event with the server-only key and checks it, in this order, stopping at the first failure:

| `reason` | The event is refused when |
| --- | --- |
| `not_found` | no event exists for the request id (`404 event_not_found`) |
| `too_old` | `occurred_at` is more than `maxAgeSeconds` ago (300 by default), or is missing or unreadable |
| `tag_mismatch` | you passed `tag` and the event's `tag` is not exactly that value |
| `unidentifiable` | `visitor_id` is `""` |
| `unscored` | `suspect_score` is `null` |
| `already_consumed` | an earlier call consumed the event |

When every other check passes, `verify` consumes the event as its last step (`POST /api/v1/events/{request_id}/consume`), so one event backs one decision and a replayed `requestId` answers `already_consumed`. Pass `consume: false` to check without consuming. `ok` is true and `reason` is `""` (`VerifyReason.Ok`) only when every check passed. `event` is the event read, `null` only for `not_found`.

`verify` never judges the score: apply your own policy to the event once `ok` is true. Do not authorize an action using scores or visitor identifiers supplied by the browser. Tags correlate events; they do not replace your application's authentication. Never put a personal identifier (user ID, email, install ID, advertising ID) in a tag: the server keeps tag values in long-lived rollups. See [server-side verification](https://docs.fingerly.io/docs/server-side-verification).

```ts
import { Signal, SuspectLevel, VerifyReason } from "@fingerly/node";

const { ok, reason, event } = await fingerly.events.verify(requestId, {
  maxAgeSeconds: 120,
  tag: "signup",
});
if (!ok) {
  // reason: not_found, too_old, tag_mismatch, unidentifiable, unscored or
  // already_consumed. Step up or review.
  if (reason === VerifyReason.AlreadyConsumed) console.log("replayed request id");
} else if (event!.suspect_level !== SuspectLevel.Low) {
  // Your policy: step up or review anything but a low score.
} else if (event!.triggers.some((t) => t.signal === Signal.AttestationFailed)) {
  // Hardware attestation failed cryptographic or ownership verification.
}
```

`404 event_pending` is thrown rather than turned into a reason: the server has not decided yet. Retry after `retryAfter` seconds or verify asynchronously, and do not refuse the action as fraud on that answer alone. Any other failure is thrown as it would be from `events.get`, and nothing is consumed.

`fingerly.events.consume(requestId)` consumes an event directly. The first call answers `{ request_id, consumed_at, first: true }`; any later one throws `FingerlyEventAlreadyConsumedError` (a kind of `FingerlyAPIError`, `status` 409, `code` `event_already_consumed`) whose `consumedAt` says when. It is one request and never retried.

`project_id` on an event from `events.get`, and on every row from `events.list`, is the Fingerly project the event belongs to. It is absent when an older server does not send it.

## DeviceCheck bits on iOS

When DeviceCheck is turned on for your project's Apple key, an iOS identification holds an Apple DeviceCheck token for one hour. The token pays for exactly one Apple call: `fingerly.deviceCheck.query` reads the device's two bits, `fingerly.deviceCheck.write` sets them, never both. Apple treats a token as single-use, so a "check, then mark" flow such as a once-per-device free trial spends two identifications:

1. On the identification that asks for the trial, query the bits.
2. If they say the device had one, refuse. Otherwise grant the trial and record
   the grant in your own data; until the bit is written, that record is what
   stops a second trial.
3. On the next identification from that install, write the bit.

```ts
// bit0 means "this device has had a free trial". The meaning is yours.
const bits = await fingerly.deviceCheck.query(trialRequestId);
if (bits.found && bits.bit0) return "offer-paid-plan";
await trials.grant({ accountId, deviceMarked: false });

// Later, with the request ID of the app's next identification:
await fingerly.deviceCheck.write(markRequestId, { bit0: true });
await trials.update(accountId, { deviceMarked: true });
```

Errors are `FingerlyAPIError` with a `DeviceCheckErrorCode` in `code` (compare with the `DeviceCheckErrorCode` constant, such as `DeviceCheckErrorCode.DeviceCheckNotHeld`): `device_check_not_held` (404, no token: decide without the bits), `device_check_spent`, `device_check_busy`, `credential_unavailable` (409), `bits_required`, `apple_rejected` (422, Apple's HTTP status in `appleStatus`) and `device_check_unavailable` (503). A write naming no bit is refused with a `TypeError` before anything is sent.

After a `503` or a transport failure the SDK resends the identical request, twice at most. A token kept after such an answer accepts only the request it was first used for: retry with the same method and bits, or the API answers `device_check_spent`.

## Verify webhooks

The example under [Getting started](#getting-started) calls `Fingerly.verifyWebhook`.

Verify the exact raw bytes before JSON parsing: re-serialising parsed JSON changes the digest. Signatures cover the timestamp and body, and the default replay tolerance is 300 seconds. During a signing-secret rotation any one of the first 32 comma-separated signatures may match. Verification does not deduplicate, so persist processed webhook ids. The [framework guides](#frameworks) show where each framework keeps the raw body.

The `identification.completed` and `visitor.suspect` payloads carry `data.project_id`, the project the event belongs to, and `data.visitor_id` (`""` when `data.identifiable === false`); `identification.refused` carries `data.project_id` only when the refused request named a known key. The SDK verifies signatures only and does not model payload fields. After verifying, branch on the payload's `type` with `WebhookEventType`: `IdentificationCompleted`, `IdentificationRefused`, `VisitorSuspect`, `BillingStatusChanged`, `UsageDailySettled`, and `WebhookTest` for a test delivery you asked the dashboard for.

```ts
import { WebhookEventType } from "@fingerly/node";

if (!valid) return new Response(null, { status: 400 });
const delivery = JSON.parse(Buffer.from(rawBody).toString("utf8"));
if (delivery.type === WebhookEventType.VisitorSuspect) {
  // Review data.visitor_id.
}
```

## First-party proxy

The proxy relays browser and native client SDK requests from a path on your own site, getting browser calls past content blockers and keeping native traffic on your own domain. Create a proxy in the dashboard (**Integration > Proxy keys**), mount the handler at the exact path it issued, and point the client SDK at that path with `endpoints: "/k7x2qm4a"`.

Client SDKs send a single `POST` identification envelope to that path, and the proxy forwards the raw request body bytes verbatim (never JSON-decoded or re-serialized, and with no `/supplement` subpath) to `https://api.fingerly.io/api/v1/ingest` (`apiVersion` and `upstream` override the route version and upstream origin), with your proxy key and the visitor's address. Incoming headers follow the `v: 3` sanitize-and-restore sequence:

1. Captures `X-Fingerly-SDK-Platform` only if it matches an exact lowercase
   native or bridge platform (`ios`, `android`, `react-native`,
   `react-native-ios`, `react-native-android`, `flutter`, `flutter-ios`,
   `flutter-android`, `lynx-ios`, `lynx-android`, `capacitor`,
   `kotlin-multiplatform`).
2. Strips **all** incoming `X-Fingerly-*` headers alongside `Cookie` and
   `Authorization`. A request with an `Origin` is sent upstream as a browser
   request, with `X-Fingerly-Origin` only; without one, the validated
   `X-Fingerly-SDK-Platform` is restored. Never both.
3. Rejects locally with **400** (`missing_origin`) when both `Origin` and a
   validated `X-Fingerly-SDK-Platform` are absent, and never synthesizes
   `X-Fingerly-Origin` from `Host`, `Referer` or the request URL.
4. Forwards `X-Api-Key`, `Content-Type`, `User-Agent`, `Idempotency-Key`,
   `Sec-Fetch-*` (`Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest`),
   `Sec-CH-UA-*` (`Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform`), the
   Web Bot Auth `Signature`, `Signature-Input` and `Signature-Agent` (each
   dropped when over 4096 bytes) and `X-Fingerly-Host`.

The upstream is checked when the proxy is created and answers are checked before they are relayed:

- Plain `http://` is refused, except for `127.0.0.1`, `localhost` or `[::1]` when you also pass `allowInsecureLoopback: true` for a local development API.
- Redirects are never followed: any `3xx` from upstream, or a response a replacement `fetchImpl` followed to another URL, is answered **502**. A `fetchImpl` you supply must honour `redirect: "manual"`.
- An upstream status outside 200 to 599 is answered **502**.
- `upstream` must be a bare origin, `https://host` or `https://host:port`: a path, query, fragment, credentials, whitespace or control byte throws, and the error never repeats the value.

It relays back only `content-type`, `x-request-id`, `ratelimit-limit`, `ratelimit-remaining` and `retry-after`, so nothing on the response names Fingerly, and marks every response `Cache-Control: no-store`. Pass `allowedOrigins` to accept cross-origin browser `POST` and `OPTIONS` preflight requests. It answers:

| Status | When |
| --- | --- |
| **404** | Any path but the issued one (a `/supplement` subpath included): no prefix, trailing or doubled slash, dot segment or encoded character, and case-sensitive. A Fetch route sees the URL after the runtime resolved dot segments, so only the Node handler can refuse those; the raw path never reaches anything but ingest either way. |
| **400** | `missing_origin`: neither `Origin` nor a validated `X-Fingerly-SDK-Platform` header is present. Answered without calling upstream. |
| **401** | The caller's public key is missing or for another environment. Answered without calling upstream. |
| **405** | Anything but `POST` (and `OPTIONS` when `allowedOrigins` is configured), compared case-sensitively by the Node handler so `post` is refused. Answered without calling upstream. |
| **413** | Bodies over 1 MiB (`maxBodyBytes`). Answered without calling upstream. |
| **504** | The exchange takes longer than `timeoutMs` (5000 by default). |
| **502** | The upstream is unreachable, resets, redirects, answers a status outside 200 to 599, or answers more than 4 MiB. |
| **500** | The proxy is misconfigured, with a one-line message: the proxy key is missing or invalid, or `clientIp` returned anything but one IP address. This is logged once per process, not per request. |

The handler never throws, so your framework never turns an outage into a 500 with a stack trace. Each failure is one line on `console.error`, or passed to `onError` if you give one, whose `failure.kind` is `ProxyFailureKind.Timeout` (504), `ProxyFailureKind.Upstream` (502) or `ProxyFailureKind.Misconfigured` (500). The line names the kind of failure only (`connect`, `tls`, `redirect`, `status`, `too_large` or `other`), never the upstream host, URL or key.

When the visitor disconnects, the upstream call is cancelled and nothing is logged. The proxy key, like the secret key, is checked on the first request, so a build without secrets can load the route module.

The proxy reports itself upstream as `node/0.4.1`, which the dashboard shows per proxy.

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
| `upstream` | Overrides the upstream origin implied by the key. A bare origin, `https://host` or `https://host:port`. |
| `allowInsecureLoopback` | Accepts a plain `http://` upstream on `127.0.0.1`, `localhost` or `[::1]`, for a local development API. `false` by default. |
| `allowedOrigins` | Bare origins whose cross-origin browser `POST` and `OPTIONS` preflight requests are accepted. |
| `fetchImpl` | Replacement `fetch` for the upstream call. Must honour `redirect: "manual"`. |

</details>

### The visitor's address

`clientIp(request, peer)` must return exactly one IPv4 or IPv6 address. Take it from the header your CDN or load balancer sets, and otherwise from `peer.remoteAddress`, the TCP peer, where the server exposes it (the Node handler below does; a Fetch route handler cannot). Trust that header only when traffic can reach your app solely through that CDN or load balancer, since anyone else can send it. `null`, an empty string, a comma-separated list or anything else is a configuration error: the request is answered 500 without calling upstream.

## Agent sightings

Most AI crawlers and fetchers (GPTBot, ClaudeBot and the like) read your pages without running their JavaScript, so the browser SDK never sees them. The agent sightings reporter sees them from your server instead: after each page your server serves, it reports the request to Fingerly as raw input, and Fingerly answers what sent it. The answers appear in the dashboard's AI traffic view and, through `lookup`, in your own code. The reporter decides nothing about a visitor itself: it holds no list of agents or addresses and never filters by user agent.

```ts
import { AIVerificationResult, AgentSightings, Fingerly } from "@fingerly/node";
import express from "express";

const sightings = Fingerly.createAgentSightings({
  secretKey: process.env.FINGERLY_SECRET_KEY,
  // The same callback contract as the proxy: see "The visitor's address".
  clientIp: (request, peer) =>
    request.headers.get("x-real-ip") ?? peer.remoteAddress ?? "",
});

const app = express();
app.use(sightings.handleNode); // before your routes

app.get("/pricing", (req, res) => {
  const answer = sightings.lookupNode(req);
  if (answer === AgentSightings.Unknown) {
    // Nothing known yet: serve as usual.
  } else if (answer.ai?.verification.result === AIVerificationResult.Fail) {
    // The request claims to be an AI agent its operator does not stand behind.
  }
  res.send(renderPricing());
});
```

`handleNode` is `(req, res, next?)` middleware for Express, NestJS and `node:http` (call it at the start of a plain `node:http` handler without `next`). It calls `next` at once and reports the request when its response has finished, so it never delays a response. On a Fetch runtime, call `sightings.report(request, response, peer?)` once you have the response, and `sightings.lookup(request, peer?)` in place of `lookupNode`.

**What is reported.** Every response with a `Content-Type` of `text/html` or `application/xhtml+xml`, and every request for `/robots.txt`, `/llms.txt` or `/llms-full.txt`, whatever the status. `includePaths` adds path prefixes reported whatever their content type, `excludePaths` removes path prefixes (the three files included), and `contentTypes` replaces the media types. Static assets, API routes and health checks are not reported unless you include them.

**What is sent.** The `User-Agent` (a request whose user agent is over 4096 bytes is not reported), the address `clientIp` returned (a request without one is not reported), `Host`, the method, the Web Bot Auth `Signature`, `Signature-Input` and `Signature-Agent` headers when present (each left out when over 4096 bytes), and how many times the same request was seen. Never the path, the query string, cookies, `Authorization`, any other header, the body or the response. None of these fields is ever logged.

**How `lookup` answers.** From memory only: it never waits on the network and never throws. It returns the answer Fingerly gave for the same user agent, address and `Signature-Agent` (`visitor_kind`, `agent`, and `ai` for an AI agent, as on events), or `AgentSightings.Unknown` when there is none yet or it expired. Treat `Unknown` as "serve as usual". A signed request is checked every time, so it is never remembered and always `Unknown` to `lookup`. `lookup` needs `clientIp` to return the address directly; when it returns a promise, `lookup` answers `Unknown` (reports still wait for it).

**Memory.** Answers live in a least-recently-used cache of 4096 entries by default (about 1.5 MB), set with `cacheSize`, never more than 65536 (about 25 MB). Each answer is kept for the time Fingerly said, and all of them are dropped when Fingerly's rules change. At most 1000 requests wait to be reported; past that, new requests are not reported and `sightings.dropped` counts them, while requests already waiting keep counting.

**Reporting.** Repeats of a request are folded into one item with a count, cache hits included, except signed requests, which are each their own item. A background timer, which never keeps the process alive, sends up to 200 requests at a time once 200 are waiting, once they reach 64 KiB, or 2 seconds after the oldest, one report at a time, each with a 5 second deadline. Everything fails open: requests keep being served and `lookup` keeps answering whatever the API does.

| API answer | What the reporter does |
| --- | --- |
| `200` | Remembers each answer for its `ttl`. |
| `429` | Keeps the requests and waits for `Retry-After` (`daily` scope: until the next UTC day) before reporting again. |
| `503`, or the API could not be reached | Keeps the requests and retries after 1 second, doubling up to 60 seconds. |
| `401` / `403` | Drops the requests, pauses for 60 seconds and logs: the key is wrong or revoked. |
| `422`, or any other status | Drops the requests and logs. |
| No answer within the deadline | Drops the requests: Fingerly may have counted them already. |

Problems go to `console.error`, at most once a minute each, or to `onError` with a `ProxyFailureKind`, and never carry a reported field. `sightings.flush()` sends everything waiting now and `sightings.close()` stops the timer and sends what is left; neither rejects. On serverless and edge runtimes, where nothing runs after the invocation ends, call `flush()` before it does, for example `waitUntil(sightings.flush())`.

`fingerly.agents.sightings(items)` is the call underneath: one `POST /api/v1/agents/sightings` with up to 200 items, answered in the same order. It throws `FingerlyAPIError` like the event reads; a `429` carries `retryAfter` and `rateLimitScope`.

<details>
<summary>Agent sightings options</summary>

| Option | Meaning |
| --- | --- |
| `secretKey` | The secret key. Checked on the first report, so it may be unset while a build loads the module. |
| `clientIp(request, peer)` | Returns the visitor's address. See [The visitor's address](#the-visitors-address). |
| `cacheSize` | Answers remembered. 4096 by default, at most 65536. |
| `contentTypes` | Response media types reported. `text/html` and `application/xhtml+xml` by default. |
| `includePaths` | Path prefixes reported whatever their content type. |
| `excludePaths` | Path prefixes never reported. |
| `onError` | Receives one concise line per problem, for your own logger. |
| `endpoint`, `apiVersion`, `allowInsecureLoopback`, `fetchImpl` | As for the client. |

</details>

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

`client.ts` composes the public `Fingerly` class. `events.ts` owns event reads, verification and the list filters, and `device-check.ts` the DeviceCheck spends; `transport.ts` owns authenticated HTTP and API errors. `proxy.ts` handles the proxy path, headers and failures, and `node.ts` adapts Node servers to it. `body.ts` reads bodies under a size cap. `webhooks.ts` verifies signatures. `config.ts` validates caller-supplied options. Shared public types, errors, redaction and cancellation helpers live in `types.ts`, `errors.ts`, `redact.ts` and `deadline.ts`. `index.ts` only exposes the public API. `load()`, `createProxy()`, `createNodeProxy()` and `verifyWebhook()` are also exported as functions; `load(options)` returns a `Fingerly` instance.

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
