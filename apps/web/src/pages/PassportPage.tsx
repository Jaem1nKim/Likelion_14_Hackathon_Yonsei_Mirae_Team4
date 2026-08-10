import type { ReservationStatus, ReservationView } from "@mcm/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getReservation } from "../api/reservation-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { useDemoUser } from "../hooks/useDemoUser";
import { useReservationDraft } from "../state/reservation-draft";

const STATUS_COPY: Record<ReservationStatus, string> = {
  RESERVED: "매장 도착 후 이 Passport를 직원에게 보여주세요.",
  CHECKED_IN: "체크인이 완료되었습니다.",
  COMPLETED: "Journey가 완료되었습니다.",
  CANCELLED: "현재 사용할 수 없는 예약입니다.",
  EXPIRED: "현재 사용할 수 없는 예약입니다.",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  RESERVED: "예약 완료",
  CHECKED_IN: "체크인 완료",
  COMPLETED: "Journey 완료",
  CANCELLED: "취소됨",
  EXPIRED: "만료됨",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PassportPage() {
  const navigate = useNavigate();
  const { reservationId } = useParams();
  const { user, logout } = useDemoUser();
  const { clearDraft } = useReservationDraft();
  const [reservation, setReservation] = useState<ReservationView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    clearDraft();
  }, [clearDraft]);

  useEffect(() => {
    if (!reservationId) {
      setError("예약 ID가 없습니다.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getReservation(reservationId, controller.signal)
      .then(setReservation)
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
  }, [attempt, reservationId]);

  return (
    <AppLayout>
      <ProgressIndicator current={4} />
      <PageHeader
        eyebrow="YOUR VISIT PASS"
        title="MCM Journey Passport"
        description="매장 방문 전 준비가 완료되었습니다."
      />
      {isLoading && <LoadingState message="Passport를 불러오고 있습니다." />}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!isLoading && !error && reservation && user && (
        <>
          <article className="passport" aria-labelledby="passport-title">
            <header className="passport-header">
              <div>
                <p className="eyebrow">MCM JOURNEY</p>
                <h2 id="passport-title">{STATUS_LABEL[reservation.status]}</h2>
              </div>
              <span className={`status-badge status-${reservation.status.toLowerCase()}`}>
                {reservation.status}
              </span>
            </header>

            <div className="passport-grid">
              <div>
                <span>고객</span>
                <strong>{user.name}</strong>
              </div>
              <div>
                <span>매장</span>
                <strong>{reservation.store.name}</strong>
                <small>{reservation.store.location}</small>
              </div>
              <div>
                <span>방문 일시</span>
                <strong>{formatDateTime(reservation.reservedAt)}</strong>
              </div>
              <div>
                <span>오늘의 방향</span>
                <strong>{reservation.startAnswerLabel}</strong>
              </div>
            </div>

            <section className="checkin-block" aria-labelledby="checkin-code-title">
              <p className="qr-ready">QR 준비 완료</p>
              <h3 id="checkin-code-title">수동 체크인 코드</h3>
              <output className="reservation-code" aria-label="수동 체크인 코드">
                {reservation.reservationCode}
              </output>
              <p>{STATUS_COPY[reservation.status]}</p>
              <details>
                <summary>QR 토큰 확인</summary>
                <code>{reservation.qrToken}</code>
              </details>
            </section>
          </article>

          <div className="page-actions passport-actions">
            {reservation.status === "RESERVED" && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate("/store/check-in", {
                  state: { reservationCode: reservation.reservationCode },
                })}
              >
                매장 체크인
              </button>
            )}
            <button className="button button-secondary" type="button" onClick={() => navigate("/profile")}>
              프로필로 돌아가기
            </button>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                clearDraft();
                navigate("/reserve");
              }}
            >
              새 예약 만들기
            </button>
            <button
              className="button button-text"
              type="button"
              onClick={() => {
                clearDraft();
                logout();
                navigate("/login", { replace: true });
              }}
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </AppLayout>
  );
}
