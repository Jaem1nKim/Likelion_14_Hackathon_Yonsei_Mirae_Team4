import { Link, NavLink, useNavigate } from "react-router-dom";

import { useDemoUser } from "../hooks/useDemoUser";
import "../styles/staff-experience.css";

type StaffHeaderProps = {
  isLogin?: boolean;
};

export function StaffHeader({ isLogin = false }: StaffHeaderProps) {
  const navigate = useNavigate();
  const { logout, user } = useDemoUser();

  function handleLogout() {
    logout();
    navigate("/staff/login", { replace: true });
  }

  return (
    <header className="staffx-header">
      <div className="staffx-header__identity">
        <Link className="staffx-header__logo" to={isLogin ? "/" : "/staff/reservations"} aria-label="MCM">
          <img src="/assets/common/mcm-logo.svg" alt="MCM" />
        </Link>
        <span className="staffx-header__division">STORE EXPERIENCE</span>
      </div>

      <nav className="staffx-header__nav" aria-label="직원 화면">
        {isLogin ? (
          <Link to="/login">고객 Journey</Link>
        ) : (
          <>
            <NavLink className={({ isActive }) => isActive ? "is-active" : undefined} to="/staff/reservations">
              예약 고객
            </NavLink>
            {user && <span className="staffx-header__user">{user.name}</span>}
            <button type="button" onClick={handleLogout}>로그아웃</button>
          </>
        )}
      </nav>
    </header>
  );
}
