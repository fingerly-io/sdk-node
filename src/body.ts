/** Upstream response bodies are never buffered beyond this. */
export const MAX_RESPONSE_BYTES = 4 * 1_048_576;

/**
 * Reads a body stream without buffering more than the limit.
 *
 * Streaming the read means an oversized body is cut off at the limit instead
 * of being held in memory first. The signal cancels a stalled stream.
 *
 * @returns The bytes, or null when the limit was exceeded.
 */
export async function readLimited(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Buffer<ArrayBuffer> | null> {
  const reader = stream?.getReader();
  if (!reader) return Buffer.alloc(0);

  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks);
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
