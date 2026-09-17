import { FingerlyTimeoutError } from "./errors.js";

type Operation = "request" | "event_wait";
type CancellableTask<T> = (signal: AbortSignal) => Promise<T>;
type Cleanup = () => void;

export function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647)
    throw new TypeError(`${name} must be a positive integer below 2147483648`);
  return value;
}

/** Run a task with a time limit and the caller's cancellation signal. */
export async function deadline<T>(
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
  operation: Operation,
  task: CancellableTask<T>,
): Promise<T> {
  positive(timeoutMs, "timeoutMs");
  throwIfCancelled(callerSignal);

  const controller = new AbortController();
  const stopTimeout = startTimeout(controller, timeoutMs, operation);
  const stopForwarding = forwardCancellation(callerSignal, controller);

  try {
    return await runUntilCancelled(task, controller.signal);
  } finally {
    stopTimeout();
    stopForwarding();
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason;
}

/** Return a cleanup function so the caller always clears its timer. */
function startTimeout(
  controller: AbortController,
  timeoutMs: number,
  operation: Operation,
): Cleanup {
  const timeout = () => controller.abort(new FingerlyTimeoutError(operation));
  const timer = setTimeout(timeout, timeoutMs);
  return () => clearTimeout(timer);
}

/** Preserve the original reason when the caller cancels. */
function forwardCancellation(
  caller: AbortSignal | undefined,
  controller: AbortController,
): Cleanup {
  if (!caller) return () => {};
  const forward = () => controller.abort(caller.reason);
  caller.addEventListener("abort", forward, { once: true });
  return () => caller.removeEventListener("abort", forward);
}

/** Reject on cancellation even if an injected fetch ignores its signal. */
function runUntilCancelled<T>(
  task: CancellableTask<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", cancel);
    const cancel = () => {
      cleanup();
      reject(signal.reason);
    };
    signal.addEventListener("abort", cancel, { once: true });

    // Handle both synchronous throws and asynchronous task failures.
    const result = Promise.resolve().then(() => {
      throwIfCancelled(signal);
      return task(signal);
    });
    result.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

/** Wait between polls, stopping immediately when the caller cancels. */
export function pause(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
