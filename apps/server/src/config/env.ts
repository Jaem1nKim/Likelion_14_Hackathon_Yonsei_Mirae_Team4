import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const rootEnvPath = fileURLToPath(new URL("../../../../.env", import.meta.url));

config({ path: rootEnvPath });

function emptyAsUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export function parseOpenAiEnabled(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase() === "true";
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SERVER_HOST: z.string().trim().min(1).default("127.0.0.1"),
  SERVER_PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().trim().default(""),
  OPENAI_MODEL: z.preprocess(
    emptyAsUndefined,
    z.string().trim().min(1).default("gpt-5.6-luna"),
  ),
  OPENAI_REASONING_EFFORT: z.preprocess(
    emptyAsUndefined,
    z.enum(["none", "low", "medium", "high"]).default("low"),
  ),
  OPENAI_TIMEOUT_MS: z.preprocess(
    emptyAsUndefined,
    z.coerce.number().int().min(1_000).max(120_000).default(10_000),
  ),
  OPENAI_ENABLED: z.preprocess(parseOpenAiEnabled, z.boolean()),
});

export function parseServerEnv(value: Record<string, string | undefined>) {
  return envSchema.parse(value);
}

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid server environment", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Server environment validation failed");
}

export const env = parsedEnv.data;
