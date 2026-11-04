import { describe, expect, it } from "vitest";
import {
  FingerlyAPIError,
  FingerlyConnectionError,
  FingerlyTimeoutError,
} from "../src/index.js";

describe("error identity across copies of the SDK", () => {
  it("recognises errors thrown by a second copy of the module", async () => {
    // A query string makes Vite load an independent copy, as an app that
    // mixes the ESM and CommonJS builds does.
    const copy = "../src/errors.js?second-copy";
    const other = (await import(
      /* @vite-ignore */ copy
    )) as typeof import("../src/errors.js");
    expect(other.FingerlyAPIError).not.toBe(FingerlyAPIError);
    const api = new other.FingerlyAPIError("x", 404);
    const timeout = new other.FingerlyTimeoutError();
    const connection = new other.FingerlyConnectionError(new Error("down"));
    expect(api).toBeInstanceOf(FingerlyAPIError);
    expect(timeout).toBeInstanceOf(FingerlyTimeoutError);
    expect(timeout).toBeInstanceOf(FingerlyConnectionError);
    expect(connection).toBeInstanceOf(FingerlyConnectionError);
    expect(connection).not.toBeInstanceOf(FingerlyTimeoutError);
    expect(api).not.toBeInstanceOf(FingerlyConnectionError);
    expect(new Error("plain")).not.toBeInstanceOf(FingerlyAPIError);
    expect(null).not.toBeInstanceOf(FingerlyAPIError);
    expect(api).toBeInstanceOf(Error);
  });
});
