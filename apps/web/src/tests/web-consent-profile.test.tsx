import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  apiFailure,
  consentAllowed,
  consentMissing,
  customer,
  profile,
  store,
  success,
} from "./fixtures";
import {
  authenticate,
  authenticatedResponses,
  mockFetchQueue,
  renderApp,
} from "./test-utils";

describe("consent page", () => {
  it("returns a reservation consent visit without a draft to reserve", async () => {
    authenticate();
    const fetchMock = mockFetchQueue(...authenticatedResponses(success([store])));
    renderApp("/consent", { reservationFlow: true });

    expect(await screen.findByText(/예약 정보가 없어/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "예약하기" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("loads and displays current consent values", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(consentAllowed)));
    renderApp("/consent");
    expect(
      await screen.findByRole("checkbox", { name: /Journey 진행 및 제품 선택 데이터 이용/ }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /온라인 관심·행동 정보 활용/ })).toBeChecked();
  });

  it("keeps the continue button disabled without required consent", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(consentMissing)));
    renderApp("/consent");
    expect(
      await screen.findByRole("button", { name: "필수 동의만 하고 계속" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "필수·선택 모두 동의하고 계속" }),
    ).toBeDisabled();
  });

  it("saves required and optional consent", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(success(consentMissing), success(consentAllowed), success(profile)),
    );
    renderApp("/consent");
    await user.click(
      await screen.findByRole("checkbox", { name: /Journey 진행 및 제품 선택 데이터 이용/ }),
    );
    await user.click(screen.getByRole("checkbox", { name: /온라인 관심·행동 정보 활용/ }));
    await user.click(screen.getByRole("button", { name: "필수·선택 모두 동의하고 계속" }));
    expect(await screen.findByText("나의 Journey Profile")).toBeInTheDocument();
    const request = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      journeyDataAllowed: true,
      behaviorDataAllowed: true,
    });
  });

  it("saves only required consent when the optional action is chosen", async () => {
    const user = userEvent.setup();
    authenticate();
    const fetchMock = mockFetchQueue(
      ...authenticatedResponses(success(consentMissing), success(consentAllowed), success(profile)),
    );
    renderApp("/consent");
    await user.click(
      await screen.findByRole("checkbox", { name: /Journey 진행 및 제품 선택 데이터 이용/ }),
    );
    await user.click(screen.getByRole("button", { name: "필수 동의만 하고 계속" }));
    expect(await screen.findByText("나의 Journey Profile")).toBeInTheDocument();
    const request = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      journeyDataAllowed: true,
      behaviorDataAllowed: false,
    });
  });

  it("can resave the same consent without changing the client contract", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(success(consentAllowed), success(consentAllowed), success(profile)),
    );
    renderApp("/consent");
    await user.click(
      await screen.findByRole("button", { name: "필수·선택 모두 동의하고 계속" }),
    );
    expect(await screen.findByText("나의 Journey Profile")).toBeInTheDocument();
  });

  it("prevents duplicate consent submission while saving", async () => {
    const user = userEvent.setup();
    authenticate();
    let resolvePut: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(success(customer))
      .mockResolvedValueOnce(success(consentAllowed))
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolvePut = resolve; }),
      );
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/consent");
    const button = await screen.findByRole("button", {
      name: "필수·선택 모두 동의하고 계속",
    });
    await user.click(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "필수 동의만 하고 계속" })).toBeDisabled();
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    resolvePut?.(success(consentAllowed));
  });
});

describe("profile page", () => {
  it("displays TasteProfile summary and profile type", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(profile)));
    renderApp("/profile");
    expect(await screen.findByText(profile.tasteProfile.summary)).toBeInTheDocument();
    expect(screen.getByText("Classic Urban")).toBeInTheDocument();
  });

  it("displays all four score values", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(profile)));
    renderApp("/profile");
    await screen.findByText(profile.tasteProfile.summary);
    for (const score of [88, 56, 32, 91]) {
      expect(screen.getByText(String(score))).toBeInTheDocument();
    }
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
  });

  it("groups preferences by their type", async () => {
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(profile)));
    renderApp("/profile");
    expect(await screen.findByText("카테고리")).toBeInTheDocument();
    expect(screen.getByText("컬러")).toBeInTheDocument();
    expect(screen.getByText("스타일")).toBeInTheDocument();
    expect(screen.getByText("소재")).toBeInTheDocument();
    expect(screen.getByText("기능")).toBeInTheDocument();
  });

  it("shows a profile API error with retry", async () => {
    authenticate();
    mockFetchQueue(
      ...authenticatedResponses(
        apiFailure(404, "RESOURCE_NOT_FOUND", "TasteProfile을 찾을 수 없습니다."),
      ),
    );
    renderApp("/profile");
    expect(await screen.findByRole("alert")).toHaveTextContent("TasteProfile을 찾을 수 없습니다.");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("shows a loading state before the profile response", async () => {
    authenticate();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(success(customer))
      .mockImplementationOnce(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/profile");
    expect(await screen.findByText("취향 프로필을 불러오고 있습니다.")).toBeInTheDocument();
  });

  it("logs out from the profile page", async () => {
    const user = userEvent.setup();
    authenticate();
    mockFetchQueue(...authenticatedResponses(success(profile), success([customer])));
    renderApp("/profile");
    await user.click(await screen.findByRole("button", { name: "로그아웃" }));
    expect(await screen.findByText("오늘의 프로필을 선택하세요")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.length).toBe(0));
  });
});
