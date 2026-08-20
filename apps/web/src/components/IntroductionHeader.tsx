import { Link, useNavigate } from "react-router-dom";

import { useDemoUser } from "../hooks/useDemoUser";

type IntroductionHeaderProps = {
  logoSrc: string;
};

function reservationDestination(role: "CUSTOMER" | "STAFF" | undefined) {
  if (role === "CUSTOMER") {
    return "/reserve";
  }
  if (role === "STAFF") {
    return "/staff/reservations";
  }
  return "/login";
}

export function IntroductionHeader({ logoSrc }: IntroductionHeaderProps) {
  const navigate = useNavigate();
  const { user, isInitializing } = useDemoUser();

  return (
    <header className="introduction-header">
      <Link className="introduction-header__brand" to="/" aria-label="MCM 홈">
        <img src={logoSrc} alt="MCM" />
      </Link>
      <nav className="introduction-header__nav" aria-label="주요 메뉴">
        <Link to="/journey-introduction">Journey 소개</Link>
        <button
          type="button"
          disabled={isInitializing}
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
        <span>예약내역</span>
        <span>저장된 여정</span>
        <span>마이페이지</span>
      </nav>
    </header>
  );
}
