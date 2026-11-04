/**
 * Keeps credentials out of anything that prints or serialises an SDK object.
 *
 * Keys live in `#private` fields, which neither `util.inspect` nor
 * `JSON.stringify` can see. The views the SDK objects return from
 * `toJSON` and the inspect hook show a marker instead, so `console.log(client)`
 * says a key is configured without showing it.
 */

/** What a credential reads as in logs and serialised output. */
export const REDACTED = "[redacted]";

/**
 * The hook `util.inspect` and `console.log` call. Registered by name so the
 * SDK does not import `node:util` for it.
 */
export const inspectCustom = Symbol.for("nodejs.util.inspect.custom");
