import type { CustomerJourneyResultView } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getJourneyResult } from "../api/result-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResultProductGrid } from "../components/ResultProductGrid";

export function JourneyResultPage() {
  const { journeyId } = useParams();
  const [result, setResult] = useState<CustomerJourneyResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!journeyId) {
      setError("Journey 정보를 확인할 수 없습니다.");
      return;
    }
    const controller = new AbortController();
    setResult(null);
    setError(null);
    void getJourneyResult(journeyId, controller.signal)
      .then(setResult)
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(errorMessage(caught));
        }
      });
    return () => controller.abort();
  }, [attempt, journeyId]);

  const shareUrl = useMemo(
    () => result ? `${window.location.origin}/share/${encodeURIComponent(result.shareToken)}` : "",
    [result],
  );

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (error) {
    return <AppLayout><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></AppLayout>;
  }
  if (!result) {
    return <AppLayout><LoadingState message="Journey Signature를 불러오고 있습니다." /></AppLayout>;
  }

  return (
    <AppLayout>
      <section className="result-hero" aria-labelledby="signature-title">
        <p className="eyebrow">YOUR JOURNEY SIGNATURE</p>
        <h1 id="signature-title">{result.signatureName}</h1>
        <p className="result-story">{result.signatureStory}</p>
      </section>

      <section className="result-summary" aria-labelledby="final-look-title">
        <p className="eyebrow">FINAL LOOK</p>
        <h2 id="final-look-title">완성된 스타일</h2>
        <p>{result.finalLookSummary}</p>
      </section>

      <section aria-labelledby="selected-items-title">
        <div className="section-heading">
          <h2 id="selected-items-title">Selected Items</h2>
          <p>Journey에서 선택한 순서대로 완성된 조합입니다.</p>
        </div>
        <ResultProductGrid items={result.items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          category: item.category,
          color: item.product.color,
          imageUrl: item.product.imageUrl,
          recommendationReason: item.recommendationReason,
          selectionOrder: item.selectionOrder,
        }))} />
      </section>

      <section className="share-panel" aria-labelledby="share-title">
        <div>
          <p className="eyebrow">SHARE</p>
          <h2 id="share-title">Journey Signature 공유하기</h2>
          <p>공개 페이지에는 고객과 예약 정보가 포함되지 않습니다.</p>
        </div>
        <div className="share-controls">
          <input aria-label="공유 링크" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          <button className="button button-primary" type="button" onClick={() => void copyShareUrl()}>링크 복사</button>
          <Link className="button button-secondary" to={`/share/${encodeURIComponent(result.shareToken)}`}>공유 페이지 보기</Link>
        </div>
        {copyState === "copied" && <p className="success-message" role="status">공유 링크를 복사했습니다.</p>}
        {copyState === "failed" && <p className="form-error" role="alert">자동 복사가 지원되지 않습니다. 위 링크를 직접 선택해 복사해주세요.</p>}
      </section>
    </AppLayout>
  );
}
