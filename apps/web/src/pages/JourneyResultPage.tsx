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
  const [isShareOpen, setIsShareOpen] = useState(false);

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
    <div className="journey-result-figma">
      <main className="journey-result-figma__experience">
        <div className="journey-result-figma__overlay" aria-hidden="true" />
        <div className="journey-result-figma__body">
          <section className="journey-result-signature" aria-labelledby="signature-title">
            <p>나의 Journey Signature</p>
            {!result.usedFallback && (
              <span className="journey-result-ai">✦ AI가 완성한 Journey Signature</span>
            )}
            <h1 id="signature-title">{result.signatureName}</h1>
            <p className="journey-result-story">{result.signatureStory}</p>
            <p className="journey-result-summary">
              <strong>완성된 Look</strong>
              <span>{result.finalLookSummary}</span>
            </p>
          </section>

          <section className="journey-result-look" aria-labelledby="selected-items-title">
            <h2 id="selected-items-title" className="journey-result-visually-hidden">Journey에서 선택한 상품</h2>
            <ResultProductGrid items={result.items.map((item) => ({
              productId: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
              category: item.category,
              color: item.product.color,
              imageUrl: item.product.imageUrl,
              recommendationReason: item.recommendationReason,
              selectionOrder: item.selectionOrder,
            }))} />
            <figure className="journey-result-editorial" aria-label="완성된 Journey Look 에디토리얼 이미지">
              <img src="/assets/journey-result/editorial-look.png" alt="" />
            </figure>
          </section>

          <div className="journey-result-actions">
            <Link className="journey-result-button" to={`/journey/${encodeURIComponent(journeyId ?? "")}/ar`}>
              AR로 착용해보기
            </Link>
            <button
              className="journey-result-button"
              type="button"
              aria-expanded={isShareOpen}
              aria-controls="journey-result-share"
              onClick={() => setIsShareOpen((value) => !value)}
            >
              결과 공유하기
            </button>
          </div>

          {isShareOpen && (
            <section id="journey-result-share" className="journey-result-share" aria-labelledby="share-title">
              <div>
                <h2 id="share-title">Journey Signature 공유하기</h2>
                <p>공개 페이지에는 고객과 예약 정보가 포함되지 않습니다.</p>
              </div>
              <div className="journey-result-share__controls">
                <input aria-label="공유 링크" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
                <button type="button" onClick={() => void copyShareUrl()}>링크 복사</button>
                <Link to={`/share/${encodeURIComponent(result.shareToken)}`}>공유 페이지 보기</Link>
              </div>
              {copyState === "copied" && <p className="journey-result-share__success" role="status">공유 링크를 복사했습니다.</p>}
              {copyState === "failed" && <p className="journey-result-share__error" role="alert">자동 복사가 지원되지 않습니다. 위 링크를 직접 선택해 복사해주세요.</p>}
            </section>
          )}

          <Link className="journey-result-back" to="/profile" aria-label="프로필로 돌아가기">
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
