import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getUserConsent, putUserConsent } from "../api/consent-api";
import { ErrorState } from "../components/ErrorState";
import { IntroductionHeader } from "../components/IntroductionHeader";
import { LoadingState } from "../components/LoadingState";
import { useDemoUser } from "../hooks/useDemoUser";
import { useReservationDraft } from "../state/reservation-draft";

const consentAssetRoot = "/assets/consent";

function isReservationConsentState(state: unknown) {
  return (
    typeof state === "object" &&
    state !== null &&
    "reservationFlow" in state &&
    state.reservationFlow === true
  );
}

export function ConsentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useDemoUser();
  const { draft } = useReservationDraft();
  const isReservationFlow = isReservationConsentState(location.state);
  const [journeyAllowed, setJourneyAllowed] = useState(false);
  const [behaviorAllowed, setBehaviorAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user || (isReservationFlow && !draft)) {
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
  }, [attempt, draft, isReservationFlow, user]);

  async function handleSubmit(nextBehaviorAllowed: boolean) {
    if (!user || !journeyAllowed || (nextBehaviorAllowed && !behaviorAllowed) || isSaving) {
      return;
    }
    setBehaviorAllowed(nextBehaviorAllowed);
    setIsSaving(true);
    setError(null);
    try {
      await putUserConsent(user.id, {
        journeyDataAllowed: true,
        behaviorDataAllowed: nextBehaviorAllowed,
      });
      navigate(isReservationFlow ? "/question" : "/profile", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (isReservationFlow && !draft) {
    return (
      <Navigate
        replace
        to="/reserve"
        state={{ notice: "예약 정보가 없어 매장 선택부터 다시 시작합니다." }}
      />
    );
  }

  return (
    <div className="consent-figma-page">
      <IntroductionHeader logoSrc={`${consentAssetRoot}/mcm-logo.svg`} />
      <main className="consent-figma-page__body">
        <header className="consent-figma-page__heading">
          <h1>온라인 관심 정보 활용 동의</h1>
          <span aria-label="예약 단계 2 / 3">2 / 3</span>
        </header>

        {isLoading && (
          <div className="consent-figma-page__state">
            <LoadingState message="현재 동의 내용을 확인하고 있습니다." />
          </div>
        )}
        {!isLoading && error && !isSaving && (
          <div className="consent-figma-page__state">
            <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
          </div>
        )}
        {!isLoading && (
          <form
            className="consent-figma-form"
            aria-busy={isSaving}
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(true);
            }}
          >
            <section className="consent-intro-card" aria-labelledby="consent-intro-title">
              <h2 id="consent-intro-title">개인화 여정이란?</h2>
              <p>
                이전에 살펴본 제품과 관심 정보를 활용하면, 매장에 도착하는 순간부터
                당신의 취향에 맞는 Journey를 시작할 수 있습니다.
              </p>
              <p className="consent-intro-card__note">
                Journey 진행 및 제품 선택 데이터 이용 동의는 Journey 이용을 위해 필수입니다.
              </p>
            </section>

            <section className="consent-section" aria-labelledby="consent-items-title">
              <h2 id="consent-items-title">수집 및 활용 항목</h2>
              <div className="consent-options-card">
                <label className="consent-option">
                  <input
                    type="checkbox"
                    checked={journeyAllowed}
                    onChange={(event) => setJourneyAllowed(event.target.checked)}
                  />
                  <span className="consent-option__copy">
                    <span className="consent-option__title">
                      Journey 진행 및 제품 선택 데이터 이용
                    </span>
                    <span className="consent-option__description">
                      예약 정보와 Journey 진행 중 제품 선택을 연결하고 결과를 구성하는 데 사용합니다.
                    </span>
                  </span>
                  <span className="consent-option__badge consent-option__badge--required">필수</span>
                </label>
                <label className="consent-option">
                  <input
                    type="checkbox"
                    checked={behaviorAllowed}
                    onChange={(event) => setBehaviorAllowed(event.target.checked)}
                  />
                  <span className="consent-option__copy">
                    <span className="consent-option__title">온라인 관심·행동 정보 활용</span>
                    <span className="consent-option__description">
                      온라인에서 살펴본 제품과 관심 정보를 Journey 구성에 참고합니다.
                    </span>
                  </span>
                  <span className="consent-option__badge">선택</span>
                </label>
              </div>
            </section>

            <section className="consent-section" aria-labelledby="consent-purpose-title">
              <h2 id="consent-purpose-title">활용 목적 및 제한</h2>
              <div className="consent-purpose-card">
                <div>
                  <h3>활용 목적</h3>
                  <p>Journey 진행과 제품 선택 흐름 연결</p>
                  <p>온라인 관심 정보를 Journey 구성에 참고</p>
                </div>
                <div>
                  <h3>이용 안내</h3>
                  <p>필수 동의 없이는 예약 흐름을 계속할 수 없습니다.</p>
                  <p>온라인 관심·행동 정보 제공은 선택입니다.</p>
                </div>
              </div>
            </section>

            <aside className="consent-optional-notice">
              <strong>선택 정보 안내</strong>
              <p>
                온라인 관심·행동 정보 제공은 선택이며, 동의하지 않아도 Journey를 이용할 수
                있습니다.
              </p>
            </aside>

            {error && <p className="consent-figma-form__error" role="alert">{error}</p>}
            {isSaving && <p className="consent-figma-form__status">동의를 저장하고 있습니다.</p>}

            <div className="consent-figma-form__actions">
              <button
                className="consent-figma-button consent-figma-button--secondary"
                type="button"
                disabled={!journeyAllowed || isSaving}
                onClick={() => void handleSubmit(false)}
              >
                필수 동의만 하고 계속
              </button>
              <button
                className="consent-figma-button consent-figma-button--primary"
                type="submit"
                disabled={!journeyAllowed || !behaviorAllowed || isSaving}
              >
                필수·선택 모두 동의하고 계속
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
