import { HEALTH_API_PATH, type HealthResponse } from "@mcm/shared";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"
).replace(/\/$/, "");

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}${HEALTH_API_PATH}`, {
    headers: {
      Accept: "application/json",
    },
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
