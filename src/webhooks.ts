import { createHmac, timingSafeEqual } from "node:crypto";
import type { VerifyWebhookOptions } from "./types.js";

const DEFAULT_TOLERANCE_SECONDS = 300;

/** A lowercase hex digest, exactly as Fingerly sends it. */
const SIGNATURE = /^sha256=[a-f0-9]{64}$/;

/** Whole unsigned seconds; anything else is not a timestamp we signed. */
const TIMESTAMP = /^\d+$/;

const PREFIX_LENGTH = "sha256=".length;

/** Signature candidates considered from one header. */
const MAX_SIGNATURES = 32;

/**
 * Verifies a webhook delivery against the raw request body.
 *
 * Pass the exact bytes received, before any JSON parsing: re-serialising them
 * changes the digest. During a signing-secret rotation Fingerly sends several
 * comma-separated signatures, and any one of the first 32 matching is
 * accepted.
 *
 * Verification proves the delivery came from Fingerly and is recent. It does
 * not deduplicate, so persist processed event ids as well.
 *
 * @param options Secret, raw payload, and the signature and timestamp headers.
 * @returns True when a signature matches and the timestamp is within tolerance.
 */
export function verifyWebhook(options: VerifyWebhookOptions): boolean {
  const { secret, payload, signature, timestamp } = options;
  if (!secret || !timestamp || !signature) return false;
  // Every value here arrived from an untrusted request, and a body parser
  // hands over undefined or {} for an empty body: reject, do not throw.
  if (typeof timestamp !== "string" || typeof signature !== "string")
    return false;
  if (typeof payload !== "string" && !ArrayBuffer.isView(payload)) return false;

  // Check freshness before spending a HMAC on an obvious replay.
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (!isFresh(timestamp, options.now ?? new Date(), tolerance)) return false;

  const expected = sign(secret, timestamp, payload);
  // Rotation sends a handful; a header of thousands is not ours, and parsing
  // it would let one request burn CPU. Only the first few are considered.
  return signature
    .split(",", MAX_SIGNATURES)
    .some((candidate) => matches(candidate, expected));
}

/** Rejects replays: the signed time must be within tolerance of now. */
function isFresh(
  timestamp: string,
  now: Date,
  toleranceSeconds: number,
): boolean {
  if (!TIMESTAMP.test(timestamp)) return false;
  if (!Number.isFinite(toleranceSeconds) || toleranceSeconds < 0) return false;

  const signedAt = Number(timestamp);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (!Number.isSafeInteger(signedAt) || !Number.isFinite(nowSeconds))
    return false;
  return Math.abs(nowSeconds - signedAt) <= toleranceSeconds;
}

/**
 * Computes the expected digest.
 *
 * Fingerly signs the timestamp, a literal dot, then the raw body bytes.
 *
 * @returns The hex digest as ASCII bytes, ready for a constant-time compare.
 */
function sign(
  secret: string,
  timestamp: string,
  payload: string | Uint8Array,
): Buffer {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(payload)
    .digest("hex");
  return Buffer.from(digest);
}

/** Compares one candidate signature in constant time. */
function matches(candidate: string, expected: Buffer): boolean {
  const value = candidate.trim();
  if (!SIGNATURE.test(value)) return false;
  const actual = Buffer.from(value.slice(PREFIX_LENGTH));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
