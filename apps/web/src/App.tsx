import { useEffect, useState } from "react";

import type { HealthData } from "@mcm/shared";

import { fetchHealth } from "./api/health";

type HealthState =
  | { status: "loading" }
  | { status: "success"; health: HealthData }
  | { status: "error"; message: string };

export function App() {
  const [healthState, setHealthState] = useState<HealthState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    void fetchHealth(controller.signal)
      .then((response) => {
        setHealthState({ status: "success", health: response.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setHealthState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to connect to the server.",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <h1>MCM Journey Passport</h1>
      <p>Web application is running</p>

      <section aria-live="polite" className="health-status">
        <h2>Server health</h2>
        {healthState.status === "loading" && <p>Checking server connection...</p>}
        {healthState.status === "success" && (
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{healthState.health.status}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{healthState.health.database}</dd>
            </div>
            <div>
              <dt>Checked at</dt>
              <dd>{healthState.health.timestamp}</dd>
            </div>
          </dl>
        )}
        {healthState.status === "error" && (
          <p className="error-message">Server connection failed: {healthState.message}</p>
        )}
      </section>
    </main>
  );
}
