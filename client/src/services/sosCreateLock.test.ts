import { beforeEach, describe, expect, it } from "vitest";
import { acquireSOSCreationLock, releaseSOSCreationLock } from "./sosCreateLock";

describe("SOS creation in-flight lock", () => {
  beforeEach(() => {
    releaseSOSCreationLock("rider-1");
    releaseSOSCreationLock("rider-2");
  });

  it("allows only one concurrent creation for the same account", () => {
    expect(acquireSOSCreationLock("rider-1")).toBe(true);
    expect(acquireSOSCreationLock("rider-1")).toBe(false);
    releaseSOSCreationLock("rider-1");
    expect(acquireSOSCreationLock("rider-1")).toBe(true);
  });

  it("keeps different accounts independent", () => {
    expect(acquireSOSCreationLock("rider-1")).toBe(true);
    expect(acquireSOSCreationLock("rider-2")).toBe(true);
    expect(acquireSOSCreationLock("rider-1")).toBe(false);
    expect(acquireSOSCreationLock("rider-2")).toBe(false);
  });

  it.each([null, undefined, "", 42])("rejects an invalid account identity: %s", (uid) => {
    expect(acquireSOSCreationLock(uid)).toBe(false);
  });

  it("safely releases missing and invalid locks", () => {
    expect(() => releaseSOSCreationLock(null)).not.toThrow();
    expect(() => releaseSOSCreationLock("missing-user")).not.toThrow();
    expect(acquireSOSCreationLock("rider-1")).toBe(true);
  });
});
