import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { checkInReservation } from "../api/journey-api";
import { IntroductionHeader } from "../components/IntroductionHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { journeyErrorMessage } from "../features/journey/journey-errors";
import { journeyPathForAggregate } from "../features/journey/journey-navigation";

const checkInAssetRoot = "/assets/check-in";
const CODE_PATTERN = /^[A-Z0-9]{8}$/;

function codeFromState(state: unknown) {
  if (typeof state !== "object" || state === null || !("reservationCode" in state)) return "";
  return typeof state.reservationCode === "string" ? state.reservationCode : "";
}

export function StoreCheckInPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState(() => codeFromState(location.state));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!CODE_PATTERN.test(code) || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const aggregate = await checkInReservation({ reservationCode: code });
      navigate(journeyPathForAggregate(aggregate), { replace: true });
    } catch (caught) {
      setError(journeyErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="checkin-figma-page">
      <IntroductionHeader logoSrc={`${checkInAssetRoot}/mcm-logo.svg`} />
      <main className="checkin-figma-page__body">
        <h1>예약 코드로 Journey 불러오기</h1>
        <p className="checkin-figma-page__lead">
          Passport에 표시된 영문·숫자 8자리 예약 코드를 입력하세요.
        </p>

        <form
          className="checkin-figma-form"
          aria-busy={isSubmitting}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <section className="checkin-code-card" aria-labelledby="checkin-code-card-title">
            <h2 id="checkin-code-card-title">예약 코드</h2>
            <div className="checkin-code-field">
              <label htmlFor="reservation-code">예약 코드를 입력해 주세요.</label>
              <input
                id="reservation-code"
                name="reservationCode"
                inputMode="text"
                autoComplete="off"
                maxLength={8}
                pattern="[A-Z0-9]{8}"
                placeholder="ABCD2345"
                spellCheck={false}
                value={code}
                aria-describedby="reservation-code-help"
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
            </div>
            <p id="reservation-code-help" className="checkin-code-help">
              대문자 영문과 숫자 조합 8자리 (예: ABCD2345)
            </p>
          </section>

          {code.length > 0 && !CODE_PATTERN.test(code) && (
            <p className="checkin-figma-error" role="alert">
              예약 코드는 대문자 영문과 숫자 8자리입니다.
            </p>
          )}
          {error && <p className="checkin-figma-error" role="alert">{error}</p>}

          <div className="checkin-figma-actions">
            <PrimaryButton
              type="submit"
              disabled={!CODE_PATTERN.test(code)}
              isLoading={isSubmitting}
            >
              Journey 불러오기
            </PrimaryButton>
            <button
              className="checkin-figma-button checkin-figma-button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={() => navigate(-1)}
            >
              이전
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
