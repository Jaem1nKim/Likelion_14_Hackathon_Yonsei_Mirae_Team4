import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import { DemoUserProvider } from "../context/DemoUserContext";
import { AppRouter } from "../router/app-router";
import { ReservationDraftProvider } from "../state/reservation-draft";
import { customer, success } from "./fixtures";

export function mockFetchQueue(...responses: Array<Response | Error>) {
  const queue = [...responses];
  const mock = vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(async () => {
    const next = queue.shift();
    if (!next) {
      throw new Error("Unexpected fetch request");
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function authenticate() {
  localStorage.setItem(DEMO_USER_STORAGE_KEY, customer.id);
}

export function authenticatedResponses(...pageResponses: Response[]) {
  return [success(customer), ...pageResponses];
}

export function renderApp(route: string) {
  return render(
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <DemoUserProvider>
        <ReservationDraftProvider>
          <AppRouter />
        </ReservationDraftProvider>
      </DemoUserProvider>
    </MemoryRouter>,
  );
}

export function renderWithProviders(children: ReactNode) {
  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <DemoUserProvider>
        <ReservationDraftProvider>{children}</ReservationDraftProvider>
      </DemoUserProvider>
    </MemoryRouter>,
  );
}
