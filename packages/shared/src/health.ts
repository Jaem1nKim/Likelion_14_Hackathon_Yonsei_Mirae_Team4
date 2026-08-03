import type { ApiSuccess } from "./api-types.js";

export const HEALTH_STATUS = "ok" as const;
export const HEALTH_DATABASE_STATUS = "connected" as const;
export const HEALTH_API_PATH = "/health" as const;

export type HealthData = {
  status: typeof HEALTH_STATUS;
  database: typeof HEALTH_DATABASE_STATUS;
  timestamp: string;
};

export type HealthResponse = ApiSuccess<HealthData>;
