import type { DemoUser } from "@mcm/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffDemoUsers } from "../api/demo-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useDemoUser } from "../hooks/useDemoUser";

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { login } = useDemoUser();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getStaffDemoUsers(controller.signal)
      .then((staffUsers) => setUsers(staffUsers.filter((user) => user.role === "STAFF")))
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(errorMessage(caught));
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function handleLogin() {
    if (!selectedId || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const staff = await login(selectedId);
      if (staff.role !== "STAFF") throw new Error("직원 프로필만 사용할 수 있습니다.");
      navigate("/staff/reservations", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout showUser={false}>
      <PageHeader eyebrow="STAFF ACCESS" title="MCM Journey Staff" description="시연용 직원 프로필로 예약과 Journey 상태를 확인합니다." />
      {isLoading && <LoadingState message="직원 프로필을 불러오고 있습니다." />}
      {!isLoading && error && <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />}
      {!isLoading && !error && users.length === 0 && <ErrorState message="사용 가능한 직원 프로필이 없습니다." onRetry={() => setAttempt((value) => value + 1)} />}
      {!isLoading && !error && users.length > 0 && (
        <>
          <div className="choice-grid user-grid" role="list">
            {users.map((candidate) => {
              const selected = selectedId === candidate.id;
              return (
                <button key={candidate.id} type="button" className={`choice-card user-card${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={() => setSelectedId(candidate.id)}>
                  <span className="avatar" aria-hidden="true"><span>{candidate.name.trim().charAt(0) || "M"}</span></span>
                  <span className="choice-content"><strong>{candidate.name}</strong><span>{candidate.profileType ?? "Journey Staff"}</span></span>
                  <span className="selection-label">{selected ? "선택됨" : "선택"}</span>
                </button>
              );
            })}
          </div>
          <div className="page-actions"><PrimaryButton type="button" disabled={!selectedId} isLoading={isSubmitting} onClick={() => void handleLogin()}>직원 화면 시작하기</PrimaryButton></div>
        </>
      )}
      <p className="login-switch"><Link to="/login">고객 로그인으로 돌아가기</Link></p>
    </AppLayout>
  );
}
