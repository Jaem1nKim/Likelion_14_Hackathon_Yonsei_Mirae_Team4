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
import { createUuidV4 } from "../utils/uuid";

const STAGE_LABEL = { BAG: "BAG", APPAREL: "APPAREL", ACCESSORY: "ACCESSORY" } as const;
const STAGE_NUMBER = { BAG: 1, APPAREL: 2, ACCESSORY: 3 } as const;
const JOURNEY_NAV_VIEWS = ["select", "route", "progress"] as const;
const JOURNEY_VIEW_LABEL = {
  select: "제품 선택",
  route: "구역 안내",
  progress: "진행 현황",
} as const;

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
        interactionId: createUuidV4(),
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
  const aiPersonalized =
    !step.usedFallback &&
    step.recommendations.length > 0 &&
    step.recommendations.every((recommendation) => recommendation.isAiSelected);
  const aiPersonalizationCopy = {
    BAG: "취향 프로필과 오늘의 방향을 바탕으로 첫 Journey를 구성했어요.",
    APPAREL: "방금 선택한 가방과 취향을 연결해 다음 스타일을 구성했어요.",
    ACCESSORY: "지금까지의 선택을 분석해 마지막 디테일을 추천했어요.",
  }[activeStage];

  if (view === "select") {
    const stageNumber = STAGE_NUMBER[activeStage];
    return (
      <div className="journey-select-page">
        <main className="journey-select-experience">
          <div className="journey-select-overlay" aria-hidden="true" />
          <div className="journey-select-body">
            <div className="journey-select-main">
              <p className="journey-select-step" aria-label={`Journey ${stageNumber}단계 중 3단계`}>
                {stageNumber} / 3
              </p>

              <div className="journey-select-heading-row">
                <header className="journey-select-heading">
                  <p>{String(stageNumber).padStart(2, "0")} — {STAGE_LABEL[activeStage]}</p>
                  <h1>{step.scenarioTitle}</h1>
                  <p>{step.scenarioText}</p>
                </header>

                <button
                  className="journey-select-zone"
                  type="button"
                  onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/route`)}
                >
                  <span>{step.zone.name}{step.zone.floor ? ` · ${step.zone.floor}` : ""}</span>
                  <small>{step.zone.directionText}</small>
                </button>
              </div>

              {aiPersonalized && (
                <aside className="journey-select-ai" aria-label="AI 맞춤 추천">
                  <strong>✦ AI 맞춤 추천</strong>
                  <span>{aiPersonalizationCopy}</span>
                </aside>
              )}

              <section className="journey-select-recommendations" aria-labelledby="recommendations-title">
                <h2 id="recommendations-title" className="visually-hidden">오늘의 추천</h2>
                <div className="product-grid">
                  {step.recommendations.map((recommendation) => (
                    <ProductRecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      selected={step.selectedProduct?.id === recommendation.product.id}
                      rejected={rejectedIds.has(recommendation.product.id)}
                      pending={pendingProductId === recommendation.product.id}
                      disabled={pendingProductId !== null || operation !== null}
                      aiPersonalized={aiPersonalized}
                      onInteraction={(type) => void handleInteraction(recommendation.product.id, type)}
                    />
                  ))}
                </div>
              </section>

              {(step.heritageTitle || step.heritageText) && (
                <aside className="journey-select-heritage" aria-label="MCM Heritage">
                  <strong>{step.heritageTitle ?? step.zone.heritageTitle}</strong>
                  <span>{step.heritageText ?? step.zone.heritageStory}</span>
                </aside>
              )}

              {actionError && <p className="journey-select-error" role="alert">{actionError}</p>}
              {operation && (
                <div className="journey-select-operation" role="status" aria-live="polite">
                  <span className="loading-mark" aria-hidden="true" />
                  <span>{operation === "next" ? "지금까지의 선택을 반영해 다음 스타일을 찾고 있어요." : "선택의 흐름을 분석해 Journey Signature를 완성하고 있어요."}</span>
                </div>
              )}
            </div>

            <footer className="journey-select-actions">
              <button
                className="journey-select-progress"
                type="button"
                disabled={operation !== null || pendingProductId !== null}
                onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/progress`)}
              >
                <span aria-hidden="true">←</span>
                진행 현황
              </button>
              {step.stage === "ACCESSORY" ? (
                <PrimaryButton type="button" disabled={!currentAggregate.canFinishJourney} isLoading={operation === "finish"} onClick={() => void handleFinish()}>
                  Journey 완성하기 <span aria-hidden="true">→</span>
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" disabled={!step.selectedProduct} isLoading={operation === "next"} onClick={() => void handleNext()}>
                  다음 Journey <span aria-hidden="true">→</span>
                </PrimaryButton>
              )}
            </footer>
          </div>
        </main>
      </div>
    );
  }

  if (view === "route" || view === "progress") {
    const stageNumber = STAGE_NUMBER[activeStage];
    const completedByStage = new Map(
      currentAggregate.completedSteps.map((completedStep) => [completedStep.stage, completedStep]),
    );
    const progressStages = (["BAG", "APPAREL", "ACCESSORY"] as const).map((stage, index) => {
      const completedStep = completedByStage.get(stage);
      const stageStep = completedStep ?? (currentStep.stage === stage ? currentStep : null);
      const status = completedStep ? "completed" : currentStep.stage === stage ? "current" : "upcoming";
      return { stage, number: index + 1, step: stageStep, status };
    });

    return (
      <div className={`journey-support-page journey-support-page--${view}`}>
        <main className="journey-support-experience">
          <div className="journey-support-overlay" aria-hidden="true" />
          <div className="journey-support-body">
            <header className="journey-support-topbar">
              <p aria-label={`Journey ${stageNumber}단계 중 3단계`}>{stageNumber} / 3</p>
              <span>MCM JOURNEY PASSPORT</span>
            </header>

            <nav className="journey-support-nav" aria-label="현재 Journey 보기">
              {JOURNEY_NAV_VIEWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={view === item ? "is-active" : ""}
                  aria-current={view === item ? "page" : undefined}
                  onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/${item}`)}
                >
                  <span>{String(JOURNEY_NAV_VIEWS.indexOf(item) + 1).padStart(2, "0")}</span>
                  {JOURNEY_VIEW_LABEL[item]}
                </button>
              ))}
            </nav>

            {view === "route" ? (
              <section className="journey-support-route" aria-labelledby="zone-title">
                <div className="journey-support-route__intro">
                  <p>{String(stageNumber).padStart(2, "0")} — NEXT SPACE</p>
                  <h1>다음 Journey 공간으로</h1>
                  <span>{currentStep.scenarioText}</span>
                </div>

                <article className="journey-support-destination">
                  <div className="journey-support-destination__marker" aria-hidden="true">
                    <span>{currentStep.zone.floor ?? String(stageNumber).padStart(2, "0")}</span>
                  </div>
                  <div className="journey-support-destination__copy">
                    <p>NEXT ZONE</p>
                    <h2 id="zone-title">{currentStep.zone.name}</h2>
                    {currentStep.zone.floor && <strong>{currentStep.zone.floor}</strong>}
                    <p>{currentStep.zone.directionText}</p>
                    <dl>
                      <div><dt>JOURNEY STEP</dt><dd>{STAGE_LABEL[activeStage]}</dd></div>
                      <div><dt>ZONE CATEGORY</dt><dd>{currentStep.zone.category}</dd></div>
                    </dl>
                  </div>
                </article>

                <footer className="journey-support-route__footer">
                  <p>안내된 공간에서 이번 단계의 실제 추천 상품을 확인하세요.</p>
                  <button type="button" onClick={() => navigate(journeyPathForAggregate(currentAggregate))}>
                    추천 제품 보기 <span aria-hidden="true">→</span>
                  </button>
                </footer>
              </section>
            ) : (
              <section className="journey-support-progress" aria-labelledby="progress-title">
                <header className="journey-support-progress__heading">
                  <div>
                    <p>YOUR JOURNEY · CURRENT FLOW</p>
                    <h1 id="progress-title">선택의 흐름</h1>
                  </div>
                  <span>완료한 선택과 현재 단계를 한눈에 확인하세요.</span>
                </header>

                <div className="journey-support-progress__summary">
                  <JourneyStageProgress aggregate={currentAggregate} />
                </div>

                <ol className="journey-support-timeline" aria-label="Journey 선택 흐름">
                  {progressStages.map((item) => {
                    const selectedProduct = item.step?.selectedProduct;
                    const statusLabel = item.status === "completed" ? "완료" : item.status === "current" ? "현재 단계" : "예정";
                    return (
                      <li className={`is-${item.status}`} key={item.stage} aria-current={item.status === "current" ? "step" : undefined}>
                        <div className="journey-support-timeline__index">
                          <span>{String(item.number).padStart(2, "0")}</span>
                          <small>{statusLabel}</small>
                        </div>
                        <div className="journey-support-timeline__media">
                          {selectedProduct ? (
                            <>
                              <img
                                src={selectedProduct.imageUrl}
                                alt={selectedProduct.name}
                                onError={(event) => event.currentTarget.parentElement?.classList.add("is-unavailable")}
                              />
                              <span aria-hidden="true">MCM</span>
                            </>
                          ) : (
                            <span aria-hidden="true">{item.stage}</span>
                          )}
                        </div>
                        <div className="journey-support-timeline__copy">
                          <p>{item.stage}</p>
                          <h2>{selectedProduct?.name ?? (item.status === "upcoming" ? "아직 시작 전" : "선택 진행 중")}</h2>
                          {selectedProduct?.color && <span>{selectedProduct.color}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <footer className="journey-support-progress__footer">
                  <p>{stageNumber} / 3 · {STAGE_LABEL[activeStage]}</p>
                  <button type="button" onClick={() => navigate(journeyPathForAggregate(currentAggregate))}>
                    제품 선택으로 돌아가기 <span aria-hidden="true">→</span>
                  </button>
                </footer>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <AppLayout>
      <JourneyStageProgress aggregate={currentAggregate} />
      {aiPersonalized && (
        <aside className="ai-personalization" aria-label="AI 맞춤 추천">
          <strong>✦ AI 맞춤 추천</strong>
          <span>{aiPersonalizationCopy}</span>
        </aside>
      )}
      <PageHeader
        eyebrow={`STEP ${step.stepNumber} · ${STAGE_LABEL[activeStage]}`}
        title={step.scenarioTitle}
        description={step.scenarioText}
      />

      <nav className="journey-view-nav" aria-label="현재 Journey 보기">
        {JOURNEY_NAV_VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => navigate(`/journey/${encodeURIComponent(currentAggregate.journey.id)}/${item}`)}
          >
            {JOURNEY_VIEW_LABEL[item]}
          </button>
        ))}
      </nav>

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

    </AppLayout>
  );
}
