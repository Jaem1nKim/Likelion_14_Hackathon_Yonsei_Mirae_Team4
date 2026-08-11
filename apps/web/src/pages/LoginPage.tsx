import type { DemoUser } from "@mcm/shared";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserConsent } from "../api/consent-api";
import { getCustomerDemoUsers } from "../api/demo-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { useDemoUser } from "../hooks/useDemoUser";

export function LoginPage() {
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
    void getCustomerDemoUsers(controller.signal)
      .then((customerUsers) => {
        setUsers(customerUsers.filter((user) => user.role === "CUSTOMER"));
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);

  const handleLogin = useCallback(async () => {
    if (!selectedId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const selectedUser = await login(selectedId);
      const { currentConsent } = await getUserConsent(selectedUser.id);
      navigate(currentConsent?.journeyDataAllowed ? "/profile" : "/consent", {
        replace: true,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, login, navigate, selectedId]);

  return (
    <AppLayout showUser={false}>
      <section className="login-intro">
        <PageHeader
          eyebrow="PRE-VISIT JOURNEY"
          title="MCM Journey Passport"
          description="방문 전 나의 취향과 오늘의 방향을 연결하는 Journey"
        />
      </section>

      {isLoading && <LoadingState message="데모 프로필을 불러오고 있습니다." />}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!isLoading && !error && users.length === 0 && (
        <ErrorState
          message="사용 가능한 고객 프로필이 없습니다."
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {!isLoading && !error && users.length > 0 && (
        <>
          <div className="section-heading">
            <h2>오늘의 프로필을 선택하세요</h2>
            <p>비밀번호 없이 시연용 고객 프로필로 시작합니다.</p>
          </div>
          <div className="choice-grid user-grid" role="list">
            {users.map((candidate) => {
              const selected = selectedId === candidate.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`choice-card user-card${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  <span className="avatar" aria-hidden="true">
                    {candidate.avatarUrl && (
                      <img
                        src={candidate.avatarUrl}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                    <span>{candidate.name.trim().charAt(0) || "M"}</span>
                  </span>
                  <span className="choice-content">
                    <strong>{candidate.name}</strong>
                    <span>{candidate.profileType ?? "Journey Customer"}</span>
                  </span>
                  <span className="selection-label">
                    {selected ? "선택됨" : "선택"}
                  </span>
                </button>
              );
            })}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="page-actions">
            <PrimaryButton
              type="button"
              disabled={!selectedId}
              isLoading={isSubmitting}
              onClick={() => void handleLogin()}
            >
              이 프로필로 시작하기
            </PrimaryButton>
          </div>
        </>
      )}
      <p className="login-switch"><Link to="/staff/login">직원용 화면으로 이동</Link></p>
    </AppLayout>
  );
}
