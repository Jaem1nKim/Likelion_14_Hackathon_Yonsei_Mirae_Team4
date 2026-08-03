import { describe, expect, it } from "vitest";

import { mapPrismaError } from "../errors/prisma-error.js";
import { Prisma } from "../generated/prisma/client.js";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(
    "sensitive prisma message with file:./prisma/test.db",
    { code, clientVersion: "7.9.1" },
  );
}

describe("Prisma error normalization", () => {
  it("maps record-not-found to RESOURCE_NOT_FOUND", () => {
    const mapped = mapPrismaError(prismaError("P2025"));
    expect(mapped).toMatchObject({
      statusCode: 404,
      code: "RESOURCE_NOT_FOUND",
      details: null,
    });
  });

  it("maps unique conflicts without exposing an index", () => {
    const mapped = mapPrismaError(prismaError("P2002"));
    expect(mapped).toMatchObject({ statusCode: 409, code: "RESOURCE_CONFLICT" });
    expect(mapped?.message).not.toContain("prisma");
    expect(mapped?.message).not.toContain("test.db");
  });

  it("maps exhausted DB contention to INTERNAL_ERROR", () => {
    const mapped = mapPrismaError(prismaError("P1008"));
    expect(mapped).toMatchObject({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      logCode: "DATABASE_CONTENTION_EXHAUSTED",
    });
  });

  it("does not reinterpret an unrelated error", () => {
    expect(mapPrismaError(new Error("ordinary error"))).toBeNull();
  });
});
