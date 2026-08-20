import type { StoreView } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStores } from "../api/store-api";
import { ErrorState } from "../components/ErrorState";
import { IntroductionHeader } from "../components/IntroductionHeader";
import { LoadingState } from "../components/LoadingState";
import { useReservationDraft } from "../state/reservation-draft";

const reserveAssetRoot = "/assets/reserve";

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function ReservePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { draft, setDraft } = useReservationDraft();
  const [stores, setStores] = useState<StoreView[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(draft?.store.id ?? "");
  const [date, setDate] = useState(
    draft ? localDateString(new Date(draft.reservedAt)) : "",
  );
  const [time, setTime] = useState(
    draft ? new Date(draft.reservedAt).toTimeString().slice(0, 5) : "",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getStores(controller.signal)
      .then((availableStores) =>
        setStores(availableStores.filter((store) => store.isJourneyEnabled)),
      )
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
  }, [attempt]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores],
  );

  function handleContinue() {
    setFormError(null);
    if (!selectedStore || !date || !time) {
      setFormError("매장, 방문 날짜와 시간을 모두 선택해 주세요.");
      return;
    }

    const reservedDate = new Date(`${date}T${time}:00`);
    if (Number.isNaN(reservedDate.getTime()) || reservedDate.getTime() <= Date.now()) {
      setFormError("현재보다 이후의 방문 시간을 선택해 주세요.");
      return;
    }

    setDraft({ store: selectedStore, reservedAt: reservedDate.toISOString() });
    navigate("/consent", { state: { reservationFlow: true } });
  }

  const notice =
    typeof location.state === "object" &&
    location.state !== null &&
    "notice" in location.state &&
    typeof location.state.notice === "string"
      ? location.state.notice
      : null;

  return (
    <div className="reserve-figma-page">
      <IntroductionHeader logoSrc={`${reserveAssetRoot}/mcm-logo.svg`} />
      <div className="reserve-figma-page__visual" aria-hidden="true">
        <img src={`${reserveAssetRoot}/store-building.png`} alt="" />
      </div>

      <main className="reserve-figma-page__body">
        <header className="reserve-figma-page__heading">
          <h1>예약하기</h1>
          <span aria-label="전체 3단계 중 1단계">1 / 3</span>
        </header>

        {notice && <p className="reserve-figma-page__notice" role="status">{notice}</p>}
        {isLoading && (
          <div className="reserve-figma-page__state">
            <LoadingState message="Journey 매장을 불러오고 있습니다." />
          </div>
        )}
        {!isLoading && error && (
          <div className="reserve-figma-page__state">
            <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
          </div>
        )}
        {!isLoading && !error && stores.length === 0 && (
          <div className="reserve-figma-page__state">
            <ErrorState
              message="현재 예약 가능한 Journey 매장이 없습니다."
              onRetry={() => setAttempt((value) => value + 1)}
            />
          </div>
        )}
        {!isLoading && !error && stores.length > 0 && (
          <form
            className="reserve-figma-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              handleContinue();
            }}
          >
            <section className="reserve-figma-card" aria-labelledby="reserve-store-title">
              <h2 id="reserve-store-title">체험 매장 선택</h2>
              <label className="reserve-figma-control reserve-figma-control--full">
                <span>매장 또는 팝업 선택</span>
                <select
                  aria-label="매장 또는 팝업 선택"
                  value={selectedStoreId}
                  onChange={(event) => setSelectedStoreId(event.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} · {store.location}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="reserve-figma-card" aria-labelledby="reserve-date-title">
              <h2 id="reserve-date-title">방문 일정 선택</h2>
              <div className="reserve-figma-schedule">
                <label className="reserve-figma-control">
                  <span>방문 날짜</span>
                  <input
                    type="date"
                    min={localDateString()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </label>
                <div className="reserve-figma-control">
                  <label htmlFor="reserve-visit-time">시간대 선택</label>
                  <input
                    id="reserve-visit-time"
                    aria-label="방문 시간"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            {formError && <p className="reserve-figma-page__error" role="alert">{formError}</p>}
            <div className="reserve-figma-form__actions">
              <button
                aria-label="시작 질문으로 이동"
                type="submit"
                disabled={!selectedStoreId || !date || !time}
              >
                다음 단계
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
