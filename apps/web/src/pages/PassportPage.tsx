import type { ReservationStatus, ReservationView } from "@mcm/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getReservation } from "../api/reservation-api";
import { ErrorState } from "../components/ErrorState";
import { IntroductionHeader } from "../components/IntroductionHeader";
import { LoadingState } from "../components/LoadingState";
import { useDemoUser } from "../hooks/useDemoUser";
import { useReservationDraft } from "../state/reservation-draft";

const passportAssetRoot = "/assets/passport";

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

const STATUS_TITLE: Record<ReservationStatus, string> = {
  RESERVED: "예약이 완료되었습니다",
  CHECKED_IN: "체크인이 완료되었습니다",
  COMPLETED: "Journey가 완료되었습니다",
  CANCELLED: "예약을 사용할 수 없습니다",
  EXPIRED: "예약을 사용할 수 없습니다",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeStyle: "short" }).format(new Date(value));
}

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
    <div className="passport-figma-page">
      <IntroductionHeader logoSrc={`${passportAssetRoot}/mcm-logo.svg`} />
      <main className="passport-figma-page__body">
        {isLoading && (
          <div className="passport-figma-page__state">
            <LoadingState message="Passport를 불러오고 있습니다." />
          </div>
        )}
        {!isLoading && error && (
          <div className="passport-figma-page__state">
            <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
          </div>
        )}
        {!isLoading && !error && reservation && user && (
          <>
            <header className="passport-figma-page__heading">
              <h1>{STATUS_TITLE[reservation.status]}</h1>
              <span className={`passport-status passport-status--${reservation.status.toLowerCase()}`}>
                {STATUS_LABEL[reservation.status]}
              </span>
            </header>

            <article className="passport passport-figma-content" aria-labelledby="passport-title">
              <div className="passport-figma-content__left">
                <section className="passport-figma-card" aria-labelledby="passport-title">
                  <h2 id="passport-title">예약 요약</h2>
                  <dl className="passport-summary-list">
                    <div>
                      <dt>고객</dt>
                      <dd><strong>{user.name}</strong><small>{user.email}</small></dd>
                    </div>
                    <div>
                      <dt>매장</dt>
                      <dd><strong>{reservation.store.name}</strong><small>{reservation.store.location}</small></dd>
                    </div>
                    <div><dt>날짜</dt><dd>{formatDate(reservation.reservedAt)}</dd></div>
                    <div><dt>시간</dt><dd>{formatTime(reservation.reservedAt)}</dd></div>
                    <div><dt>시작 질문 답변</dt><dd>{reservation.startAnswerLabel}</dd></div>
                    <div>
                      <dt>예약번호</dt>
                      <dd><strong className="passport-summary-code">{reservation.reservationCode}</strong></dd>
                    </div>
                    {reservation.checkedInAt && (
                      <div><dt>체크인 일시</dt><dd>{formatDateTime(reservation.checkedInAt)}</dd></div>
                    )}
                  </dl>
                </section>

                <section className="passport-figma-card passport-experience-card" aria-labelledby="experience-title">
                  <h2 id="experience-title">체험 안내</h2>
                  <p>{STATUS_COPY[reservation.status]}</p>
                  <small>매장 입장 시 예약 코드와 QR 토큰을 직원에게 제시해 주세요.</small>
                </section>
              </div>

              <section className="passport-figma-card passport-qr-card" aria-labelledby="checkin-code-title">
                <div className="passport-qr-card__heading">
                  <h2 id="checkin-code-title">입장용 QR 코드</h2>
                  <span className="qr-ready">QR 준비 완료</span>
                </div>
                <div className="passport-qr-token" aria-label="입장용 QR 토큰">
                  <span>QR TOKEN</span>
                  <code>{reservation.qrToken}</code>
                </div>
                <p>이 토큰으로 매장 입장 및 Journey를 불러옵니다.</p>
                <output className="reservation-code" aria-label="수동 체크인 코드">
                  {reservation.reservationCode}
                </output>
              </section>
            </article>

            <div className="passport-figma-actions">
              {reservation.status === "RESERVED" && (
                <button
                  className="passport-figma-button passport-figma-button--primary"
                  type="button"
                  onClick={() => navigate("/store/check-in", {
                    state: { reservationCode: reservation.reservationCode },
                  })}
                >
                  매장 체크인
                </button>
              )}
              <button
                className="passport-figma-button passport-figma-button--secondary"
                type="button"
                onClick={() => {
                  clearDraft();
                  navigate("/reserve");
                }}
              >
                새 예약 만들기
              </button>
              <button
                className="passport-figma-button passport-figma-button--secondary"
                type="button"
                onClick={() => navigate("/profile")}
              >
                프로필로 돌아가기
              </button>
              <button
                className="passport-figma-button passport-figma-button--text"
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
      </main>
    </div>
  );
}
