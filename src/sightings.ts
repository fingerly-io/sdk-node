import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { isIP } from "node:net";
import { AgentsClient } from "./agents.js";
import { decodeAIAgent, isObject } from "./decode.js";
import { ProxyFailureKind } from "./enums.js";
import {
  FingerlyAPIError,
  FingerlyConnectionError,
  FingerlyTimeoutError,
} from "./errors.js";
import { toHeaders } from "./node.js";
import { inspectCustom } from "./redact.js";
import { APITransport } from "./transport.js";
import type {
  AgentAnswer,
  AgentSighting,
  AgentSightingsOptions,
  AgentSightingsResponse,
  NodeNext,
  NodeRequest,
  NodeResponse,
  ProxyFailure,
  ProxyPeer,
} from "./types.js";

/** Answers remembered by default: about 1.5 MB. */
const DEFAULT_CACHE_SIZE = 4096;
/** Answers remembered at most, whatever is configured: about 25 MB. */
const MAX_CACHE_SIZE = 65_536;
/** Requests held for reporting, pending and in flight together. */
const MAX_PENDING = 1000;
/** A report is sent once this many requests are pending, and holds at most this many. */
const FLUSH_ITEMS = 200;
/** A report is sent once the pending fields reach this many bytes, and holds at most this many. */
const FLUSH_BYTES = 65_536;
/** A report is sent this long after its oldest request. */
const FLUSH_AGE_MS = 2_000;
/** Deadline for one report. */
const DEADLINE_MS = 5_000;
/** Longest header reported; the API refuses a longer one. */
const MAX_HEADER_BYTES = 4096;
/** Highest count the API accepts for one item. */
const MAX_COUNT = 1_000_000;
/** Pause after the API refused the key. */
const UNAUTHORIZED_PAUSE_MS = 60_000;
/** Pause after a `429` that did not say how long to wait. */
const RATE_LIMITED_PAUSE_MS = 60_000;
/** Shortest pause after a `429`, whatever its Retry-After says. */
const MIN_RATE_LIMITED_PAUSE_MS = 1_000;
/** Longest pause after a `429`, whatever its Retry-After says: 24 hours. */
const MAX_RATE_LIMITED_PAUSE_MS = 86_400_000;
/** Longest an answer is remembered, whatever its ttl says. */
const MAX_TTL_SECONDS = 86_400;
/** First and longest wait before retrying an unreachable API. */
const BACKOFF_FIRST_MS = 1_000;
const BACKOFF_MAX_MS = 60_000;
/** Each kind of problem is logged at most this often. */
const LOG_INTERVAL_MS = 60_000;
/** How often the background timer checks whether a report is due. */
const TICK_MS = 250;

/** Paths reported whatever their content type or status. */
const ALWAYS_REPORTED = new Set(["/robots.txt", "/llms.txt", "/llms-full.txt"]);
const DEFAULT_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];

/** The answer for a request the reporter has no answer for. */
const UNKNOWN: AgentAnswer = Object.freeze({ ttl: 0, visitor_kind: "" });

/** One header as JSON will carry it, and the bytes it arrived as. */
interface HeaderValue {
  text: string;
  raw: Buffer;
}

/** One request ready to report: its wire fields and cache key. */
interface Capture {
  key: string;
  signed: boolean;
  item: AgentSighting & { count: number };
  bytes: number;
}

/** A request waiting to be reported. */
interface Pending extends Capture {
  /** The pending map's key: the cache key, or a unique one for a signed request. */
  id: string;
  /** When it was first seen, on the reporter's clock. */
  firstSeen: number;
}

/** A remembered answer. */
interface CacheEntry {
  answer: AgentAnswer;
  expiresAt: number;
}

/** What one report did with its batch. */
type Outcome = "sent" | "empty" | "held" | "dropped";

/**
 * Reports the requests your server served, so that AI crawlers and fetchers
 * that never run a page's JavaScript are seen, and answers from what the
 * server said about them.
 *
 * It decides nothing about a visitor: every reported request goes to the
 * API as raw input (user agent, address, host, method and the Web Bot Auth
 * headers, never the path, query, cookies or body), and `lookup` answers from
 * the API's earlier answers, kept in a bounded in-memory cache. Reports are
 * batched and sent in the background; nothing here ever delays a response or
 * throws into your request.
 */
export class AgentSightings {
  /**
   * What `lookup` answers when it has no answer: no `agent`, no `ai`.
   * Compare with `===` and serve the request as usual.
   */
  static readonly Unknown: AgentAnswer = UNKNOWN;

  readonly #agents: AgentsClient;
  readonly #clientIp: AgentSightingsOptions["clientIp"];
  readonly #onError: AgentSightingsOptions["onError"];
  readonly #now: () => number;
  readonly #cacheSize: number;
  readonly #contentTypes: ReadonlySet<string>;
  readonly #include: readonly string[];
  readonly #exclude: readonly string[];

  #cache = new Map<string, CacheEntry>();
  #rulesVersion: string | null = null;
  #pending = new Map<string, Pending>();
  #pendingBytes = 0;
  #inFlight = 0;
  #flight: Promise<Outcome> | null = null;
  #pausedUntil = Number.NEGATIVE_INFINITY;
  #backoffMs = BACKOFF_FIRST_MS;
  #timer: ReturnType<typeof setInterval> | null = null;
  #closing: Promise<void> | null = null;
  #dropped = 0;
  #signedSeq = 0;
  readonly #logged = new Map<string, number>();
  readonly #nodeRequests = new WeakMap<object, Request>();

  /**
   * @param options Secret key, the client IP callback and optional scope and
   *   cache settings. Everything but the key is validated here; the key is
   *   checked on the first report.
   * @throws {TypeError} If an option is invalid.
   */
  constructor(options: AgentSightingsOptions) {
    if (typeof options.clientIp !== "function")
      throw new TypeError("clientIp is required");
    if (options.onError !== undefined && typeof options.onError !== "function")
      throw new TypeError("onError must be a function");
    if (options.now !== undefined && typeof options.now !== "function")
      throw new TypeError("now must be a function");
    const size = options.cacheSize ?? DEFAULT_CACHE_SIZE;
    if (!Number.isSafeInteger(size) || size < 1)
      throw new TypeError("cacheSize must be a positive integer");
    this.#cacheSize = Math.min(size, MAX_CACHE_SIZE);
    this.#contentTypes = new Set(
      stringList(
        options.contentTypes ?? DEFAULT_CONTENT_TYPES,
        "contentTypes",
      ).map((type) => type.trim().toLowerCase()),
    );
    this.#include = pathList(options.includePaths, "includePaths");
    this.#exclude = pathList(options.excludePaths, "excludePaths");
    this.#clientIp = options.clientIp;
    this.#onError = options.onError;
    this.#now = options.now ?? (() => performance.now());
    this.#agents = new AgentsClient(
      new APITransport({
        secretKey: options.secretKey,
        ...(options.apiVersion !== undefined
          ? { apiVersion: options.apiVersion }
          : {}),
        ...(options.endpoint !== undefined
          ? { endpoint: options.endpoint }
          : {}),
        ...(options.allowInsecureLoopback !== undefined
          ? { allowInsecureLoopback: options.allowInsecureLoopback }
          : {}),
        ...(options.fetchImpl !== undefined
          ? { fetchImpl: options.fetchImpl }
          : {}),
        timeoutMs: DEADLINE_MS,
      }),
    );
  }

  /**
   * What the API said about this exact request (user agent, address and
   * `Signature-Agent`), or {@link AgentSightings.Unknown}. Answers from memory
   * only: it never waits, never throws and reports nothing. A signed request
   * is never remembered, so it is always unknown here.
   *
   * @param request The incoming request, as `clientIp` receives it.
   * @param peer The TCP peer, where the server exposes it.
   */
  lookup(request: Request, peer: ProxyPeer = {}): AgentAnswer {
    try {
      const ip = this.#resolveNow(request, peer);
      if (ip === null) return UNKNOWN;
      const captured = capture(request, ip, request.method);
      return captured === null ? UNKNOWN : this.#cached(captured.key);
    } catch {
      return UNKNOWN;
    }
  }

  /**
   * {@link lookup} for a Node `IncomingMessage`, as Express, NestJS and
   * `node:http` pass it. `clientIp` receives the TCP peer address.
   */
  lookupNode(req: NodeRequest): AgentAnswer {
    try {
      return this.lookup(this.#fetchRequestOf(req), peerOf(req));
    } catch {
      return UNKNOWN;
    }
  }

  /**
   * Reports one served request when its response is in scope: an HTML page,
   * `/robots.txt`, `/llms.txt`, `/llms-full.txt`, or what `includePaths`,
   * `excludePaths` and `contentTypes` say. Call it after the response is
   * produced; it only records the request in memory and returns at once.
   *
   * @param request The request served.
   * @param response The response your code produced for it.
   * @param peer The TCP peer, where the server exposes it.
   */
  report(request: Request, response: Response, peer: ProxyPeer = {}): void {
    try {
      if (this.#closing !== null) return;
      const path = new URL(request.url).pathname;
      if (!this.#inScope(path, response.headers.get("content-type"))) return;
      this.#record(request, peer, request.method);
    } catch {
      // Reporting never reaches the customer's request.
    }
  }

  /**
   * Node middleware for Express, NestJS and `node:http`: calls `next` at
   * once and reports the request after its response finished, when it is in
   * scope. Mount it before your routes; without a framework, call it at the
   * start of your handler without `next`. It never throws.
   */
  readonly handleNode = (
    req: NodeRequest,
    res: NodeResponse,
    next?: NodeNext,
  ): void => {
    try {
      if (this.#closing === null) {
        const peer = peerOf(req);
        const response = res as unknown as ServerResponse;
        response.once("finish", () => {
          try {
            this.#reportNode(req, response, peer);
          } catch {
            // Reporting never reaches the customer's request.
          }
        });
      }
    } catch {
      // A response without events is simply not reported.
    }
    if (next) next();
  };

  /**
   * Sends everything pending now, in reports of up to 200 requests, and
   * resolves when done. Call it before a serverless invocation ends, for
   * example in `waitUntil(sightings.flush())`. It stops early once a report
   * fails or while the API asked to wait, so it takes at most one 5 second
   * deadline per report, and never rejects.
   */
  async flush(): Promise<void> {
    try {
      let rounds = this.#pending.size + this.#inFlight + 2;
      while (rounds-- > 0) {
        if (this.#flight !== null) {
          // A report already in flight that failed ends the flush like one
          // of its own: during an outage, close() waits one deadline, not two.
          if ((await this.#flight) !== "sent") return;
          continue;
        }
        const outcome = await this.#flushOnce();
        if (outcome !== "sent" || this.#pending.size === 0) return;
      }
    } catch {
      // flush never rejects.
    }
  }

  /**
   * Stops the background timer, sends what is pending and ignores every
   * later report. `lookup` keeps answering from memory.
   */
  close(): Promise<void> {
    if (this.#closing === null) {
      this.#stopTimer();
      this.#closing = this.flush();
    }
    return this.#closing;
  }

  /**
   * Requests not reported because 1000 were already waiting, since the
   * reporter was created. Their requests were served as usual.
   */
  get dropped(): number {
    return this.#dropped;
  }

  /** What `JSON.stringify` and `console.log` show: settings, never the key. */
  toJSON(): Record<string, unknown> {
    return {
      cacheSize: this.#cacheSize,
      contentTypes: [...this.#contentTypes],
      includePaths: this.#include,
      excludePaths: this.#exclude,
    };
  }

  [inspectCustom](): Record<string, unknown> {
    return this.toJSON();
  }

  /** Reports a Node request whose response just finished. */
  #reportNode(req: NodeRequest, res: ServerResponse, peer: ProxyPeer): void {
    if (this.#closing !== null) return;
    const raw = req as NodeRequest & { originalUrl?: string };
    const path = (raw.originalUrl ?? raw.url ?? "/").split("?", 1)[0]!;
    if (!this.#inScope(path, headerText(res.getHeader("content-type")))) return;
    this.#record(this.#fetchRequestOf(req), peer, req.method ?? "GET");
  }

  /** Whether a response is reported: never decided by the visitor. */
  #inScope(path: string, contentType: string | null): boolean {
    for (const prefix of this.#exclude)
      if (path.startsWith(prefix)) return false;
    if (ALWAYS_REPORTED.has(path)) return true;
    for (const prefix of this.#include)
      if (path.startsWith(prefix)) return true;
    const media = (contentType ?? "").split(";", 1)[0]!.trim().toLowerCase();
    return media !== "" && this.#contentTypes.has(media);
  }

  /** Resolves the address, waiting for an asynchronous callback, then records. */
  #record(request: Request, peer: ProxyPeer, method: string): void {
    let value: unknown;
    try {
      value = this.#clientIp(request, peer);
    } catch {
      return this.#unresolvedIp();
    }
    if (isThenable(value)) {
      value.then(
        (resolved) => this.#recordAt(request, this.#validIp(resolved), method),
        () => this.#unresolvedIp(),
      );
      return;
    }
    this.#recordAt(request, this.#validIp(value), method);
  }

  #recordAt(request: Request, ip: string | null, method: string): void {
    try {
      if (ip === null) return this.#unresolvedIp();
      const captured = capture(request, ip, method);
      if (captured !== null) this.#add(captured);
    } catch {
      // Reporting never reaches the customer's request.
    }
  }

  /** The address for `lookup`, which cannot wait for a promise. */
  #resolveNow(request: Request, peer: ProxyPeer): string | null {
    let value: unknown;
    try {
      value = this.#clientIp(request, peer);
    } catch {
      this.#unresolvedIp();
      return null;
    }
    if (isThenable(value)) {
      value.then(
        () => {},
        () => {},
      );
      this.#warn(
        "client-ip-async",
        ProxyFailureKind.Misconfigured,
        "the client IP callback returned a promise; lookup answers unknown until it returns the address directly",
      );
      return null;
    }
    const ip = this.#validIp(value);
    if (ip === null) this.#unresolvedIp();
    return ip;
  }

  #validIp(value: unknown): string | null {
    return typeof value === "string" ? canonicalIp(value) : null;
  }

  #unresolvedIp(): void {
    this.#warn(
      "client-ip",
      ProxyFailureKind.Misconfigured,
      "the client IP callback returned no valid address; those requests are not reported",
    );
  }

  /** The cached answer for a key, or unknown; a hit becomes most recent. */
  #cached(key: string): AgentAnswer {
    const entry = this.#cache.get(key);
    if (entry === undefined) return UNKNOWN;
    this.#cache.delete(key);
    if (entry.expiresAt <= this.#now()) return UNKNOWN;
    this.#cache.set(key, entry);
    return entry.answer;
  }

  #remember(key: string, answer: AgentAnswer, expiresAt: number): void {
    this.#cache.delete(key);
    this.#cache.set(key, { answer, expiresAt });
    while (this.#cache.size > this.#cacheSize) {
      const oldest = this.#cache.keys().next();
      if (oldest.done) break;
      this.#cache.delete(oldest.value);
    }
  }

  /** Adds one request to the pending reports, folding repeats of a key. */
  #add(captured: Capture): void {
    if (this.#closing !== null) return;
    if (!captured.signed) {
      const existing = this.#pending.get(captured.key);
      if (existing !== undefined) {
        existing.item.count = Math.min(existing.item.count + 1, MAX_COUNT);
        return;
      }
    }
    if (this.#pending.size + this.#inFlight >= MAX_PENDING) {
      this.#dropped++;
      return;
    }
    const id = captured.signed ? `signed:${++this.#signedSeq}` : captured.key;
    this.#pending.set(id, { ...captured, id, firstSeen: this.#now() });
    this.#pendingBytes += captured.bytes;
    this.#startTimer();
    if (
      this.#flight === null &&
      (this.#pending.size >= FLUSH_ITEMS || this.#pendingBytes >= FLUSH_BYTES)
    )
      queueMicrotask(() => void this.#flushOnce().catch(() => {}));
  }

  #startTimer(): void {
    if (this.#timer !== null || this.#closing !== null) return;
    this.#timer = setInterval(() => this.#tick(), TICK_MS);
    // The timer alone never keeps the process alive.
    (this.#timer as { unref?: () => void }).unref?.();
  }

  #stopTimer(): void {
    if (this.#timer !== null) clearInterval(this.#timer);
    this.#timer = null;
  }

  /** The background check: send a report when one is due. */
  #tick(): void {
    if (this.#flight !== null) return;
    if (this.#pending.size === 0) return this.#stopTimer();
    if (this.#due()) void this.#flushOnce().catch(() => {});
  }

  #due(): boolean {
    const oldest = this.#pending.values().next();
    if (oldest.done) return false;
    return (
      this.#pending.size >= FLUSH_ITEMS ||
      this.#pendingBytes >= FLUSH_BYTES ||
      this.#now() - oldest.value.firstSeen >= FLUSH_AGE_MS
    );
  }

  /** Sends one report, unless one is in flight or the API asked to wait. */
  #flushOnce(): Promise<Outcome> {
    if (this.#flight !== null) return this.#flight;
    if (this.#pending.size === 0) return Promise.resolve("empty");
    if (this.#now() < this.#pausedUntil) return Promise.resolve("held");
    const batch = this.#take();
    const flight = this.#send(batch).finally(() => {
      this.#flight = null;
    });
    this.#flight = flight;
    return flight;
  }

  /** Moves the oldest pending requests, at most 200 and 64 KiB, in flight. */
  #take(): Pending[] {
    const batch: Pending[] = [];
    let bytes = 0;
    for (const [id, pending] of this.#pending) {
      if (batch.length >= FLUSH_ITEMS) break;
      if (batch.length > 0 && bytes + pending.bytes > FLUSH_BYTES) break;
      batch.push(pending);
      bytes += pending.bytes;
      this.#pending.delete(id);
    }
    this.#pendingBytes -= bytes;
    this.#inFlight = batch.length;
    return batch;
  }

  async #send(batch: Pending[]): Promise<Outcome> {
    const progress = { responded: false };
    try {
      const answer = await this.#agents.send(
        batch.map((pending) => pending.item),
        { timeoutMs: DEADLINE_MS, progress },
      );
      this.#inFlight = 0;
      return this.#store(batch, answer);
    } catch (error) {
      this.#inFlight = 0;
      return this.#failed(batch, error, progress.responded);
    }
  }

  /** Remembers the answers of a `200`. */
  #store(batch: Pending[], answer: AgentSightingsResponse): Outcome {
    this.#backoffMs = BACKOFF_FIRST_MS;
    if (
      typeof answer !== "object" ||
      answer === null ||
      typeof answer.rules_version !== "string" ||
      !Array.isArray(answer.items) ||
      answer.items.length !== batch.length
    ) {
      this.#warn(
        "answer",
        ProxyFailureKind.Upstream,
        "the API answered a report unusably; its requests were dropped",
      );
      return "dropped";
    }
    if (answer.rules_version !== this.#rulesVersion) {
      this.#cache.clear();
      this.#rulesVersion = answer.rules_version;
    }
    const now = this.#now();
    answer.items.forEach((item: unknown, index) => {
      const decoded = decodeAnswer(item);
      if (decoded === null || !(decoded.ttl > 0)) return;
      this.#remember(
        batch[index]!.key,
        decoded,
        now + Math.min(decoded.ttl, MAX_TTL_SECONDS) * 1000,
      );
    });
    return "sent";
  }

  /** Applies the failure table to a report that did not get a `200`. */
  #failed(batch: Pending[], error: unknown, responded: boolean): Outcome {
    if (error instanceof FingerlyTimeoutError) {
      // The API may have counted it; sending it again would count it twice.
      this.#warn(
        "timeout",
        ProxyFailureKind.Timeout,
        `a report did not complete within ${DEADLINE_MS} ms; its requests were dropped`,
      );
      return "dropped";
    }
    if (error instanceof FingerlyAPIError) {
      const status = error.status;
      if (status >= 200 && status < 300) {
        // Not JSON, not an object or over 4 MiB: the same as a bad answer.
        this.#warn(
          "answer",
          ProxyFailureKind.Upstream,
          "the API answered a report unusably; its requests were dropped",
        );
        return "dropped";
      }
      if (status === 429) {
        this.#restore(batch);
        // An unreadable or negative Retry-After reads as missing; a zero or
        // past one still waits a second, and a far one at most a day.
        this.#pausedUntil =
          this.#now() +
          Math.min(
            MAX_RATE_LIMITED_PAUSE_MS,
            Math.max(
              MIN_RATE_LIMITED_PAUSE_MS,
              error.retryAfter !== null
                ? error.retryAfter * 1000
                : error.rateLimitScope === "daily"
                  ? untilNextUtcDay()
                  : RATE_LIMITED_PAUSE_MS,
            ),
          );
        return "held";
      }
      if (status === 503) return this.#retryLater(batch);
      if (status === 401 || status === 403) return this.#refusedKey(status);
      this.#warn(
        status === 422 ? "invalid" : "status",
        ProxyFailureKind.Upstream,
        `the API refused a report with HTTP ${status}; its requests were dropped`,
      );
      return "dropped";
    }
    if (error instanceof FingerlyConnectionError) {
      if (responded) {
        this.#warn(
          "cut",
          ProxyFailureKind.Upstream,
          "the API's answer to a report was cut off; its requests were dropped",
        );
        return "dropped";
      }
      return this.#retryLater(batch);
    }
    if (error instanceof TypeError) return this.#refusedKey(null);
    this.#warn(
      "other",
      ProxyFailureKind.Upstream,
      "a report failed; its requests were dropped",
    );
    return "dropped";
  }

  /** Keeps the batch and waits before the next report, doubling each time. */
  #retryLater(batch: Pending[]): Outcome {
    this.#restore(batch);
    this.#pausedUntil = this.#now() + this.#backoffMs;
    this.#backoffMs = Math.min(this.#backoffMs * 2, BACKOFF_MAX_MS);
    this.#warn(
      "unreachable",
      ProxyFailureKind.Upstream,
      "the Fingerly API could not take a report; retrying",
    );
    return "held";
  }

  #refusedKey(status: number | null): Outcome {
    this.#pausedUntil = this.#now() + UNAUTHORIZED_PAUSE_MS;
    this.#warn(
      "key",
      ProxyFailureKind.Misconfigured,
      status === null
        ? "the secret key is missing or invalid; reporting pauses for 60 s"
        : `the API refused the secret key (HTTP ${status}); reporting pauses for 60 s`,
    );
    return "dropped";
  }

  /**
   * Puts a kept batch back as the oldest pending requests. A key seen again
   * while it was in flight is folded into one item.
   */
  #restore(batch: Pending[]): void {
    const merged = new Map<string, Pending>();
    for (const pending of batch) {
      if (!pending.signed) {
        const newer = this.#pending.get(pending.id);
        if (newer !== undefined) {
          pending.item.count = Math.min(
            pending.item.count + newer.item.count,
            MAX_COUNT,
          );
          this.#pending.delete(pending.id);
          this.#pendingBytes -= newer.bytes;
        }
      }
      merged.set(pending.id, pending);
      this.#pendingBytes += pending.bytes;
    }
    for (const [id, pending] of this.#pending) merged.set(id, pending);
    this.#pending = merged;
    this.#startTimer();
  }

  /** One line per kind of problem, at most once a minute. */
  #warn(problem: string, kind: ProxyFailureKind, message: string): void {
    const now = this.#now();
    const last = this.#logged.get(problem);
    if (last !== undefined && now - last < LOG_INTERVAL_MS) return;
    this.#logged.set(problem, now);
    const failure: ProxyFailure = { kind, message };
    if (this.#onError) {
      try {
        this.#onError(failure);
      } catch {
        // A logging hook must not break reporting.
      }
      return;
    }
    console.error(`Fingerly agent sightings: ${message}`);
  }

  /** The Fetch request `clientIp` receives for a Node request, built once. */
  #fetchRequestOf(req: NodeRequest): Request {
    const known = this.#nodeRequests.get(req);
    if (known !== undefined) return known;
    const raw = req as NodeRequest & { originalUrl?: string };
    const host = headerText(req.headers.host ?? req.headers[":authority"]);
    const url = raw.originalUrl ?? raw.url ?? "/";
    const socket = (req as unknown as IncomingMessage).socket as
      { encrypted?: boolean } | undefined;
    const scheme = socket?.encrypted ? "https" : "http";
    const headers = toHeaders(req.headers as IncomingMessage["headers"]);
    let request: Request;
    try {
      request = new Request(`${scheme}://${host ?? "localhost"}${url}`, {
        headers,
      });
    } catch {
      request = new Request("http://localhost/", { headers });
    }
    this.#nodeRequests.set(req, request);
    return request;
  }
}

/**
 * Creates an agent sightings reporter. Equivalent to
 * `new AgentSightings(options)`.
 */
export function createAgentSightings(
  options: AgentSightingsOptions,
): AgentSightings {
  return new AgentSightings(options);
}

/**
 * The section 4.1 cache key: lowercase hex of the first 16 bytes of
 * SHA-256 over the user agent, the canonical address, `Signature-Agent` and
 * whether the request was signed, separated by zero bytes.
 */
export function sightingKey(
  userAgent: string | Uint8Array,
  canonicalIp: string,
  signatureAgent: string | Uint8Array,
  signed: boolean,
): string {
  const zero = Buffer.of(0);
  return createHash("sha256")
    .update(userAgent)
    .update(zero)
    .update(canonicalIp)
    .update(zero)
    .update(signatureAgent)
    .update(zero)
    .update(signed ? "1" : "0")
    .digest("hex")
    .slice(0, 32);
}

/**
 * One IP literal in canonical text form: an IPv4-mapped IPv6 address as the
 * IPv4 address, IPv6 per RFC 5952. Null for anything that is not exactly one
 * address, a zone id included.
 */
export function canonicalIp(value: string): string | null {
  if (value.includes("%")) return null;
  const family = isIP(value);
  if (family === 4) return value;
  if (family !== 6) return null;
  let host: string;
  try {
    // The URL serialiser prints IPv6 the RFC 5952 way.
    host = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (mapped === null) return host;
  const high = parseInt(mapped[1]!, 16);
  const low = parseInt(mapped[2]!, 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

/**
 * The fields of one request, or null when its user agent is too long to
 * report. A Web Bot Auth header over 4096 bytes is left out, and counts as
 * absent for the key too.
 */
function capture(request: Request, ip: string, method: string): Capture | null {
  const headers = request.headers;
  const userAgent = headerValue(headers.get("user-agent") ?? "");
  if (tooLong(userAgent)) return null;
  const signature = optional(headers.get("signature"));
  const signatureInput = optional(headers.get("signature-input"));
  const signatureAgent = optional(headers.get("signature-agent"));
  const signed = signature !== null && signatureInput !== null;
  const hostHeader = headers.get("host");
  const host =
    hostHeader !== null && hostHeader !== ""
      ? headerValue(hostHeader).text
      : hostOf(request.url);

  const item: AgentSighting & { count: number } = {
    user_agent: userAgent.text,
    client_ip: ip,
    count: 1,
  };
  if (host !== "") item.host = host;
  if (method !== "") item.method = method;
  if (signature !== null) item.signature = signature.text;
  if (signatureInput !== null) item.signature_input = signatureInput.text;
  if (signatureAgent !== null) item.signature_agent = signatureAgent.text;

  let bytes = 0;
  for (const text of [
    item.user_agent,
    item.client_ip,
    item.host,
    item.method,
    item.signature,
    item.signature_input,
    item.signature_agent,
  ])
    if (text !== undefined) bytes += Buffer.byteLength(text, "utf8");

  return {
    key: sightingKey(
      userAgent.raw,
      ip,
      signatureAgent?.raw ?? Buffer.alloc(0),
      signed,
    ),
    signed,
    item,
    bytes,
  };
}

/**
 * A header as it arrived. Header values are byte strings, one character per
 * byte, so the bytes are recovered first and read as UTF-8 for JSON.
 */
function headerValue(value: string): HeaderValue {
  if (/^[\x00-\x7f]*$/.test(value))
    return { text: value, raw: Buffer.from(value, "latin1") };
  if (/[^\x00-\xff]/.test(value))
    return { text: value, raw: Buffer.from(value, "utf8") };
  const raw = Buffer.from(value, "latin1");
  return { text: raw.toString("utf8"), raw };
}

function tooLong(value: HeaderValue): boolean {
  return (
    value.raw.byteLength > MAX_HEADER_BYTES ||
    Buffer.byteLength(value.text, "utf8") > MAX_HEADER_BYTES
  );
}

/** A Web Bot Auth header, or null when absent, empty or too long. */
function optional(value: string | null): HeaderValue | null {
  if (value === null || value === "") return null;
  const header = headerValue(value);
  return tooLong(header) ? null : header;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** A Node header value as one string, or null. */
function headerText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function peerOf(req: NodeRequest): ProxyPeer {
  const socket = (req as unknown as IncomingMessage).socket as
    { remoteAddress?: string } | undefined;
  return { remoteAddress: socket?.remoteAddress };
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * One answer as {@link AgentAnswer} declares it, frozen so the caller cannot
 * change what is remembered, or null when a field is missing or of the wrong
 * type: remembered, it would reach the caller's code as a field the type
 * promised and the answer lacked. Fields the type does not name are left
 * out, so a remembered answer stays small. An `agent` or `ai` of null reads
 * as absent.
 */
function decodeAnswer(item: unknown): AgentAnswer | null {
  if (!isObject(item)) return null;
  const { ttl, visitor_kind, agent, ai } = item;
  if (typeof ttl !== "number" || typeof visitor_kind !== "string") return null;
  const answer: AgentAnswer = { ttl, visitor_kind };
  if (agent !== undefined && agent !== null) {
    if (typeof agent !== "string") return null;
    answer.agent = agent;
  }
  if (ai !== undefined && ai !== null) {
    const decoded = decodeAIAgent(ai);
    if (decoded === null) return null;
    Object.freeze(decoded.verification);
    answer.ai = Object.freeze(decoded);
  }
  return Object.freeze(answer);
}

function stringList(value: unknown, name: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.trim() === "")
  )
    throw new TypeError(`${name} must be an array of non-empty strings`);
  return value as string[];
}

function pathList(value: unknown, name: string): readonly string[] {
  if (value === undefined) return [];
  const paths = stringList(value, name);
  if (paths.some((path) => !path.startsWith("/")))
    throw new TypeError(`${name} entries must start with /`);
  return Object.freeze([...paths]);
}

/** Milliseconds until the next UTC midnight, when a daily allowance resets. */
function untilNextUtcDay(): number {
  const now = Date.now();
  const today = new Date(now);
  return (
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() + 1,
    ) - now
  );
}
