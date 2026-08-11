import type { SharedJourneyResultView } from "@mcm/shared";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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

  if (error) {
    return <AppLayout showUser={false}><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></AppLayout>;
  }
  if (!result) {
    return <AppLayout showUser={false}><LoadingState message="공유된 Journey Signature를 불러오고 있습니다." /></AppLayout>;
  }

  return (
    <AppLayout showUser={false}>
      <section className="result-hero shared-result-hero" aria-labelledby="shared-signature-title">
        <p className="eyebrow">MCM JOURNEY SIGNATURE</p>
        <h1 id="shared-signature-title">{result.signatureName}</h1>
        <p className="result-story">{result.signatureStory}</p>
      </section>
      <section className="result-summary" aria-labelledby="shared-final-look-title">
        <p className="eyebrow">FINAL LOOK</p>
        <h2 id="shared-final-look-title">완성된 스타일</h2>
        <p>{result.finalLookSummary}</p>
      </section>
      <section aria-labelledby="shared-items-title">
        <div className="section-heading"><h2 id="shared-items-title">Selected Items</h2></div>
        <ResultProductGrid items={result.items} />
      </section>
      <div className="page-actions"><Link className="button button-secondary" to="/login">나의 Journey 시작하기</Link></div>
    </AppLayout>
  );
}
