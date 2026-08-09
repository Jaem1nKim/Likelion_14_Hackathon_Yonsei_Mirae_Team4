import type { PropsWithChildren } from "react";

import { useDemoUser } from "../hooks/useDemoUser";

type AppLayoutProps = PropsWithChildren<{
  showUser?: boolean;
}>;

export function AppLayout({ children, showUser = true }: AppLayoutProps) {
  const { user } = useDemoUser();

  return (
    <div className="site-shell">
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
      <main className="page-shell">{children}</main>
      <footer className="site-footer">MCM Journey Passport Demo</footer>
    </div>
  );
}
