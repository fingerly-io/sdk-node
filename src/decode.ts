import type { AIAgent } from "./types.js";

/** True for a JSON object: not null and not an array. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** True for a promise or anything else with a `then` method. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * Runs the customer's error hook. Neither a throw nor, from an async hook, a
 * rejection reaches the caller: a rejection nobody handles ends the process.
 */
export function callHook<T>(hook: (value: T) => void, value: T): void {
  try {
    const result: unknown = hook(value);
    if (isThenable(result)) result.then(undefined, () => {});
  } catch {
    // A logging hook must not break what it reports on.
  }
}

/**
 * An `ai` object as {@link AIAgent} declares it, copied field by field, or
 * null when a field is missing or of the wrong type. Values stay open: an
 * unknown purpose or method is kept as the string it is.
 */
export function decodeAIAgent(value: unknown): AIAgent | null {
  if (!isObject(value)) return null;
  const { name, provider, purpose, runtime, declared, verification } = value;
  if (
    typeof name !== "string" ||
    typeof provider !== "string" ||
    typeof purpose !== "string" ||
    typeof runtime !== "string" ||
    typeof declared !== "boolean" ||
    !isObject(verification) ||
    typeof verification.method !== "string" ||
    typeof verification.result !== "string"
  )
    return null;
  return {
    name,
    provider,
    purpose,
    runtime,
    declared,
    verification: { method: verification.method, result: verification.result },
  };
}

/**
 * Whether an event as read from the API keeps what `Event` promises about
 * its AI agent: `ai` absent, or a complete agent. An `ai` of null is
 * removed, since the type says absent.
 */
export function acceptEvent(event: Record<string, unknown>): boolean {
  if (!("ai" in event)) return true;
  if (event.ai === null || event.ai === undefined) {
    delete event.ai;
    return true;
  }
  return decodeAIAgent(event.ai) !== null;
}

/** Whether a page of events has its rows, each an acceptable event. */
export function acceptEventPage(page: Record<string, unknown>): boolean {
  return (
    Array.isArray(page.rows) &&
    page.rows.every((row) => isObject(row) && acceptEvent(row))
  );
}
