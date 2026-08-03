import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const projectRoot = fileURLToPath(new URL("../../../../", import.meta.url));

function resolveDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must be a SQLite file URL");
  }

  const configuredPath = databaseUrl.slice("file:".length);
  if (!configuredPath) {
    throw new Error("DATABASE_URL must include a SQLite file path");
  }

  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(projectRoot, configuredPath);

  return `file:${absolutePath.replaceAll("\\", "/")}`;
}

const globalForPrisma = globalThis as typeof globalThis & {
  mcmPrisma?: PrismaClient;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(env.DATABASE_URL),
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.mcmPrisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.mcmPrisma = prisma;
}

export async function checkDatabaseConnection() {
  await prisma.$queryRawUnsafe("SELECT 1 AS health");
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
