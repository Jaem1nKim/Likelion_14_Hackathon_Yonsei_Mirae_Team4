import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";

import { useDemoUser } from "../hooks/useDemoUser";
import { CustomerHeader } from "./CustomerHeader";

type AppLayoutProps = PropsWithChildren<{
  showUser?: boolean;
}>;

export function AppLayout({ children, showUser = true }: AppLayoutProps) {
  const { user } = useDemoUser();
  const location = useLocation();
  const usesCustomerHeader = !location.pathname.startsWith("/staff")
    && !location.pathname.startsWith("/share/")
    && !location.pathname.startsWith("/dev/");

  return (
    <div className="site-shell">
      {usesCustomerHeader ? (
        <CustomerHeader />
      ) : (
        <header className="site-header">
          <div className="brand-lockup" aria-label="MCM Journey Passport">
            <span className="brand-name">MCM</span>
            <span className="brand-product">Journey Passport</span>
          </div>
          {showUser && user && (
            <span className="header-user" aria-label={`현재 사용자 ${user.name}`}>
              {user.name}
            </span>
          )}
        </header>
      )}
      <main className="page-shell">{children}</main>
      <footer className="site-footer">MCM Journey Passport Demo</footer>
    </div>
  );
}
