import { resolveJourneyScreen } from "@mcm/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { startJourney } from "../api/journey-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PrimaryButton } from "../components/PrimaryButton";
import { journeyErrorMessage } from "../features/journey/journey-errors";
import { journeyPathForAggregate } from "../features/journey/journey-navigation";
import { useJourneyAggregate } from "../features/journey/use-journey-aggregate";

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

  return (
    <AppLayout>
      {isLoading && <LoadingState message="Journey 상태를 불러오고 있습니다." />}
      {!isLoading && error && <ErrorState message={error} onRetry={retry} />}
      {!isLoading && !error && aggregate && resolveJourneyScreen(aggregate) === "INTRO" && (
        <section className="journey-intro" aria-labelledby="journey-intro-title">
          <p className="eyebrow">IN-STORE JOURNEY</p>
          <h1 id="journey-intro-title">MCM Journey</h1>
          <p className="journey-intro-lead">
            당신의 취향과 오늘의 선택을 연결하는<br />매장 Journey를 시작합니다.
          </p>
          <dl className="intro-summary">
            <div><dt>오늘의 방향</dt><dd>{aggregate.reservation.startAnswerLabel}</dd></div>
            <div><dt>매장</dt><dd>{aggregate.reservation.store.name}</dd></div>
          </dl>
          {startError && <p className="form-error" role="alert">{startError}</p>}
          {isStarting && (
            <div className="journey-operation" role="status" aria-live="polite">
              <span className="loading-mark" aria-hidden="true" />
              <span>당신의 첫 Journey를 준비하고 있어요.</span>
            </div>
          )}
          <div className="page-actions">
            <PrimaryButton type="button" isLoading={isStarting} onClick={() => void handleStart()}>
              Journey 시작하기
            </PrimaryButton>
          </div>
        </section>
      )}
    </AppLayout>
  );
}
