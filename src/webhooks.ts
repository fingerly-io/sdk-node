import { createHmac, timingSafeEqual } from "node:crypto";
import type { VerifyWebhookOptions } from "./types.js";

/** Verify the exact raw body, accepting any valid signature during rotation. */
export function verifyWebhook(options: VerifyWebhookOptions): boolean {
  const { secret, timestamp, signature, payload } = options;
  if (!secret || !timestamp || !signature) return false;
  if (!isRecentTimestamp(timestamp, options.now, options.toleranceSeconds))
    return false;

  const expected = signPayload(secret, timestamp, payload);
  return signature
    .split(",")
    .some((candidate) => matchesSignature(candidate, expected));
}

function isRecentTimestamp(
  timestamp: string,
  now: Date = new Date(),
  toleranceSeconds: number = 300,
): boolean {
  const seconds = parseTimestamp(timestamp);
  if (seconds === null) return false;
  if (!isValidTolerance(toleranceSeconds)) return false;

  const currentSeconds = Math.floor(now.getTime() / 1000);
  if (!Number.isFinite(currentSeconds)) return false;
  return Math.abs(currentSeconds - seconds) <= toleranceSeconds;
}

function parseTimestamp(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

function isValidTolerance(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds >= 0;
}

/** Fingerly signs timestamp + "." + the original request bytes. */
function signPayload(
  secret: string,
  timestamp: string,
  payload: string | Uint8Array,
): Buffer {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(Buffer.from(payload))
    .digest("hex");
  return Buffer.from(digest);
}

function matchesSignature(candidate: string, expected: Buffer): boolean {
  const actual = parseSignature(candidate);
  if (actual === null || actual.length !== expected.length) return false;
  return timingSafeEqual(expected, actual);
}

function parseSignature(candidate: string): Buffer | null {
  const value = candidate.trim();
  if (!/^sha256=[a-f0-9]{64}$/.test(value)) return null;
  return Buffer.from(value.slice("sha256=".length));
}
