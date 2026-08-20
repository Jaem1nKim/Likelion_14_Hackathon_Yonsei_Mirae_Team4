import type { SharedJourneyResultView } from "@mcm/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getSharedJourneyResult } from "../api/result-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { ResultProductGrid } from "../components/ResultProductGrid";

export function SharedResultPage() {
  const { shareToken } = useParams();
  const [result, setResult] = useState<SharedJourneyResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (!shareToken) {
      setError("공유된 Journey를 찾을 수 없습니다.");
      return;
    }
    const controller = new AbortController();
    setResult(null);
    setError(null);
    void getSharedJourneyResult(shareToken, controller.signal)
      .then(setResult)
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(errorMessage(caught));
        }
      });
    return () => controller.abort();
  }, [attempt, shareToken]);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${encodeURIComponent(shareToken)}`
    : window.location.href;

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (error) {
    return <AppLayout showUser={false}><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></AppLayout>;
  }
  if (!result) {
    return <AppLayout showUser={false}><LoadingState message="공유된 Journey Signature를 불러오고 있습니다." /></AppLayout>;
  }

  return (
    <div className="shared-result-figma">
      <main className="shared-result-figma__experience">
        <div className="shared-result-figma__image" aria-hidden="true" />
        <div className="shared-result-figma__body">
          <section className="shared-result-signature" aria-labelledby="shared-signature-title">
            <p>Journey Signature</p>
            <h1 id="shared-signature-title">{result.signatureName}</h1>
            <p>{result.signatureStory}</p>
          </section>

          <section className="shared-result-products" aria-labelledby="shared-items-title">
            <div className="shared-result-section-heading">
              <span>최종 MCM Look</span>
              <h2 id="shared-items-title">Journey에서 완성된 선택</h2>
            </div>
            <ResultProductGrid items={result.items} />
          </section>

          <section className="shared-result-summary" aria-labelledby="shared-final-look-title">
            <span>추천 이유</span>
            <h2 id="shared-final-look-title">{result.finalLookSummary}</h2>
          </section>

          <aside className="shared-result-privacy" aria-label="공개 공유 안내">
            <h2>공유된 Journey 카드</h2>
            <p>Journey Signature와 최종 선택을 담은 공개 결과입니다.</p>
            <p>이 페이지에는 예약 정보나 고객 개인정보가 포함되지 않습니다.</p>
          </aside>

          <div className="shared-result-share">
            <input
              aria-label="공유 링크"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" onClick={() => void copyShareUrl()}>링크 복사</button>
            {copyState === "copied" && <p role="status">공유 링크를 복사했습니다.</p>}
            {copyState === "failed" && (
              <p className="shared-result-share__error" role="alert">
                자동 복사가 지원되지 않습니다. 위 링크를 직접 선택해 복사해주세요.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
