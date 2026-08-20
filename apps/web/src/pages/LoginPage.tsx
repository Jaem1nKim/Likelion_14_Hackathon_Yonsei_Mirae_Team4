import type { DemoUser } from "@mcm/shared";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserConsent } from "../api/consent-api";
import { getCustomerDemoUsers } from "../api/demo-api";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { CustomerHeader } from "../components/CustomerHeader";
import { useDemoUser } from "../hooks/useDemoUser";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useDemoUser();
  const shouldStartReservation =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    location.state.from === "/reserve";
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
      if (shouldStartReservation) {
        navigate("/reserve", { replace: true });
        return;
      }
      const { currentConsent } = await getUserConsent(selectedUser.id);
      navigate(currentConsent?.journeyDataAllowed ? "/profile" : "/consent", {
        replace: true,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, login, navigate, selectedId, shouldStartReservation]);

  return (
    <div className="login-experience-page">
      <CustomerHeader className="login-experience-header" />

      <main className="login-experience-main">
        <section className="login-experience-visual" aria-labelledby="login-visual-title">
          <img src="/assets/login/store-hero.png" alt="MCM 매장 내부" />
          <div className="login-experience-visual-copy">
            <p>MCM JOURNEY PASSPORT</p>
            <h1 id="login-visual-title">WHERE WILL<br />YOUR CHOICE<br />TAKE YOU?</h1>
            <span>당신의 선택으로 시작되는 새로운 Journey</span>
          </div>
          <p className="login-experience-edition">PERSONAL JOURNEY · MCM</p>
        </section>

        <section className="login-experience-entry" aria-labelledby="login-entry-title">
          <div className="login-experience-entry-inner">
            <div className="login-experience-heading">
              <p>WELCOME TO YOUR JOURNEY</p>
              <h2 id="login-entry-title">오늘의 프로필을 선택하세요</h2>
              <span>당신의 취향과 Journey 기록을 이어갈 참가자를 선택해주세요.</span>
            </div>

            {shouldStartReservation && (
              <div className="login-experience-context" role="status">
                <span aria-hidden="true">01</span>
                프로필 선택 후 예약 Journey를 이어서 시작합니다.
              </div>
            )}

            <div className="login-experience-content">
              {isLoading && <LoadingState message="Journey 프로필을 불러오고 있습니다." />}
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
                  <div className="login-profile-list" role="list" aria-label="Journey 참가자 프로필">
                    {users.map((candidate, index) => {
                      const selected = selectedId === candidate.id;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className={`login-profile-card${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedId(candidate.id)}
                        >
                          <span className="login-profile-order" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                          <span className="login-profile-avatar" aria-hidden="true">
                            <span>{candidate.name.trim().charAt(0) || "M"}</span>
                            {candidate.avatarUrl && (
                              <img
                                src={candidate.avatarUrl}
                                alt=""
                                onError={(event) => {
                                  event.currentTarget.hidden = true;
                                }}
                              />
                            )}
                          </span>
                          <span className="login-profile-copy">
                            <strong>{candidate.name}</strong>
                            <span>{candidate.profileType ?? "Journey Customer"}</span>
                          </span>
                          <span className="login-profile-selection">{selected ? "선택됨" : "선택"}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="login-experience-submit"
                    type="button"
                    disabled={!selectedId || isSubmitting}
                    aria-busy={isSubmitting}
                    onClick={() => void handleLogin()}
                  >
                    {isSubmitting ? "Journey 준비 중..." : "이 프로필로 시작하기"}
                    {!isSubmitting && <span aria-hidden="true">→</span>}
                  </button>
                </>
              )}
            </div>

            <div className="login-experience-footer">
              <p>매장 운영을 위한 화면이 필요하신가요?</p>
              <Link to="/staff/login">직원용 화면으로 이동 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
