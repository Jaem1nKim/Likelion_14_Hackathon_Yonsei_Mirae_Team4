import type { StaffJourneyView } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffJourney } from "../api/staff-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";

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

  if (error) return <AppLayout><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></AppLayout>;
  if (!view) return <AppLayout><LoadingState message="직원용 Journey 요약을 불러오고 있습니다." /></AppLayout>;

  const decisionInteractions = view.interactions.filter((item) => item.type === "SELECTED" || item.type === "REJECTED" || item.type === "DESELECTED");

  return (
    <AppLayout>
      <PageHeader eyebrow="STAFF JOURNEY VIEW" title={`${view.customer.name} 고객 Journey`} description={view.customer.profileType ?? "Journey Customer"} />
      <section className="staff-overview" aria-label="Journey 상태">
        <div><span>Journey</span><strong>{view.journey.status}</strong></div>
        <div><span>현재 단계</span><strong>{view.journey.currentStage}</strong></div>
        <div><span>Step</span><strong>{view.journey.currentStepNumber}</strong></div>
        <div><span>예약 시간</span><strong>{new Date(view.reservation.reservedAt).toLocaleString("ko-KR")}</strong></div>
      </section>

      <section className="staff-section" aria-labelledby="snapshot-title">
        <p className="eyebrow">TASTE SNAPSHOT</p><h2 id="snapshot-title">고객 취향과 오늘의 방향</h2>
        {view.profileSnapshot ? <><p>{view.profileSnapshot.longTermTasteSummary}</p><p>{view.profileSnapshot.todayIntentSummary}</p><div className="staff-score-grid"><span>실용성 <strong>{view.profileSnapshot.practicalityScore}</strong></span><span>표현성 <strong>{view.profileSnapshot.expressionScore}</strong></span><span>새로움 <strong>{view.profileSnapshot.noveltyScore}</strong></span></div></> : <p className="empty-state">Journey 시작 전이라 Snapshot이 아직 없습니다.</p>}
      </section>

      <section className="staff-section" aria-labelledby="steps-title">
        <p className="eyebrow">JOURNEY STEPS</p><h2 id="steps-title">선택 단계</h2>
        {view.steps.length === 0 ? <p className="empty-state">아직 생성된 단계가 없습니다.</p> : <div className="staff-step-list">{view.steps.map((step) => {
          const selectedReason = step.recommendations.find((item) => item.product.id === step.selectedProduct?.id)?.reason ?? null;
          return <article key={step.id}><span>STEP {step.stepNumber} · {step.stage}</span><h3>{step.scenarioTitle}</h3><p>{step.selectedProduct ? `선택: ${step.selectedProduct.name}` : "선택 진행 중"}</p>{selectedReason && <small>{selectedReason}</small>}<strong>{step.status}</strong></article>;
        })}</div>}
      </section>

      <section className="staff-section" aria-labelledby="interactions-title">
        <p className="eyebrow">DECISIONS</p><h2 id="interactions-title">선택 변화 요약</h2>
        {decisionInteractions.length === 0 ? <p className="empty-state">아직 선택 기록이 없습니다.</p> : <ol className="staff-interactions">{decisionInteractions.map((interaction) => <li key={interaction.id}><span>{interaction.sequence}</span><strong>{interaction.type}</strong><p>{productNames.get(interaction.productId) ?? "제품"}</p></li>)}</ol>}
      </section>

      {view.result && <section className="staff-result" aria-labelledby="staff-result-title"><p className="eyebrow">SERVICE SUMMARY</p><h2 id="staff-result-title">{view.result.signatureName}</h2><p>{view.result.finalLookSummary}</p><div className="staff-final-products">{view.result.items.map((item) => <span key={item.id}>{item.selectionOrder}. {item.product.name}</span>)}</div><blockquote>{view.result.staffSummary}</blockquote></section>}
      <div className="page-actions"><Link className="button button-secondary" to="/staff/reservations">예약 목록으로</Link></div>
    </AppLayout>
  );
}
