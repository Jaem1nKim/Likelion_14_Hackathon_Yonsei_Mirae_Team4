import { afterEach, describe, expect, it, vi } from "vitest";

import { createUuidV4 } from "./uuid";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createUuidV4", () => {
  it("uses crypto.randomUUID when it is available", () => {
    const randomUUID = vi
      .fn()
      .mockReturnValue("123e4567-e89b-42d3-a456-426614174000");
    const getRandomValues = vi.fn();
    vi.stubGlobal("crypto", { randomUUID, getRandomValues });

    expect(createUuidV4()).toBe("123e4567-e89b-42d3-a456-426614174000");
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("creates an RFC 4122 UUID v4 with crypto.getRandomValues", () => {
    const source = Uint8Array.from([
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x06, 0x77,
      0x08, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
    ]);
    const getRandomValues = vi.fn((target: Uint8Array) => {
      target.set(source);
      return target;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(createUuidV4()).toBe("00112233-4455-4677-8899-aabbccddeeff");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it("never uses Math.random for the fallback", () => {
    const mathRandom = vi.spyOn(Math, "random");
    const getRandomValues = vi.fn((target: Uint8Array) => {
      target.fill(0xab);
      return target;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(createUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(mathRandom).not.toHaveBeenCalled();
  });
});
