import { screen } from "@testing-library/react";
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
