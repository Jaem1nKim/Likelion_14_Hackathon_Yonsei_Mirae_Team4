import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserConsent, putUserConsent } from "../api/consent-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { useDemoUser } from "../hooks/useDemoUser";

export function ConsentPage() {
  const navigate = useNavigate();
  const { user } = useDemoUser();
  const [journeyAllowed, setJourneyAllowed] = useState(false);
  const [behaviorAllowed, setBehaviorAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getUserConsent(user.id, controller.signal)
      .then(({ currentConsent }) => {
        setJourneyAllowed(currentConsent?.journeyDataAllowed ?? false);
        setBehaviorAllowed(currentConsent?.behaviorDataAllowed ?? false);
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(errorMessage(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt, user]);

  async function handleSubmit() {
    if (!user || !journeyAllowed || isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await putUserConsent(user.id, {
        journeyDataAllowed: journeyAllowed,
        behaviorDataAllowed: behaviorAllowed,
      });
      navigate("/profile");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout>
      <ProgressIndicator current={0} />
      <PageHeader
        eyebrow="MVP DATA CONSENT"
        title="Journey를 위한 데이터 활용 동의"
        description="시연용 데이터가 취향 확인과 매장 Journey 구성에 사용됩니다."
      />
      {isLoading && <LoadingState message="현재 동의 내용을 확인하고 있습니다." />}
      {!isLoading && error && !isSaving && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!isLoading && (
        <form
          className="consent-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <label className="consent-row">
            <input
              type="checkbox"
              checked={journeyAllowed}
              onChange={(event) => setJourneyAllowed(event.target.checked)}
            />
            <span>
              <strong>Journey 진행 및 선택 데이터 활용</strong>
              <small>필수 · 예약과 매장 내 선택 흐름을 이어가는 데 사용합니다.</small>
            </span>
          </label>
          <label className="consent-row">
            <input
              type="checkbox"
              checked={behaviorAllowed}
              onChange={(event) => setBehaviorAllowed(event.target.checked)}
            />
            <span>
              <strong>온라인 취향 행동 데이터 활용</strong>
              <small>선택 · 시드된 취향 행동 요약을 Journey에 참고합니다.</small>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="page-actions">
            <PrimaryButton
              type="submit"
              disabled={!journeyAllowed}
              isLoading={isSaving}
            >
              동의하고 프로필 확인하기
            </PrimaryButton>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
