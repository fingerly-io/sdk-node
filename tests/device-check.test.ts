import { describe, expect, it, vi } from "vitest";
import {
  DeviceCheckClient,
  Fingerly,
  FingerlyAPIError,
  FingerlyConnectionError,
} from "../src/index.js";
import type { DeviceCheckErrorCode } from "../src/index.js";

const secretKey = "fly_sk_development_test";
const id = "01a1e665-198c-760c-abf9-3666cb1c8e85";
const base = "https://api.fingerly.io/api/v1/events/" + id;

const failure = (status: number, code: string, details?: unknown) =>
  Response.json(
    { error: { code, message: "no", status, details }, request_id: "trace" },
    { status },
  );

function client(...answers: Array<Response | Error>) {
  const fetchImpl = vi.fn<typeof fetch>();
  for (const answer of answers)
    if (answer instanceof Error) fetchImpl.mockRejectedValueOnce(answer);
    else fetchImpl.mockResolvedValueOnce(answer);
  return { fingerly: new Fingerly({ secretKey, fetchImpl }), fetchImpl };
}

describe("deviceCheck", () => {
  it("reads the bits with one keyed POST and no body", async () => {
    const { fingerly, fetchImpl } = client(
      Response.json({
        found: true,
        bit0: true,
        bit1: false,
        last_update: "2026-10",
      }),
    );
    expect(fingerly.deviceCheck).toBeInstanceOf(DeviceCheckClient);
    expect(await fingerly.deviceCheck.query(id)).toEqual({
      found: true,
      bit0: true,
      bit1: false,
      last_update: "2026-10",
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(base + "/device-check/query");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
    expect((init?.headers as Record<string, string>)["x-api-key"]).toBe(
      secretKey,
    );
  });

  it("reads a device Apple holds nothing for", async () => {
    const { fingerly } = client(
      Response.json({ found: false, bit0: false, bit1: false }),
    );
    expect(await fingerly.deviceCheck.query(id)).toEqual({
      found: false,
      bit0: false,
      bit1: false,
    });
  });

  it("writes only the bits it names", async () => {
    const { fingerly, fetchImpl } = client(Response.json({ bit1: true }));
    expect(await fingerly.deviceCheck.write(id, { bit1: true })).toEqual({
      bit1: true,
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(base + "/device-check");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe('{"bit1":true}');
    expect((init?.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("refuses a write naming no bit, or a bad id, without a request", async () => {
    const { fingerly, fetchImpl } = client();
    await expect(fingerly.deviceCheck.write(id, {})).rejects.toThrow(TypeError);
    await expect(
      fingerly.deviceCheck.write(id, { bit0: "yes" as unknown as boolean }),
    ).rejects.toThrow(TypeError);
    await expect(fingerly.deviceCheck.query("..")).rejects.toThrow(TypeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each<[number, DeviceCheckErrorCode]>([
    [404, "device_check_not_held"],
    [409, "device_check_spent"],
    [409, "device_check_busy"],
    [409, "credential_unavailable"],
    [422, "bits_required"],
  ])("throws %i %s typed, without a retry", async (status, code) => {
    const { fingerly, fetchImpl } = client(failure(status, code));
    const error = await fingerly.deviceCheck
      .write(id, { bit0: true })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FingerlyAPIError);
    expect((error as FingerlyAPIError).status).toBe(status);
    expect((error as FingerlyAPIError).code).toBe(code);
    expect((error as FingerlyAPIError).appleStatus).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("carries Apple's status on apple_rejected", async () => {
    const { fingerly, fetchImpl } = client(
      failure(422, "apple_rejected", [
        { field: "apple_status", location: "upstream", issue: "400" },
      ]),
    );
    const error = (await fingerly.deviceCheck
      .query(id)
      .catch((e: unknown) => e)) as FingerlyAPIError;
    expect(error.code).toBe("apple_rejected");
    expect(error.appleStatus).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 429 or a 500", async () => {
    for (const status of [429, 500]) {
      const { fingerly, fetchImpl } = client(failure(status, "other"));
      await expect(fingerly.deviceCheck.query(id)).rejects.toMatchObject({
        status,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it("retries the identical request after a 503 and a transport failure", async () => {
    const { fingerly, fetchImpl } = client(
      failure(503, "device_check_unavailable"),
      new TypeError("socket hang up"),
      Response.json({ bit0: true, bit1: false }),
    );
    expect(
      await fingerly.deviceCheck.write(id, { bit0: true, bit1: false }),
    ).toEqual({ bit0: true, bit1: false });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [url, init] of fetchImpl.mock.calls) {
      expect(url).toBe(base + "/device-check");
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe('{"bit0":true,"bit1":false}');
    }
  });

  it("gives up after two retries with the last error", async () => {
    const { fingerly, fetchImpl } = client(
      failure(503, "device_check_unavailable"),
      failure(503, "device_check_unavailable"),
      new TypeError("socket hang up"),
    );
    await expect(fingerly.deviceCheck.query(id)).rejects.toBeInstanceOf(
      FingerlyConnectionError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [url, init] of fetchImpl.mock.calls) {
      expect(url).toBe(base + "/device-check/query");
      expect(init?.method).toBe("POST");
    }
  });

  it("stops retrying when the caller cancels", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled");
    const { fingerly, fetchImpl } = client(
      failure(503, "device_check_unavailable"),
    );
    const pending = fingerly.deviceCheck.query(id, controller.signal);
    setTimeout(() => controller.abort(reason), 20);
    await expect(pending).rejects.toBe(reason);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps event reads to one attempt", async () => {
    const { fingerly, fetchImpl } = client(failure(503, "service_unavailable"));
    await expect(fingerly.events.get(id)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
