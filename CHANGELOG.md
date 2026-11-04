# Changelog

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
