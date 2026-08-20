import type { DemoUser } from "@mcm/shared";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffDemoUsers } from "../api/demo-api";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StaffHeader } from "../components/StaffHeader";
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
    <div className="staffx-page staffx-login">
      <StaffHeader isLogin />
      <main className="staffx-login__main">
        <section className="staffx-login__visual" aria-labelledby="staff-login-visual-title">
          <img src="/assets/login/store-hero.png" alt="MCM 매장 내부" />
          <div className="staffx-login__visual-copy">
            <p>STORE EXPERIENCE · MCM</p>
            <h2 id="staff-login-visual-title">THE JOURNEY<br />BEGINS ON<br />THE FLOOR.</h2>
            <span>예약 고객의 취향과 Journey를 연결하는 매장 경험</span>
          </div>
          <div className="staffx-login__visual-index" aria-hidden="true">
            <span>01</span><span>RESERVATION DESK</span>
            <span>02</span><span>CUSTOMER BRIEFING</span>
          </div>
        </section>

        <section className="staffx-login__access" aria-labelledby="staff-login-title">
          <div className="staffx-login__access-inner">
            <div className="staffx-login__heading">
              <p>STAFF ACCESS</p>
              <h1 id="staff-login-title">MCM Journey Staff</h1>
              <span>오늘 매장 Journey를 운영할 직원 프로필을 선택하세요.</span>
            </div>

            <div className="staffx-login__content">
              {isLoading && <LoadingState message="직원 프로필을 불러오고 있습니다." />}
              {!isLoading && error && <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />}
              {!isLoading && !error && users.length === 0 && (
                <ErrorState message="사용 가능한 직원 프로필이 없습니다." onRetry={() => setAttempt((value) => value + 1)} />
              )}
              {!isLoading && !error && users.length > 0 && (
                <>
                  <div className="staffx-profile-list" role="list" aria-label="직원 프로필">
                    {users.map((candidate, index) => {
                      const selected = selectedId === candidate.id;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className={`staffx-profile${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedId(candidate.id)}
                        >
                          <span className="staffx-profile__order" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                          <span className="staffx-profile__avatar" aria-hidden="true">
                            <span>{candidate.name.trim().charAt(0) || "M"}</span>
                            {candidate.avatarUrl && <img src={candidate.avatarUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
                          </span>
                          <span className="staffx-profile__copy">
                            <strong>{candidate.name}</strong>
                            <span>{candidate.profileType ?? "Journey Staff"}</span>
                          </span>
                          <span className="staffx-profile__selection">{selected ? "선택됨" : "선택"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="staffx-primary-action"
                    type="button"
                    disabled={!selectedId || isSubmitting}
                    aria-busy={isSubmitting}
                    onClick={() => void handleLogin()}
                  >
                    {isSubmitting ? "매장 화면 준비 중..." : "직원 화면 시작하기"}
                    {!isSubmitting && <span aria-hidden="true">→</span>}
                  </button>
                </>
              )}
            </div>

            <div className="staffx-login__footer">
              <p>고객 Journey를 시작하시나요?</p>
              <Link to="/login">고객 로그인으로 돌아가기 <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
