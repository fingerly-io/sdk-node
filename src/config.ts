/**
 * Validation and normalisation of caller-supplied configuration.
 *
 * Everything here runs before any network access so a misconfigured client
 * fails at construction, never mid-request and never against the wrong host.
 */

/** Kinds of key Fingerly issues: browser public, server secret, proxy. */
export type KeyKind = "pk" | "sk" | "px";

/** Deployment a key belongs to. Keys never cross environments. */
export type Environment = "production" | "staging" | "development";

/** The environment a key is scoped to. */
export interface KeyScope {
  environment: Environment;
}

/** The one Fingerly API origin. */
export const DEFAULT_ENDPOINT = "https://api.fingerly.io";

const KEY = /^fly_(pk|sk|px)_(production|staging|development)_[A-Za-z0-9_-]+$/;

const KEY_LABEL: Record<KeyKind, string> = {
  pk: "public",
  sk: "secret",
  px: "proxy",
};

/** `$` is end-of-input in JavaScript, so this rejects trailing whitespace. */
const API_VERSION = /^v[1-9]\d*$/;

/** `setTimeout` silently clamps anything larger, so refuse it instead. */
const MAX_INT32 = 2_147_483_647;

/**
 * Parses a Fingerly key and asserts it is of the expected kind.
 *
 * @param key The raw key, such as `fly_sk_production_…`.
 * @param expected The kind the caller requires.
 * @returns The environment the key is scoped to.
 * @throws {TypeError} If the key is malformed or of another kind.
 */
export function parseKey(key: string, expected: KeyKind): KeyScope {
  const match = KEY.exec(key);
  if (!match || match[1] !== expected)
    throw new TypeError(
      `A valid Fingerly ${KEY_LABEL[expected]} key is required`,
    );
  return { environment: match[2] as Environment };
}

/**
 * Normalises a caller-supplied API origin.
 *
 * Credentials, queries and fragments are refused: they would be attached to
 * every authenticated request, and embedded credentials would leak on redirect.
 *
 * @returns The origin without trailing slashes.
 * @throws {TypeError} If the URL is malformed or carries any of the above.
 */
export function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new TypeError(
      "endpoint must be an HTTP(S) URL without credentials, query, or fragment",
    );
  return value.replace(/\/+$/, "");
}

/**
 * Validates an API route version before it is spliced into a URL.
 *
 * @param version A version such as `v1`; defaults to `v1`.
 * @throws {TypeError} If the version is not of that shape.
 */
export function normalizeApiVersion(version: string = "v1"): string {
  if (!API_VERSION.test(version))
    throw new TypeError('apiVersion must be a version such as "v1" or "v2"');
  return version;
}

/**
 * Validates a duration or size option.
 *
 * @param value The caller-supplied count.
 * @param name The option name, used in the error message.
 * @throws {TypeError} If the value is not a positive 32-bit integer.
 */
export function positiveInt(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_INT32)
    throw new TypeError(
      `${name} must be a positive integer below ${MAX_INT32 + 1}`,
    );
  return value;
}
