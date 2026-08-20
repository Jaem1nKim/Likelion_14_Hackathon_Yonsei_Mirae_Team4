import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { customer, staff, store, success } from "./fixtures";
import {
  authenticate,
  authenticateStaff,
  mockFetchQueue,
  renderApp,
} from "./test-utils";

describe("public introduction flow", () => {
  it("shows only supported anonymous customer header actions", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]), success(customer), success([store]));
    renderApp("/");
    const navigation = screen.getByRole("navigation", { name: "고객용 주요 메뉴" });

    expect(within(navigation).getByRole("link", { name: "Journey 소개" })).toHaveAttribute("href", "/journey-introduction");
    expect(within(navigation).getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(within(navigation).queryByText(/예약내역|저장된 여정|마이페이지|로그아웃/)).not.toBeInTheDocument();

    await user.click(within(navigation).getByRole("button", { name: "예약하기" }));
    expect(await screen.findByText(/예약 Journey를 이어서 시작합니다/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));
    expect(await screen.findByRole("heading", { name: "체험 매장 선택" })).toBeInTheDocument();
  });

  it("shows customer account actions and logs out through the shared header", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(success(customer));
    renderApp("/journey-introduction");
    const logoutButton = await screen.findByRole("button", { name: "로그아웃" });
    const navigation = screen.getByRole("navigation", { name: "고객용 주요 메뉴" });

    expect(within(navigation).getByRole("link", { name: "마이페이지" })).toHaveAttribute("href", "/profile");
    expect(within(navigation).queryByRole("link", { name: "로그인" })).not.toBeInTheDocument();
    expect(within(navigation).queryByText(/예약내역|저장된 여정/)).not.toBeInTheDocument();

    await user.click(logoutButton);
    await waitFor(() => expect(localStorage.length).toBe(0));
    expect(await screen.findByRole("heading", { name: /Where will your choicetake you/ })).toBeInTheDocument();
  });

  it("shows the service introduction at the root and opens the Journey introduction", async () => {
    const user = userEvent.setup();
    renderApp("/");

    expect(screen.getByRole("heading", { name: /Where will your choicetake you/ })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /Journey 만나보기/ }));

    expect(await screen.findByRole("heading", { name: /당신의 선택으로 시작되는/ })).toBeInTheDocument();
  });

  it("sends an anonymous Journey starter through login to reservation", async () => {
    const user = userEvent.setup();
    mockFetchQueue(success([customer]), success(customer), success([store]));
    renderApp("/journey-introduction");

    await user.click(screen.getByRole("button", { name: "Journey 시작하기" }));
    await user.click(await screen.findByRole("button", { name: /Stable Explorer/ }));
    await user.click(screen.getByRole("button", { name: "이 프로필로 시작하기" }));

    expect(await screen.findByRole("heading", { name: "예약하기" })).toBeInTheDocument();
  });

  it("sends an authenticated customer to reservation", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(success(customer), success([store]));
    renderApp("/journey-introduction");

    await user.click(await screen.findByRole("button", { name: "Journey 시작하기" }));

    expect(await screen.findByRole("heading", { name: "예약하기" })).toBeInTheDocument();
  });

  it("returns authenticated staff to the existing staff reservation flow", async () => {
    const user = userEvent.setup();
    authenticateStaff();
    mockFetchQueue(success(staff), success([store]), success([]));
    renderApp("/journey-introduction");

    await user.click(await screen.findByRole("button", { name: "Journey 시작하기" }));

    expect(await screen.findByRole("heading", { name: "예약 및 Journey 현황" })).toBeInTheDocument();
  });
});
