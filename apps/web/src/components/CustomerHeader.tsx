import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { useDemoUser } from "../hooks/useDemoUser";
import { useReservationDraft } from "../state/reservation-draft";

type CustomerHeaderProps = {
  className?: string;
};

function reservationDestination(role: "CUSTOMER" | "STAFF" | undefined) {
  if (role === "CUSTOMER") return "/reserve";
  if (role === "STAFF") return "/staff/reservations";
  return "/login";
}

export function CustomerHeader({ className = "" }: CustomerHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isInitializing, logout } = useDemoUser();
  const { clearDraft } = useReservationDraft();
  const isCustomer = user?.role === "CUSTOMER";
  const headerClassName = `introduction-header customer-header${className ? ` ${className}` : ""}`;

  return (
    <header className={headerClassName}>
      <NavLink className="introduction-header__brand" to="/" aria-label="MCM 홈">
        <img src="/assets/common/mcm-logo.svg" alt="MCM" />
      </NavLink>
      <nav className="introduction-header__nav" aria-label="고객용 주요 메뉴" aria-busy={isInitializing}>
        <NavLink className={({ isActive }) => isActive ? "is-active" : undefined} to="/journey-introduction">
          Journey 소개
        </NavLink>
        <button
          className={location.pathname === "/reserve" ? "is-active" : undefined}
          type="button"
          disabled={isInitializing}
          aria-current={location.pathname === "/reserve" ? "page" : undefined}
          onClick={() => {
            const destination = reservationDestination(user?.role);
            navigate(
              destination,
              destination === "/login" ? { state: { from: "/reserve" } } : undefined,
            );
          }}
        >
          예약하기
        </button>
        {!isInitializing && isCustomer && (
          <>
            <NavLink className={({ isActive }) => isActive ? "is-active" : undefined} to="/profile">
              마이페이지
            </NavLink>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                logout();
                window.setTimeout(() => navigate("/", { replace: true }), 0);
              }}
            >
              로그아웃
            </button>
          </>
        )}
        {!isInitializing && !isCustomer && (
          <NavLink className={({ isActive }) => isActive ? "is-active" : undefined} to="/login">
            로그인
          </NavLink>
        )}
      </nav>
    </header>
  );
}
