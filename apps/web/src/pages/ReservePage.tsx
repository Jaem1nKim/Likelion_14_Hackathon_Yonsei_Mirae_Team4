import type { StoreView } from "@mcm/shared";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStores } from "../api/store-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressIndicator } from "../components/ProgressIndicator";
import { useReservationDraft } from "../state/reservation-draft";

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
    navigate("/question");
  }

  const notice =
    typeof location.state === "object" &&
    location.state !== null &&
    "notice" in location.state &&
    typeof location.state.notice === "string"
      ? location.state.notice
      : null;

  return (
    <AppLayout>
      <ProgressIndicator current={2} />
      <PageHeader
        eyebrow="PLAN YOUR VISIT"
        title="매장 방문 예약"
        description="Journey를 경험할 매장과 방문 시간을 선택하세요."
      />
      {notice && <p className="notice" role="status">{notice}</p>}
      {isLoading && <LoadingState message="Journey 매장을 불러오고 있습니다." />}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!isLoading && !error && stores.length === 0 && (
        <ErrorState
          message="현재 예약 가능한 Journey 매장이 없습니다."
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {!isLoading && !error && stores.length > 0 && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleContinue();
          }}
        >
          <fieldset className="plain-fieldset">
            <legend>매장 선택</legend>
            <div className="choice-grid store-grid">
              {stores.map((store) => {
                const selected = store.id === selectedStoreId;
                return (
                  <button
                    key={store.id}
                    type="button"
                    className={`choice-card store-card${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedStoreId(store.id)}
                  >
                    {store.imageUrl && (
                      <img
                        className="store-image"
                        src={store.imageUrl}
                        alt={`${store.name} 매장`}
                        onError={(event) => {
                          event.currentTarget.hidden = true;
                        }}
                      />
                    )}
                    <span className="choice-content">
                      <strong>{store.name}</strong>
                      <span>{store.location}</span>
                      {store.description && <small>{store.description}</small>}
                    </span>
                    <span className="selection-label">
                      {selected ? "선택됨" : "선택"}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="plain-fieldset visit-time-fieldset">
            <legend>방문 일시</legend>
            <div className="input-grid">
              <label>
                <span>방문 날짜</span>
                <input
                  type="date"
                  min={localDateString()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>방문 시간</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                />
              </label>
            </div>
          </fieldset>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="page-actions page-actions-split">
            <button className="button button-secondary" type="button" onClick={() => navigate("/profile")}>
              이전
            </button>
            <PrimaryButton type="submit" disabled={!selectedStoreId || !date || !time}>
              시작 질문으로 이동
            </PrimaryButton>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
