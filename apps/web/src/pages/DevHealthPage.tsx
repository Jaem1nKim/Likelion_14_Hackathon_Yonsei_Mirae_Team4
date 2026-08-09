import { useEffect, useState } from "react";

import type { HealthData } from "@mcm/shared";

import { fetchHealth } from "../api/health";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";

export function DevHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal)
      .then((response) => setHealth(response.data))
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "서버 상태를 확인하지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <AppLayout showUser={false}>
      <PageHeader title="Development Health" description="개발 환경 연결 상태" />
      {!health && !error && <LoadingState message="서버 연결을 확인하고 있습니다." />}
      {error && <ErrorState message={error} />}
      {health && (
        <dl className="health-list">
          <div><dt>Status</dt><dd>{health.status}</dd></div>
          <div><dt>Database</dt><dd>{health.database}</dd></div>
          <div><dt>Checked at</dt><dd>{health.timestamp}</dd></div>
        </dl>
      )}
    </AppLayout>
  );
}
