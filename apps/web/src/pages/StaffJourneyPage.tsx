import type { StaffJourneyView } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffJourney } from "../api/staff-api";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StaffHeader } from "../components/StaffHeader";

function formatReservationTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function startQuestionLabel(code: string) {
  return code === "TODAY_INTENT"
    ? "오늘 매장에서 어떤 변화를 시도하고 싶나요?"
    : code;
}

export function StaffJourneyPage() {
  const { journeyId } = useParams();
  const [view, setView] = useState<StaffJourneyView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!journeyId) {
      setError("Journey 정보를 확인할 수 없습니다.");
      return;
    }
    const controller = new AbortController();
    setView(null);
    setError(null);
    void getStaffJourney(journeyId, controller.signal)
      .then(setView)
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(errorMessage(caught));
      });
    return () => controller.abort();
  }, [attempt, journeyId]);

  const productNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const step of view?.steps ?? []) {
      if (step.selectedProduct) names.set(step.selectedProduct.id, step.selectedProduct.name);
      for (const recommendation of step.recommendations) names.set(recommendation.product.id, recommendation.product.name);
    }
    return names;
  }, [view]);

  if (error) {
    return (
      <div className="staffx-page">
        <StaffHeader />
        <main className="staffx-main"><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></main>
      </div>
    );
  }
  if (!view) {
    return (
      <div className="staffx-page">
        <StaffHeader />
        <main className="staffx-main"><LoadingState message="직원용 Journey 요약을 불러오고 있습니다." /></main>
      </div>
    );
  }

  const decisionInteractions = view.interactions.filter(
    (item) => item.type === "SELECTED" || item.type === "REJECTED" || item.type === "DESELECTED",
  );
  const currentStep = view.steps.find((step) => step.stepNumber === view.journey.currentStepNumber)
    ?? view.steps[view.steps.length - 1]
    ?? null;

  return (
    <div className="staffx-page">
      <StaffHeader />
      <main className="staffx-main staffx-briefing">
        <header className="staffx-page-heading staffx-page-heading--briefing">
          <div>
            <p>CUSTOMER BRIEFING</p>
            <h1>{view.customer.name} 고객 Journey</h1>
            <span>실제 예약과 Journey 기록을 바탕으로 정리된 매장 응대 정보입니다.</span>
          </div>
          <Link className="staffx-back-link" to="/staff/reservations">예약 고객 목록으로 <span aria-hidden="true">↗</span></Link>
        </header>

        <section className="staffx-journey-overview" aria-label="Journey 상태">
          <div><span>Journey 상태</span><strong>{view.journey.status}</strong></div>
          <div><span>현재 단계</span><strong>{view.journey.currentStage}</strong></div>
          <div><span>Step</span><strong>{view.journey.currentStepNumber}</strong></div>
          <div><span>방문 일정</span><strong>{formatReservationTime(view.reservation.reservedAt)}</strong></div>
        </section>

        <div className="staffx-briefing-grid">
          <div className="staffx-briefing-column">
            <section className="staffx-card staffx-customer-card">
              <div className="staffx-section-heading">
                <p>CUSTOMER</p>
                <h2>고객 정보</h2>
              </div>
              <div className="staffx-customer-card__person">
                <span aria-hidden="true">{view.customer.name.trim().charAt(0) || "M"}</span>
                <div>
                  <strong>{view.customer.name}</strong>
                  <p>{view.customer.profileType ?? "Journey Customer"}</p>
                </div>
              </div>
              <dl className="staffx-customer-card__facts">
                <div><dt>예약 일시</dt><dd>{formatReservationTime(view.reservation.reservedAt)}</dd></div>
                <div><dt>방문 매장</dt><dd>{view.reservation.store.name}</dd></div>
                <div><dt>매장 위치</dt><dd>{view.reservation.store.location}</dd></div>
              </dl>
            </section>

            <section className="staffx-card">
              <div className="staffx-section-heading">
                <p>START QUESTION</p>
                <h2>Journey 시작 질문 응답</h2>
              </div>
              <div className="staffx-answer">
                <span>{startQuestionLabel(view.reservation.startQuestionCode)}</span>
                <blockquote>{view.reservation.startAnswerLabel}</blockquote>
                <small>{view.reservation.startAnswerCode}</small>
              </div>
            </section>

            <section className="staffx-card">
              <div className="staffx-section-heading">
                <p>TASTE SNAPSHOT</p>
                <h2>고객 취향과 오늘의 방향</h2>
              </div>
              {view.profileSnapshot ? (
                <>
                  <div className="staffx-editorial-summary">
                    <span>LONG-TERM TASTE</span>
                    <p>{view.profileSnapshot.longTermTasteSummary}</p>
                    <span>TODAY'S DIRECTION</span>
                    <p>{view.profileSnapshot.todayIntentSummary}</p>
                  </div>
                  <div className="staffx-score-grid" aria-label="취향 점수">
                    <div><span>실용성</span><strong>{view.profileSnapshot.practicalityScore}</strong></div>
                    <div><span>표현성</span><strong>{view.profileSnapshot.expressionScore}</strong></div>
                    <div><span>새로움</span><strong>{view.profileSnapshot.noveltyScore}</strong></div>
                  </div>
                  <div className="staffx-preferences" aria-label="선호 데이터">
                    {view.profileSnapshot.preferences.map((preference, index) => (
                      <span key={`${preference.type}-${preference.value}-${index}`}>
                        <small>{preference.type}</small>
                        {preference.value}
                        <strong>{preference.score}</strong>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="staffx-inline-empty">
                  <strong>Snapshot 준비 전</strong>
                  <p>Journey가 시작되면 고객 취향과 오늘의 방향이 표시됩니다.</p>
                </div>
              )}
            </section>
          </div>

          <div className="staffx-briefing-column">
            <section className="staffx-card">
              <div className="staffx-section-heading">
                <p>JOURNEY STEPS</p>
                <h2>단계별 추천과 선택</h2>
              </div>
              {view.steps.length === 0 ? (
                <div className="staffx-inline-empty">
                  <strong>추천 상품 준비 전</strong>
                  <p>첫 Journey 단계가 생성되면 실제 추천 상품과 구역 정보가 표시됩니다.</p>
                </div>
              ) : (
                <div className="staffx-step-list">
                  {view.steps.map((step) => (
                    <article key={step.id} className={step.stepNumber === view.journey.currentStepNumber ? "is-current" : undefined}>
                      <div className="staffx-step-list__header">
                        <span>STEP {step.stepNumber} · {step.stage}</span>
                        <strong>{step.status}</strong>
                      </div>
                      <h3>{step.scenarioTitle}</h3>
                      <p className="staffx-step-list__zone">
                        {step.zone.floor ? `${step.zone.floor} · ` : ""}{step.zone.name}
                      </p>
                      <p>{step.selectedProduct ? `선택: ${step.selectedProduct.name}` : "선택 진행 중"}</p>
                      <div className="staffx-recommendations">
                        {step.recommendations.map((recommendation) => (
                          <div key={recommendation.id} className={recommendation.product.id === step.selectedProduct?.id ? "is-selected" : undefined}>
                            <img
                              src={recommendation.product.imageUrl}
                              alt={recommendation.product.name}
                              onError={(event) => { event.currentTarget.hidden = true; }}
                            />
                            <span>
                              <small>{recommendation.type} · RANK {recommendation.rank}</small>
                              <strong>{recommendation.product.name}</strong>
                              <em>{recommendation.product.color}</em>
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="staffx-card">
              <div className="staffx-section-heading">
                <p>CURRENT ROUTE</p>
                <h2>현재 구역 안내</h2>
              </div>
              {currentStep ? (
                <div className="staffx-route-card">
                  <span>{currentStep.zone.floor ?? "매장 구역"}</span>
                  <h3>{currentStep.zone.name}</h3>
                  <p>{currentStep.zone.directionText}</p>
                </div>
              ) : (
                <div className="staffx-inline-empty"><p>현재 안내할 Journey 구역이 없습니다.</p></div>
              )}
            </section>

            <section className="staffx-card">
              <div className="staffx-section-heading">
                <p>DECISIONS</p>
                <h2>선택 변화 기록</h2>
              </div>
              {decisionInteractions.length === 0 ? (
                <div className="staffx-inline-empty"><p>아직 선택 기록이 없습니다.</p></div>
              ) : (
                <ol className="staffx-interactions">
                  {decisionInteractions.map((interaction) => (
                    <li key={interaction.id}>
                      <span>{String(interaction.sequence).padStart(2, "0")}</span>
                      <strong className={`is-${interaction.type.toLowerCase()}`}>{interaction.type}</strong>
                      <p>{productNames.get(interaction.productId) ?? "제품"}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>

        {view.result && (
          <section className="staffx-result">
            <div className="staffx-result__copy">
              <p>SERVICE SUMMARY</p>
              {!view.result.usedFallback && <span className="staffx-ai-status">AI Personalization 적용</span>}
              <h2>{view.result.signatureName}</h2>
              <strong>{view.result.signatureStory}</strong>
              <p>{view.result.finalLookSummary}</p>
              <blockquote>{view.result.staffSummary}</blockquote>
            </div>
            <div className="staffx-result__products">
              {view.result.items.map((item) => (
                <article key={item.id}>
                  <img src={item.product.imageUrl} alt={item.product.name} onError={(event) => { event.currentTarget.hidden = true; }} />
                  <span>{String(item.selectionOrder).padStart(2, "0")}</span>
                  <div><small>{item.category}</small><strong>{item.product.name}</strong></div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
