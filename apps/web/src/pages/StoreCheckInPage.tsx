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
        <section className="checkin-figma-visual" aria-label="MCM 매장 Journey 입장 안내">
          <div className="checkin-figma-visual__shade" aria-hidden="true" />
          <div className="checkin-figma-visual__content">
            <p className="checkin-figma-eyebrow">MCM JOURNEY PASSPORT · STORE ENTRY</p>
            <h1>Passport에서<br />Journey로.</h1>
            <p>
              예약 확인을 마치면 오늘의 선택을 위한<br />매장 Journey가 이어집니다.
            </p>
          </div>
          <ol className="checkin-figma-passage" aria-label="Journey 입장 단계">
            <li className="is-complete"><span>01</span> PASSPORT</li>
            <li className="is-current"><span>02</span> CHECK-IN</li>
            <li><span>03</span> JOURNEY</li>
          </ol>
        </section>

        <section className="checkin-figma-panel" aria-labelledby="checkin-page-title">
          <div className="checkin-figma-panel__inner">
            <header className="checkin-figma-heading">
              <p className="checkin-figma-eyebrow">ACCESS CODE · 8 DIGITS</p>
              <h2 id="checkin-page-title">예약 코드로<br />Journey 불러오기</h2>
              <p className="checkin-figma-page__lead">
                Passport에 표시된 영문·숫자 8자리 예약 코드를 입력하세요.
              </p>
            </header>

            <form
              className="checkin-figma-form"
              aria-busy={isSubmitting}
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <section className="checkin-code-card" aria-labelledby="checkin-code-card-title">
                <div className="checkin-code-card__heading">
                  <h3 id="checkin-code-card-title">RESERVATION CODE</h3>
                  <span>{code.length} / 8</span>
                </div>
                <div className="checkin-code-field">
                  <label htmlFor="reservation-code">예약 코드를 입력해 주세요.</label>
                  <input
                    id="reservation-code"
                    name="reservationCode"
                    inputMode="text"
                    autoComplete="off"
                    maxLength={8}
                    pattern="[A-Z0-9]{8}"
                    placeholder="8자리 코드 입력"
                    spellCheck={false}
                    value={code}
                    aria-describedby="reservation-code-help"
                    onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  />
                </div>
                <div className="checkin-code-card__meta">
                  <p id="reservation-code-help" className="checkin-code-help">
                    대문자 영문과 숫자 조합 8자리
                  </p>
                  <span className={CODE_PATTERN.test(code) ? "is-ready" : undefined}>
                    {CODE_PATTERN.test(code) ? "입장 준비 완료" : "A–Z · 0–9"}
                  </span>
                </div>
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
                  이전 화면으로
                </button>
              </div>
            </form>

            <p className="checkin-figma-panel__note">
              체크인이 완료되면 현재 Journey 상태에 맞는 화면으로 바로 연결됩니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
