import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { checkInReservation } from "../api/journey-api";
import { AppLayout } from "../components/AppLayout";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { journeyErrorMessage } from "../features/journey/journey-errors";
import { journeyPathForAggregate } from "../features/journey/journey-navigation";

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
    <AppLayout>
      <PageHeader
        eyebrow="IN-STORE ARRIVAL"
        title="MCM Journey Check-in"
        description="Passport의 수동 체크인 코드를 입력해 매장 Journey를 이어가세요."
      />
      <form
        className="checkin-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <label htmlFor="reservation-code">예약 코드를 입력해 주세요.</label>
        <input
          id="reservation-code"
          name="reservationCode"
          inputMode="text"
          autoComplete="off"
          maxLength={8}
          pattern="[A-Z0-9]{8}"
          value={code}
          aria-describedby="reservation-code-help"
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        />
        <small id="reservation-code-help">대문자 영문과 숫자 8자리</small>
        {code.length > 0 && !CODE_PATTERN.test(code) && (
          <p className="form-error" role="alert">예약 코드는 대문자 영문과 숫자 8자리입니다.</p>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="page-actions page-actions-split">
          <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
            이전
          </button>
          <PrimaryButton type="submit" disabled={!CODE_PATTERN.test(code)} isLoading={isSubmitting}>
            체크인
          </PrimaryButton>
        </div>
      </form>
    </AppLayout>
  );
}
