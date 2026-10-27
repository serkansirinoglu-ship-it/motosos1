import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./health";

function makeResponse() {
  const headers = new Map<string, string>();
  const response = {
    statusCode: 0,
    body: undefined as string | undefined,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return response;
    }),
    end: vi.fn((body?: string) => {
      response.body = body;
      return response;
    }),
    getHeader: (name: string) => headers.get(name.toLowerCase()),
  };
  return response as unknown as ServerResponse & {
    body?: string;
    getHeader(name: string): string | undefined;
  };
}

function invoke(method: string) {
  const req = { method } as IncomingMessage;
  const res = makeResponse();
  handler(req, res);
  return res;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("preview-only health endpoint", () => {
  it.each([undefined, "production", "development"])(
    "returns 404 outside Preview (VERCEL_ENV=%s)",
    (environment: string | undefined) => {
      if (environment === undefined) {
        vi.stubEnv("VERCEL_ENV", "");
      } else {
        vi.stubEnv("VERCEL_ENV", environment);
      }

      const res = invoke("GET");
      expect(res.statusCode).toBe(404);
      expect(res.body).toBeUndefined();
      expect(res.getHeader("cache-control")).toBe("no-store, max-age=0");
    },
  );

  it("returns a minimal non-sensitive status only in Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    const res = invoke("GET");
    expect(res.statusCode).toBe(200);
    expect(res.getHeader("content-type")).toBe("application/json; charset=utf-8");
    expect(JSON.parse(res.body ?? "{}")).toEqual({
      status: "ok",
      scope: "preview-only",
      service: "motoguard-runtime-probe",
    });
  });

  it("supports HEAD without a response body", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    const res = invoke("HEAD");
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeUndefined();
  });

  it("rejects unsupported methods in Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");

    const res = invoke("POST");
    expect(res.statusCode).toBe(405);
    expect(res.getHeader("allow")).toBe("GET, HEAD");
    expect(res.body).toBeUndefined();
  });
});
