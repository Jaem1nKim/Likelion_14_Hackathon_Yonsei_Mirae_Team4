import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEMO_USER_STORAGE_KEY } from "../api/api-client";
import {
  apiFailure,
  consentAllowed,
  consentMissing,
  customer,
  profile,
  secondCustomer,
  staff,
  store,
  success,
} from "./fixtures";
import { mockFetchQueue, renderApp } from "./test-utils";

describe("customer login", () => {
  it("displays active customer profiles", async () => {
    mockFetchQueue(success([customer, secondCustomer]));
    renderApp("/login");
    expect(await screen.findByText("Stable Explorer")).toBeInTheDocument();
    expect(screen.getByText("Bold Mover")).toBeInTheDocument();
  });

  it("excludes staff profiles even if a malformed list includes one", async () => {
    mockFetchQueue(success([customer, staff]));
    renderApp("/login");
    expect(await screen.findByText("Stable Explorer")).toBeInTheDocument();
    expect(screen.queryByText("Demo Staff")).not.toBeInTheDocument();
  });

  it("visually selects a user", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]));
    renderApp("/login");
    const card = await screen.findByRole("button", { name: /Stable Explorer/ });
    await user.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("선택됨")).toBeInTheDocument();
  });

  it("logs in and routes an already-consented customer to profile", async () => {
    const user = userEvent.setup();
    mockFetchQueue(
      success([customer]),
      success(customer),
      success(consentAllowed),
      success(profile),
      success(consentAllowed),
    );
    renderApp("/login");
    await user.click(await screen.findByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    expect(await screen.findByText("나의 Journey Profile")).toBeInTheDocument();
  });

  it("routes a customer without consent to the consent screen", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]), success(customer), success(consentMissing));
    renderApp("/login");
    await user.click(await screen.findByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    expect(await screen.findByText("온라인 관심 정보 활용 동의")).toBeInTheDocument();
  });

  it("continues a reservation-start login directly to reserve", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]), success(customer), success([store]));
    renderApp("/login", { from: "/reserve" });
    expect(await screen.findByText(/예약 Journey를 이어서 시작합니다/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    expect(await screen.findByRole("heading", { name: "체험 매장 선택" })).toBeInTheDocument();
  });

  it("stores only the selected user id in localStorage", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]), success(customer), success(consentMissing));
    renderApp("/login");
    await user.click(await screen.findByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    await screen.findByText("온라인 관심 정보 활용 동의");
    expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBe(customer.id);
    expect(localStorage.length).toBe(1);
  });

  it("shows a login API error", async () => {
    const user = userEvent.setup();
    mockFetchQueue(
      success([customer]),
      apiFailure(401, "DEMO_USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),
    );
    renderApp("/login");
    await user.click(await screen.findByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("사용자를 찾을 수 없습니다.");
  });

  it("distinguishes a network error from an API response", async () => {
    mockFetchQueue(new TypeError("offline"));
    renderApp("/login");
    expect(await screen.findByText(/서버에 연결할 수 없습니다/)).toBeInTheDocument();
  });

  it("guards profile when no login id exists", async () => {
    mockFetchQueue(success([customer]));
    renderApp("/profile");
    expect(await screen.findByText("오늘의 프로필을 선택하세요")).toBeInTheDocument();
    expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull();
  });

  it("removes an invalid restored user id", async () => {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, "missing-user");
    mockFetchQueue(
      apiFailure(401, "DEMO_USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),
      success([customer]),
    );
    renderApp("/profile");
    await waitFor(() => expect(localStorage.getItem(DEMO_USER_STORAGE_KEY)).toBeNull());
    expect(await screen.findByText("오늘의 프로필을 선택하세요")).toBeInTheDocument();
  });
});
