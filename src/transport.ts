import { validateApiVersion } from "./routes.js";
import {
  endpointForKey,
  endpoint as normalizeEndpoint,
} from "./credentials.js";
import { FingerlyAPIError } from "./errors.js";
import type { APIErrorMetadata } from "./errors.js";
import { deadline, positive } from "./timing.js";
import type { FingerlyOptions } from "./types.js";

/** Authenticated JSON requests with a deadline covering fetch and body reads. */
export class APITransport {
  /** Regional base URL including the configured API version, e.g. /api/v1. */
  private readonly endpoint: string;
  /** Time limit covering both the HTTP request and reading its JSON body. */
  private readonly timeoutMs: number;
  /** HTTP implementation; replace it in tests or hosts with a custom fetch. */
  private readonly fetchImpl: typeof fetch;
  /** Server-only read key sent in x-api-key and redacted from API errors. */
  private readonly secretKey: string;

  constructor(options: FingerlyOptions) {
    const regionalEndpoint = endpointForKey(options.secretKey, "sk");
    const apiVersion = validateApiVersion(options.apiVersion);
    this.endpoint = `${normalizeEndpoint(options.endpoint ?? regionalEndpoint)}/api/${apiVersion}`;
    this.timeoutMs = positive(options.timeoutMs ?? 5_000, "timeoutMs");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.secretKey = options.secretKey;
  }

  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return deadline(this.timeoutMs, signal, "request", async (bounded) => {
      const response = await this.fetchImpl(this.endpoint + path, {
        headers: { "x-api-key": this.secretKey, accept: "application/json" },
        redirect: "manual",
        signal: bounded,
      });
      if (!response.ok) throw await this.responseError(response);
      return (await response.json()) as T;
    });
  }

  private async responseError(response: Response): Promise<FingerlyAPIError> {
    const metadata: APIErrorMetadata = {};
    try {
      const body = (await response.json()) as {
        error?: { code?: unknown; details?: unknown };
        request_id?: unknown;
      } | null;
      if (typeof body?.error?.code === "string")
        metadata.code = this.redact(body.error.code);
      if (body?.error?.details !== undefined)
        metadata.details = JSON.parse(
          this.redact(JSON.stringify(body.error.details)),
        );
      if (typeof body?.request_id === "string")
        metadata.requestId = this.redact(body.request_id);
    } catch {
      // A non-JSON response still reports its HTTP status. Never expose raw bodies.
    }
    return new FingerlyAPIError(
      `Fingerly API returned HTTP ${response.status}`,
      response.status,
      metadata,
    );
  }

  private redact(value: string): string {
    return value.split(this.secretKey).join("[redacted]");
  }
}
