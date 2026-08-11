import type { InteractionType, JourneyAggregate } from "@mcm/shared";
import { resolveJourneyScreen } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createJourneyInteraction,
  finishJourney,
  nextJourney,
} from "../api/journey-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { JourneyStageProgress } from "../features/journey/JourneyStageProgress";
import { isJourneyError, journeyErrorMessage } from "../features/journey/journey-errors";
import {
  journeyPathForAggregate,
  type ActiveJourneyView,
} from "../features/journey/journey-navigation";
import { useJourneyAggregate } from "../features/journey/use-journey-aggregate";
import { ProductRecommendationCard } from "../features/product-selection/ProductRecommendationCard";

const STAGE_LABEL = { BAG: "BAG", APPAREL: "APPAREL", ACCESSORY: "ACCESSORY" } as const;

type Props = { view: ActiveJourneyView };
type Operation = "next" | "finish" | null;

function CompletedState({ journeyId }: { journeyId: string }) {
  const navigate = useNavigate();
  return (
    <section className="journey-complete" aria-labelledby="journey-complete-title">
      <p className="eyebrow">JOURNEY COMPLETE</p>
      <h1 id="journey-complete-title">Journey가 완성되었습니다.</h1>
      <p>당신의 Journey Signature가 준비되었습니다.</p>
      <div className="page-actions page-actions-split">
        <button className="button button-secondary" type="button" onClick={() => navigate("/profile")}> 
          프로필로 돌아가기
        </button>
        <button className="button button-primary" type="button" onClick={() => navigate(`/journey/${encodeURIComponent(journeyId)}/result`)}>
          Journey 결과 보기
        </button>
      </div>
    </section>
  );
}

export function JourneyPage({ view }: Props) {
  const { journeyId } = useParams();
  const navigate = useNavigate();
  const { aggregate, setAggregate, isLoading, error, reload, retry } = useJourneyAggregate(journeyId);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const screen = useMemo(() => {
    if (!aggregate) return null;
    try {
      return resolveJourneyScreen(aggregate);
    } catch {
      return null;
    }
  }, [aggregate]);

  useEffect(() => {
    if (!aggregate || !screen) return;
    if (screen === "INTRO") navigate(journeyPathForAggregate(aggregate), { replace: true });
    if (screen === "RESULT" && view !== "decision") {
      navigate(journeyPathForAggregate(aggregate), { replace: true });
    }
  }, [aggregate, navigate, screen, view]);

  if (isLoading) return <AppLayout><LoadingState message="Journey를 복원하고 있습니다." /></AppLayout>;
  if (error) return <AppLayout><ErrorState message={error} onRetry={retry} /></AppLayout>;
  if (!aggregate || !screen) {
    return <AppLayout><ErrorState message="Journey 상태를 복원할 수 없습니다." onRetry={retry} /></AppLayout>;
  }
  if (screen === "RESULT") return <AppLayout><CompletedState journeyId={aggregate.journey.id} /></AppLayout>;
  const step = aggregate.currentStep;
  if (screen === "INTRO" || !step) return <AppLayout><LoadingState message="올바른 Journey 화면으로 이동하고 있습니다." /></AppLayout>;

  const currentAggregate = aggregate;
  const currentStep = step;
  const rejectedIds = new Set(
    currentAggregate.interactions.filter((item) => item.type === "REJECTED").map((item) => item.productId),
  );

  async function refreshAndRoute() {
    const latest = await reload();
    if (latest) navigate(journeyPathForAggregate(latest, view), { replace: true });
    return latest;
  }

  async function handleInteraction(productId: string, type: InteractionType) {
    if (!journeyId || pendingProductId || operation) return;
    setPendingProductId(productId);
    setActionError(null);
    try {
      const updated = await createJourneyInteraction(journeyId, {
        interactionId: crypto.randomUUID(),
        journeyStepId: currentStep.id,
        productId,
        type,
      });
      setAggregate(updated);
    } catch (caught) {
      setActionError(journeyErrorMessage(caught));
    } finally {
      setPendingProductId(null);
    }
  }

  async function handleNext() {
    if (!journeyId || operation || !currentStep.selectedProduct) return;
    setOperation("next");
    setActionError(null);
    try {
      const updated = await nextJourney(journeyId, {
        expectedStepNumber: currentAggregate.journey.currentStepNumber,
      });
      setAggregate(updated);
      navigate(journeyPathForAggregate(updated), { replace: true });
    } catch (caught) {
      if (isJourneyError(caught, "STALE_JOURNEY_STEP")) await refreshAndRoute();
      else setActionError(journeyErrorMessage(caught));
    } finally {
      setOperation(null);
    }
  }

  async function handleFinish() {
    if (!journeyId || operation || !currentAggregate.canFinishJourney) return;
    setOperation("finish");
    setActionError(null);
    try {
      const updated = await finishJourney(journeyId, {
        expectedStepNumber: currentAggregate.journey.currentStepNumber,
      });
      setAggregate(updated);
      navigate(journeyPathForAggregate(updated), { replace: true });
    } catch (caught) {
      if (isJourneyError(caught, "STALE_JOURNEY_STEP") || isJourneyError(caught, "MINIMUM_SELECTION_REQUIRED")) {
        await refreshAndRoute();
      } else {
        setActionError(journeyErrorMessage(caught));
      }
    } finally {
      setOperation(null);
    }
  }

  const activeStage = step.stage as keyof typeof STAGE_LABEL;

  return (
    <AppLayout>
      <JourneyStageProgress aggregate={currentAggregate} />
      <PageHeader
        eyebrow={`STEP ${step.stepNumber} · ${STAGE_LABEL[activeStage]}`}
        title={step.scenarioTitle}
        description={step.scenarioText}
      />

      <nav className="journey-view-nav" aria-label="현재 Journey 보기">
        {(["select", "route", "progress", "decision"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={view === item ? "is-active" : ""}
            aria-current={view === item ? "page" : undefined}
            onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/${item}`)}
          >
            {{ select: "제품 선택", route: "구역 안내", progress: "진행 현황", decision: "완성하기" }[item]}
          </button>
        ))}
      </nav>

      {view === "route" && (
        <section className="zone-focus" aria-labelledby="zone-title">
          <p className="eyebrow">NEXT ZONE</p>
          <h2 id="zone-title">{step.zone.name}</h2>
          {step.zone.floor && <span className="zone-floor">{step.zone.floor}</span>}
          <p>{step.zone.directionText}</p>
          <button className="button button-primary" type="button" onClick={() => navigate(journeyPathForAggregate(currentAggregate))}>
            추천 제품 보기
          </button>
        </section>
      )}

      {view === "progress" && (
        <section className="progress-detail" aria-labelledby="progress-title">
          <p className="eyebrow">YOUR JOURNEY</p>
          <h2 id="progress-title">선택의 흐름</h2>
          {[...currentAggregate.completedSteps, step].map((item) => (
            <div key={item.id} className="progress-detail-row">
              <span>{item.stage}</span>
              <strong>{item.selectedProduct?.name ?? "선택 진행 중"}</strong>
              <small>{item.status === "COMPLETED" ? "완료" : "현재"}</small>
            </div>
          ))}
        </section>
      )}

      {view === "decision" && (
        <section className="decision-panel" aria-labelledby="decision-title">
          <p className="eyebrow">JOURNEY DECISION</p>
          <h2 id="decision-title">지금까지의 선택으로 Journey를 완성할까요?</h2>
          <p>{currentAggregate.canFinishJourney ? "Journey Signature를 만들 준비가 되었습니다." : "현재 단계에서 제품을 선택하면 완성할 수 있습니다."}</p>
          <PrimaryButton type="button" disabled={!currentAggregate.canFinishJourney} isLoading={operation === "finish"} onClick={() => void handleFinish()}>
            Journey 완성하기
          </PrimaryButton>
        </section>
      )}

      {view === "select" && (
        <>
          <section className="zone-strip" aria-label="현재 매장 구역">
            <div><span>NEXT ZONE</span><strong>{step.zone.name}</strong></div>
            <p>{step.zone.directionText}</p>
            <button className="button button-text" type="button" onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/route`)}>구역 자세히</button>
          </section>

          {(step.heritageTitle || step.heritageText) && (
            <section className="heritage-panel" aria-labelledby="heritage-title">
              <p className="eyebrow">MCM HERITAGE</p>
              <h2 id="heritage-title">{step.heritageTitle ?? step.zone.heritageTitle}</h2>
              <p>{step.heritageText ?? step.zone.heritageStory}</p>
            </section>
          )}

          <section aria-labelledby="recommendations-title">
            <div className="section-heading">
              <h2 id="recommendations-title">오늘의 추천</h2>
              <p>제품을 직접 비교하고 현재 Journey에 연결할 하나를 선택하세요.</p>
            </div>
            <div className="product-grid">
              {step.recommendations.map((recommendation) => (
                <ProductRecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  selected={step.selectedProduct?.id === recommendation.product.id}
                  rejected={rejectedIds.has(recommendation.product.id)}
                  pending={pendingProductId === recommendation.product.id}
                  disabled={pendingProductId !== null || operation !== null}
                  onInteraction={(type) => void handleInteraction(recommendation.product.id, type)}
                />
              ))}
            </div>
          </section>

          {actionError && <p className="form-error" role="alert">{actionError}</p>}
          {operation && (
            <div className="journey-operation" role="status" aria-live="polite">
              <span className="loading-mark" aria-hidden="true" />
              <span>{operation === "next" ? "지금까지의 선택을 연결하고 있어요." : "Journey Signature를 완성하고 있어요."}</span>
            </div>
          )}
          <div className="page-actions page-actions-split journey-actions">
            <button className="button button-secondary" type="button" onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/progress`)}>
              진행 현황
            </button>
            {step.stage === "ACCESSORY" ? (
              <PrimaryButton type="button" disabled={!currentAggregate.canFinishJourney} isLoading={operation === "finish"} onClick={() => void handleFinish()}>
                Journey 완성하기
              </PrimaryButton>
            ) : (
              <PrimaryButton type="button" disabled={!step.selectedProduct} isLoading={operation === "next"} onClick={() => void handleNext()}>
                다음 Journey
              </PrimaryButton>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
