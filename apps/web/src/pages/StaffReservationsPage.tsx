import {
  RESERVATION_STATUS_VALUES,
  type ReservationStatus,
  type StaffReservationListItem,
  type StoreView,
} from "@mcm/shared";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffReservations, type StaffReservationFilters } from "../api/staff-api";
import { getStores } from "../api/store-api";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StaffHeader } from "../components/StaffHeader";

const EMPTY_FILTERS: StaffReservationFilters = {};

function formatReservationTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StaffReservationsPage() {
  const [stores, setStores] = useState<StoreView[]>([]);
  const [reservations, setReservations] = useState<StaffReservationListItem[]>([]);
  const [draft, setDraft] = useState({ storeId: "", status: "", date: "" });
  const [filters, setFilters] = useState<StaffReservationFilters>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void Promise.all([
      getStores(controller.signal),
      getStaffReservations(filters, controller.signal),
    ])
      .then(([storeList, reservationList]) => {
        setStores(storeList);
        setReservations(reservationList);
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(errorMessage(caught));
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [attempt, filters]);

  const summary = useMemo(() => ({
    total: reservations.length,
    reserved: reservations.filter((item) => item.reservationStatus === "RESERVED").length,
    checkedIn: reservations.filter((item) => item.reservationStatus === "CHECKED_IN").length,
    completed: reservations.filter((item) => item.reservationStatus === "COMPLETED").length,
  }), [reservations]);

  const selectedStore = stores.find((store) => store.id === filters.storeId);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters({
      ...(draft.storeId ? { storeId: draft.storeId } : {}),
      ...(draft.status ? { status: draft.status as ReservationStatus } : {}),
      ...(draft.date ? { date: draft.date } : {}),
    });
  }

  return (
    <div className="staffx-page">
      <StaffHeader />
      <main className="staffx-main staffx-reservations">
        <header className="staffx-page-heading">
          <div>
            <p>RESERVATION DESK</p>
            <h1>예약 및 Journey 현황</h1>
            <span>실제 예약과 현재 Journey 상태를 예약 시간순으로 확인합니다.</span>
          </div>
          <p className="staffx-page-heading__context">
            {filters.date || "전체 날짜"} · {selectedStore?.name ?? "전체 매장"}
          </p>
        </header>

        <form className="staffx-filter" onSubmit={applyFilters}>
          <label>
            <span>매장</span>
            <select value={draft.storeId} onChange={(event) => setDraft((value) => ({ ...value, storeId: event.target.value }))}>
              <option value="">전체 매장</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>
          <label>
            <span>예약 상태</span>
            <select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}>
              <option value="">전체 상태</option>
              {RESERVATION_STATUS_VALUES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label>
            <span>예약 날짜</span>
            <input type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} />
          </label>
          <button type="submit">필터 적용 <span aria-hidden="true">→</span></button>
        </form>

        {!isLoading && !error && (
          <section className="staffx-summary" aria-label="현재 조회 결과">
            <div><span>현재 조회</span><strong>{summary.total}</strong><small>건</small></div>
            <div><span>예약</span><strong>{summary.reserved}</strong><small>RESERVED</small></div>
            <div><span>체크인</span><strong>{summary.checkedIn}</strong><small>CHECKED_IN</small></div>
            <div><span>완료</span><strong>{summary.completed}</strong><small>COMPLETED</small></div>
          </section>
        )}

        {isLoading && <LoadingState message="예약 현황을 불러오고 있습니다." />}
        {!isLoading && error && <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />}
        {!isLoading && !error && reservations.length === 0 && (
          <section className="staffx-empty">
            <span>NO RESERVATIONS</span>
            <h2>조건에 맞는 예약이 없습니다.</h2>
            <p>매장, 예약 상태 또는 날짜 조건을 변경해 다시 조회해주세요.</p>
          </section>
        )}
        {!isLoading && !error && reservations.length > 0 && (
          <section className="staffx-reservation-list" aria-label="예약 고객 목록">
            <div className="staffx-list-meta">
              <strong>예약 고객</strong>
              <span>{reservations.length}건 · 서버 조회 결과</span>
            </div>
            {reservations.map((reservation) => (
              <article className="staffx-reservation" key={reservation.reservationId}>
                <div className="staffx-reservation__identity">
                  <span className="staffx-reservation__avatar" aria-hidden="true">{reservation.customer.name.trim().charAt(0) || "M"}</span>
                  <div>
                    <h2>{reservation.customer.name}</h2>
                    <p>{reservation.customer.profileType ?? "Journey Customer"}</p>
                  </div>
                </div>
                <div className="staffx-reservation__detail">
                  <span>예약 코드</span>
                  <strong className="staffx-reservation__code">{reservation.reservationCode}</strong>
                </div>
                <div className="staffx-reservation__detail">
                  <span>방문 일정</span>
                  <strong>{formatReservationTime(reservation.reservedAt)}</strong>
                  <small>{reservation.store.name}</small>
                </div>
                <div className="staffx-reservation__status">
                  <span className={`staffx-badge status-${reservation.reservationStatus.toLowerCase()}`}>{reservation.reservationStatus}</span>
                  {reservation.journey ? (
                    <>
                      <span className="staffx-badge staffx-badge--dark">{reservation.journey.status} · {reservation.journey.currentStage}</span>
                      <small>STEP {reservation.journey.currentStepNumber}</small>
                    </>
                  ) : (
                    <small>Journey 시작 전</small>
                  )}
                </div>
                <div className="staffx-reservation__action">
                  {reservation.journey ? (
                    <Link to={`/staff/journeys/${encodeURIComponent(reservation.journey.id)}`}>
                      Journey 보기 <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <>
                      <button type="button" disabled>Journey 보기</button>
                      <small>Journey 생성 후 이용 가능</small>
                    </>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
