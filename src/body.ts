/** Read an incoming stream without allowing it to exceed the proxy's limit. */
export async function readBody(
  request: Request,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Buffer<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return Buffer.concat(chunks);
      length += chunk.value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk.value);
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
