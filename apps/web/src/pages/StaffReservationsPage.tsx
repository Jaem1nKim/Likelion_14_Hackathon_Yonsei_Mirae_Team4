import {
  RESERVATION_STATUS_VALUES,
  type ReservationStatus,
  type StaffReservationListItem,
  type StoreView,
} from "@mcm/shared";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { errorMessage } from "../api/api-client";
import { getStaffReservations, type StaffReservationFilters } from "../api/staff-api";
import { getStores } from "../api/store-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useDemoUser } from "../hooks/useDemoUser";

const EMPTY_FILTERS: StaffReservationFilters = {};

export function StaffReservationsPage() {
  const navigate = useNavigate();
  const { logout } = useDemoUser();
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

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setFilters({
      ...(draft.storeId ? { storeId: draft.storeId } : {}),
      ...(draft.status ? { status: draft.status as ReservationStatus } : {}),
      ...(draft.date ? { date: draft.date } : {}),
    });
  }

  function handleLogout() {
    logout();
    navigate("/staff/login", { replace: true });
  }

  return (
    <AppLayout>
      <PageHeader eyebrow="STAFF JOURNEY DESK" title="예약 및 Journey 현황" description="필터는 서버 조회에 적용되며, 예약 시간순으로 표시됩니다." />
      <form className="staff-filter" onSubmit={applyFilters}>
        <label>매장<select value={draft.storeId} onChange={(event) => setDraft((value) => ({ ...value, storeId: event.target.value }))}><option value="">전체 매장</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
        <label>예약 상태<select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}><option value="">전체 상태</option>{RESERVATION_STATUS_VALUES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>예약 날짜<input type="date" value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} /></label>
        <button className="button button-primary" type="submit">필터 적용</button>
      </form>

      {isLoading && <LoadingState message="예약 현황을 불러오고 있습니다." />}
      {!isLoading && error && <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />}
      {!isLoading && !error && reservations.length === 0 && <p className="empty-state">조건에 맞는 예약이 없습니다.</p>}
      {!isLoading && !error && reservations.length > 0 && (
        <div className="staff-reservation-list">
          {reservations.map((reservation) => (
            <article className="staff-reservation-card" key={reservation.reservationId}>
              <div className="staff-reservation-code"><span>예약 코드</span><strong>{reservation.reservationCode}</strong></div>
              <div><span>예약 시간</span><strong>{new Date(reservation.reservedAt).toLocaleString("ko-KR")}</strong></div>
              <div><span>고객</span><strong>{reservation.customer.name}</strong><small>{reservation.customer.profileType ?? "Journey Customer"}</small></div>
              <div><span>매장</span><strong>{reservation.store.name}</strong></div>
              <div className="staff-statuses"><span className={`staff-badge status-${reservation.reservationStatus.toLowerCase()}`}>{reservation.reservationStatus}</span><span className="staff-badge">{reservation.journey ? `${reservation.journey.status} · ${reservation.journey.currentStage}` : "Journey 시작 전"}</span></div>
              {reservation.journey ? <Link className="button button-secondary" to={`/staff/journeys/${encodeURIComponent(reservation.journey.id)}`}>Journey 보기</Link> : <button className="button button-secondary" type="button" disabled>Journey 보기</button>}
            </article>
          ))}
        </div>
      )}
      <div className="page-actions"><button className="button button-text" type="button" onClick={handleLogout}>로그아웃</button></div>
    </AppLayout>
  );
}
