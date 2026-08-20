import { resolveJourneyScreen } from "@mcm/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { startJourney } from "../api/journey-api";
import { AppLayout } from "../components/AppLayout";
import { CustomerHeader } from "../components/CustomerHeader";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { journeyErrorMessage } from "../features/journey/journey-errors";
import { journeyPathForAggregate } from "../features/journey/journey-navigation";
import { useJourneyAggregate } from "../features/journey/use-journey-aggregate";

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function JourneyIntroPage() {
  const { journeyId } = useParams();
  const navigate = useNavigate();
  const { aggregate, isLoading, error, retry } = useJourneyAggregate(journeyId);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (!aggregate) return;
    if (resolveJourneyScreen(aggregate) !== "INTRO") {
      navigate(journeyPathForAggregate(aggregate), { replace: true });
    }
  }, [aggregate, navigate]);

  async function handleStart() {
    if (!journeyId || isStarting) return;
    setIsStarting(true);
    setStartError(null);
    try {
      const started = await startJourney(journeyId);
      navigate(journeyPathForAggregate(started), { replace: true });
    } catch (caught) {
      setStartError(journeyErrorMessage(caught));
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading) return <AppLayout><LoadingState message="Journey 상태를 불러오고 있습니다." /></AppLayout>;
  if (error) return <AppLayout><ErrorState message={error} onRetry={retry} /></AppLayout>;
  if (!aggregate || resolveJourneyScreen(aggregate) !== "INTRO") {
    return <AppLayout><LoadingState message="올바른 Journey 화면으로 이동하고 있습니다." /></AppLayout>;
  }

  const reservationStatus = aggregate.reservation.status === "CHECKED_IN"
    ? "체크인 완료"
    : aggregate.reservation.status;

  return (
    <div className="journey-intro-experience">
      <CustomerHeader className="journey-intro-experience__header" />
      <main className="journey-intro-experience__stage">
        <div className="journey-intro-experience__shade" aria-hidden="true" />
        <div className="journey-intro-experience__frame">
          <section className="journey-intro-experience__content" aria-labelledby="journey-intro-title">
            <p className="journey-intro-experience__eyebrow">IN-STORE JOURNEY · {reservationStatus}</p>
            <h1 id="journey-intro-title"><span>MCM</span> Journey</h1>
            <p className="journey-intro-experience__lead">
              이제, 당신의 선택을 따라<br />오늘의 Journey가 시작됩니다.
            </p>

            <article className="journey-intro-direction" aria-labelledby="journey-direction-title">
              <p id="journey-direction-title">YOUR DIRECTION TODAY</p>
              <blockquote>{aggregate.reservation.startAnswerLabel}</blockquote>
            </article>

            <dl className="journey-intro-details">
              <div>
                <dt>STORE</dt>
                <dd>
                  <strong>{aggregate.reservation.store.name}</strong>
                  {aggregate.reservation.store.location && <span>{aggregate.reservation.store.location}</span>}
                </dd>
              </div>
              <div>
                <dt>VISIT</dt>
                <dd><strong>{formatVisitDate(aggregate.reservation.reservedAt)}</strong></dd>
              </div>
            </dl>

            {startError && <p className="journey-intro-experience__error" role="alert">{startError}</p>}
            {isStarting && (
              <div className="journey-intro-experience__operation" role="status" aria-live="polite">
                <span className="loading-mark" aria-hidden="true" />
                <span>취향을 분석해 첫 Journey를 구성하고 있어요.</span>
              </div>
            )}

            <div className="journey-intro-experience__actions">
              <PrimaryButton type="button" isLoading={isStarting} onClick={() => void handleStart()}>
                Journey 시작하기
              </PrimaryButton>
              <p>세 번의 선택이 당신만의 MCM Look으로 이어집니다.</p>
            </div>
          </section>

          <p className="journey-intro-experience__edition" aria-hidden="true">
            MCM JOURNEY PASSPORT · STORE EDITION
          </p>
        </div>
      </main>
    </div>
  );
}
