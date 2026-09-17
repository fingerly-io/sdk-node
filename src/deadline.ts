import { FingerlyTimeoutError } from "./errors.js";

/** What a deadline protects; surfaced on {@link FingerlyTimeoutError}. */
export type Operation = "request" | "event_wait";

/**
 * Runs a task under a deadline, forwarding the caller's cancellation.
 *
 * The task receives a signal that aborts on either the deadline or the
 * caller's own signal. Its result is raced against that signal, so a `fetch`
 * implementation that ignores cancellation still cannot outlive the deadline.
 *
 * @param timeoutMs Time limit; already validated by the caller.
 * @param operation Which deadline this is, for the timeout error.
 * @param caller Optional caller signal; its abort reason is preserved verbatim.
 * @param task Receives the bounded signal and does the cancellable work.
 * @throws {FingerlyTimeoutError} When the deadline elapses first.
 */
export async function withDeadline<T>(
  timeoutMs: number,
  operation: Operation,
  caller: AbortSignal | undefined,
  task: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  // Fail before starting work the caller has already given up on.
  if (caller?.aborted) throw caller.reason;

  const controller = new AbortController();
  const expire = setTimeout(() => {
    controller.abort(new FingerlyTimeoutError(operation));
  }, timeoutMs);
  const forward = () => {
    controller.abort(caller?.reason);
  };
  caller?.addEventListener("abort", forward, { once: true });

  try {
    return await Promise.race([
      task(controller.signal),
      rejectOnAbort(controller.signal),
    ]);
  } finally {
    clearTimeout(expire);
    caller?.removeEventListener("abort", forward);
  }
}

/** A promise that never resolves and rejects with the signal's abort reason. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * Waits between polls, rejecting as soon as the signal aborts.
 *
 * @param ms How long to wait.
 * @param signal Cancellation; its reason becomes the rejection.
 */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
