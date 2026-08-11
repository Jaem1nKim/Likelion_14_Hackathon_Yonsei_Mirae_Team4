import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import { customer, staff, staffJourney, staffReservation, store, success } from "./fixtures";
import { authenticate, authenticateStaff, mockFetchQueue, renderApp } from "./test-utils";

describe("staff login and route guard", () => {
  beforeEach(() => localStorage.clear());

  it("lists STAFF profiles and logs in", async () => {
    mockFetchQueue(success([staff]), success(staff), success([store]), success([staffReservation]));
    renderApp("/staff/login");
    await userEvent.click(await screen.findByRole("button", { name: /Demo Staff/ }));
    await userEvent.click(screen.getByRole("button", { name: "직원 화면 시작하기" }));
    expect(await screen.findByRole("heading", { name: "예약 및 Journey 현황" })).toBeInTheDocument();
    expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe(staff.id);
  });

  it("does not show CUSTOMER profiles in staff login", async () => {
    mockFetchQueue(success([staff]));
    renderApp("/staff/login");
    await screen.findByText(staff.name);
    expect(screen.queryByText(customer.name)).not.toBeInTheDocument();
  });

  it("redirects a CUSTOMER away from staff reservations", async () => {
    authenticate();
    mockFetchQueue(success(customer), success([staff]));
    renderApp("/staff/reservations");
    expect(await screen.findByRole("heading", { name: "MCM Journey Staff" })).toBeInTheDocument();
  });
});

describe("staff reservations", () => {
  beforeEach(() => localStorage.clear());

  function renderReservations() {
    authenticateStaff();
    return mockFetchQueue(success(staff), success([store]), success([staffReservation]));
  }

  it("shows reservation and Journey status", async () => {
    renderReservations();
    renderApp("/staff/reservations");
    expect(await screen.findByText(staffReservation.reservationCode)).toBeInTheDocument();
    expect(screen.getByText("FINISHED · RESULT")).toBeInTheDocument();
  });

  it("links to Journey detail", async () => {
    renderReservations();
    renderApp("/staff/reservations");
    expect(await screen.findByRole("link", { name: "Journey 보기" })).toHaveAttribute("href", "/staff/journeys/journey-1");
  });

  it("sends store, status and date filters to the server", async () => {
    authenticateStaff();
    const fetchMock = mockFetchQueue(
      success(staff), success([store]), success([staffReservation]),
      success([store]), success([staffReservation]),
    );
    renderApp("/staff/reservations");
    await screen.findByText(staffReservation.reservationCode);
    await userEvent.selectOptions(screen.getByLabelText("매장"), store.id);
    await userEvent.selectOptions(screen.getByLabelText("예약 상태"), "COMPLETED");
    await userEvent.type(screen.getByLabelText("예약 날짜"), "2099-08-05");
    await userEvent.click(screen.getByRole("button", { name: "필터 적용" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`storeId=${store.id}`) && String(url).includes("status=COMPLETED") && String(url).includes("date=2099-08-05"))).toBe(true));
  });

  it("shows Journey start pending when no Journey exists", async () => {
    authenticateStaff();
    mockFetchQueue(success(staff), success([store]), success([{ ...staffReservation, journey: null }]));
    renderApp("/staff/reservations");
    expect(await screen.findByText("Journey 시작 전")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Journey 보기" })).toBeDisabled();
  });

  it("recovers reservations on direct load", async () => {
    const fetchMock = renderReservations();
    renderApp("/staff/reservations");
    await screen.findByText(staffReservation.reservationCode);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/staff/reservations"), expect.anything());
  });
});

describe("staff Journey detail", () => {
  beforeEach(() => localStorage.clear());

  function renderJourney() {
    authenticateStaff();
    return mockFetchQueue(success(staff), success(staffJourney));
  }

  it("shows customer and Journey status", async () => {
    renderJourney();
    renderApp("/staff/journeys/journey-1");
    expect(await screen.findByRole("heading", { name: `${staffJourney.customer.name} 고객 Journey` })).toBeInTheDocument();
    expect(screen.getByText("RESULT")).toBeInTheDocument();
  });

  it("shows the allowed Taste Snapshot", async () => {
    renderJourney();
    renderApp("/staff/journeys/journey-1");
    expect(await screen.findByText(staffJourney.profileSnapshot!.longTermTasteSummary)).toBeInTheDocument();
    expect(screen.getByText(staffJourney.profileSnapshot!.todayIntentSummary)).toBeInTheDocument();
  });

  it("shows Journey steps and selected products", async () => {
    renderJourney();
    renderApp("/staff/journeys/journey-1");
    for (const step of staffJourney.steps) expect(await screen.findByText(`선택: ${step.selectedProduct!.name}`)).toBeInTheDocument();
  });

  it("shows decision interactions without debug events", async () => {
    renderJourney();
    renderApp("/staff/journeys/journey-1");
    expect(await screen.findByText("SELECTED")).toBeInTheDocument();
    expect(screen.getByText("REJECTED")).toBeInTheDocument();
    expect(screen.queryByText("VIEWED")).not.toBeInTheDocument();
  });

  it("shows staffSummary only on staff detail", async () => {
    renderJourney();
    renderApp("/staff/journeys/journey-1");
    expect(await screen.findByText(staffJourney.result!.staffSummary)).toBeInTheDocument();
  });

  it("restores staff detail from the URL", async () => {
    const fetchMock = renderJourney();
    renderApp("/staff/journeys/journey-1");
    await screen.findByText(staffJourney.result!.staffSummary);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/staff/journeys/journey-1"), expect.anything());
  });
});
