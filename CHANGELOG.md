# Changelog

## 0.5.0

- Events name the AI agent behind an `ai_bot` visit as `event.ai`
  (`AIAgent`: `name`, `provider`, `purpose`, `runtime`, `declared` and
  `verification`), with the named values `AIPurpose`, `AIRuntime`,
  `AIVerificationMethod` and `AIVerificationResult`. `fingerly.events.list`
  filters by `kind`, `aiProvider` and `aiPurpose`.
- Added the agent sightings reporter, `Fingerly.createAgentSightings({
  secretKey, clientIp })`. Its `handleNode` middleware (Express, NestJS,
  `node:http`) and `report(request, response)` for Fetch handlers report the
  pages your server served in the background, never delaying a response;
  `lookup` and `lookupNode` answer from memory what Fingerly said about the
  same request, or `AgentSightings.Unknown`. `flush()` and `close()` send
  what is waiting and never reject. `fingerly.agents.sightings(items)` is
  the call underneath.
- The proxy forwards the Web Bot Auth `Signature`, `Signature-Input` and
  `Signature-Agent` headers, each up to 4096 bytes.
- `Signal` names `ai_spoofed` and `identity_obfuscated`; `vpn_timezone` is
  gone, as the server no longer sends it.
- `FingerlyAPIError` carries `rateLimitScope`, such as `daily`, on a `429`.
- A 2xx answer that is not the JSON object the API sends, such as `null`, an
  array, or an event whose `ai` lacks a field, rejects with
  `FingerlyAPIError` `invalid_response` instead of reaching your code, where
  reading a field threw a `TypeError`. An `ai` of `null` reads as absent.
- `lookup` only returns answers of the shape `AgentAnswer` declares, so
  reading `answer.ai.verification.result` never throws.
- `flush()` and `close()` stop once a report fails, so stopping while the
  API is down waits one 5 second deadline, not two.
- After a `429`, the reporter pauses for at most 24 hours, whatever its
  `Retry-After` says.
- `handleNode` reports a page whose headers were passed to
  `res.writeHead(status, headers)`, as plain `node:http` handlers and Fastify
  write them; such pages were never reported.
- A reported request carries its `Host` as received, an HTTP/2
  `:authority` included, and none when the request had none, instead of
  `localhost`.
- An async `onError` hook that rejects, on the proxy or the reporter, no
  longer ends the process with an unhandled rejection.
- The Node proxy forwards the host of an HTTP/2 request, so the API can check
  a Web Bot Auth signature on it.
- The reporter never sends a field the API would refuse the whole report
  over, measured as the API decodes it: a request whose user agent or method
  is over 4096 bytes is not reported, and a `Host` over 4096 bytes is left
  out of its item.
- `VisitorKind.Unknown` names the answer the API gives a reported request it
  could not use: `ttl` 0, so it is never remembered and stays
  `AgentSightings.Unknown` to `lookup`, while the other requests of the
  report are answered as usual. A `422` now means no request in the report
  was usable.
- `contentTypes` refuses an entry that could never match, such as
  `text/html; charset=utf-8`; give the media type alone.
- Every API call sends `User-Agent: fingerly-node/<version>`.
- The README and `DeviceCheckClient` describe one read and one write token
  per identification: a check-then-mark flow reads and writes on the same
  request ID.

## 0.4.1

- `AttestSkippedReason` members describe when a native SDK sends each value.
- The vendored OpenAPI contract declares the enums of every closed string
  field, and the generated types follow it. The public `Event` and
  `EventTrigger` fields stay open, so a value the server adds later still
  type-checks.

## 0.4.0

- Added runtime constants for every fixed string value the API sends:
  `Signal`, `SuspectLevel`, `Confidence`, `AttestationState`,
  `AttestationStatus`, `AttestSkippedReason`, `VerifyReason`,
  `WebhookEventType`, `EventState`, `Platform`, `Environment`,
  `AnonymityNetwork`, `DeviceKind`, `VisitorKind`, `DeviceCheckErrorCode`
  and `ProxyFailureKind`. Each is an `as const` object with a type of the
  same name, so `event.suspect_level === SuspectLevel.High` works. Fields the
  server fills in stay open, so a value added later still type-checks.
- `SignalName` now matches the server: added `repeated_reinstall`,
  `device_activity_high` and `device_activity_very_high`, removed
  `app_attest_key_churn`. `anonymity_network` documents `relay`.
- `AttestationState` and `AttestationStatus` are closed types now; the
  fields that hold them stay open.
- `VerifyResult.reason` is typed as `VerifyReason`; a passed check is
  `VerifyReason.Ok` (`""`).

## 0.3.0

- Added `fingerly.events.verify(requestId, { maxAgeSeconds, tag, consume })`,
  which reads an event and checks that it exists, is recent (300 seconds by
  default), carries the expected `tag`, is identifiable and was scored, then
  consumes it once, answering `{ ok, reason, event }`; and
  `fingerly.events.consume(requestId)`, which throws
  `FingerlyEventAlreadyConsumedError` (`event_already_consumed`, with
  `consumedAt`) after the first call.
- Added `fingerly.deviceCheck.query(requestId)` and
  `fingerly.deviceCheck.write(requestId, { bit0?, bit1? })`, which spend the
  DeviceCheck token held for an iOS event to read or set the device's two
  bits. They retry the identical request after a `503` or a transport
  failure, and `FingerlyAPIError.appleStatus` carries Apple's status on
  `apple_rejected`.
- Refreshed the vendored v3 OpenAPI and contract fixtures, removing retired
  deferred supplement routes and types, and added `EventDocument`,
  `Attestation`, and `SignalName` types covering all v3 signals
  (`attestation_failed`, `attestation_downgrade`, `device_inconsistent`,
  `report_incomplete`, `probe_errors`, `fetch_metadata_missing`,
  `web_ticket_missing`, `web_ticket_invalid`, `tampering`, `custom_root_ca`,
  `secondary_user_profile`), `attest_skipped` and
  `downgrade` on `Attestation`, and empty `visitor_id` (`""`) on
  unidentifiable events.
- Updated `FingerlyProxy` to enforce the single-path `proxy.md` relay contract:
  sanitize-and-restore validation of `x-fingerly-sdk-platform`, rejection with
  HTTP `400` (`missing_origin`) when both `Origin` and a valid
  `x-fingerly-sdk-platform` are absent (never synthesising `x-fingerly-origin`),
  forwarding of `Sec-Fetch-*` and `Sec-CH-UA-*` client metadata headers,
  optional cross-origin CORS `allowedOrigins`, and verbatim raw-byte body
  forwarding.
- `FingerlyProxy` requires `proxyKey`, answers `401` with `no-store` unless
  the caller's `X-Api-Key` is a public key of the proxy key's environment, and
  never sends a secret key upstream.

## 0.2.0

- Events carry `project_id`, the Fingerly project an event belongs to, on
  `events.get` and every `events.list` row; it is absent when the server does
  not send it. Webhook `data` for `identification.completed` and
  `visitor.suspect` (and `identification.refused` when the key was known)
  carries `project_id`.
- Events carry `ip_network` (an IPv4 /24 or IPv6 /40) instead of `ip_address`;
  the API never returns the address. `deferred_signals` is removed. `document`
  is an allow-listed view of the archived submission, without raw signals,
  user agent or address.
- The vendored contract snapshot is refreshed.

## 0.1.4

- The proxy takes `proxyKey` only.

## 0.1.3

- `events.get` refuses an empty request id, `.` and `..` with a `TypeError`
  before sending anything. URL parsing resolved them as dot segments, so they
  read the event list or a route above it with the secret key attached.

## 0.1.2

Fixes from running the SDK in production builds of Express, Fastify, NestJS,
Koa, Hono and Next.js.

- `verifyWebhook` refuses a missing body instead of throwing, which an
  unauthenticated request could turn into a 500.
- A rejected `next()` in the Koa adapter is no longer swallowed.
- Next.js no longer freezes event reads at build time.
- An IPv6 address with a zone id is refused as a client IP.

## 0.1.1

Fixes from testing the SDK inside real Next.js, Express and NestJS apps.

- Keys no longer appear in `console.log`, `util.inspect` or `JSON.stringify`
  output of a client or proxy; they show as `[redacted]`.
- CommonJS TypeScript projects get the CommonJS declarations, so
  `module: node16` (and `nodenext` before TypeScript 5.8) compile.
- Keys are checked on the first request instead of at construction, so
  `next build` and other builds without secrets can load the modules that
  create a client or proxy. `secretKey` and `proxyKey` accept `undefined`.
- The proxy answers upstream trouble itself: 504 for a timeout, 502 for an
  unreachable upstream, a reset, or a response over 4 MiB, with a short
  `text/plain` body. It never throws, and logs one line per failure to
  `console.error` or the new `onError` hook. A disconnected visitor cancels the
  upstream call quietly.
- `clientIp` must return exactly one IPv4 or IPv6 address and now receives the
  TCP peer as a second argument where known. `null` (a missing header), `""`,
  `"null"` and lists answer 500 without calling upstream and are logged once
  per process, instead of being forwarded.
- The proxy path is matched exactly: no trailing or doubled slash, dot
  segment, encoded character or case difference.
- New `createNodeProxy` / `FingerlyProxy#handleNode` middleware for Express,
  NestJS (Express and Fastify adapters) and `node:http`: streams the body,
  passes the peer address, cancels on disconnect, drains a refused upload so
  the 413 arrives, and calls `next()` for other paths.
- Read errors: every non-2xx (redirects included) is a `FingerlyAPIError` with
  `retryAfter`; a non-JSON or over-4 MiB success is `invalid_response` or
  `response_too_large` and is never quoted; network failures are the new
  `FingerlyConnectionError` (`FingerlyTimeoutError` extends it).
- Webhook verification considers at most 32 signatures from one header.
- `events.get` tells a pending event apart: `404 event_pending` (the request id
  was accepted, the event is not recorded yet; `Retry-After` is set) has the new
  `FingerlyAPIError#isPending`, while `event_not_found` still means never issued
  or past retention. Neither is retried. The README no longer says an event is
  readable as soon as identification answers.
- SDK errors match with `instanceof` across the ESM and CommonJS builds.
- The proxy reports itself upstream as `node/0.1.1`.

## 0.1.0

First public release.
