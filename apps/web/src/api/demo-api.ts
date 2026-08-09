import type { DemoLoginRequest } from "@mcm/shared";

import { apiRequest } from "./api-client";
import { parseDemoUser, parseDemoUsers } from "./parsers";

export function getCustomerDemoUsers(signal?: AbortSignal) {
  return apiRequest("/demo/users?role=CUSTOMER", parseDemoUsers, {
    signal,
    includeDemoUser: false,
  });
}

export function loginDemoUser(userId: string, signal?: AbortSignal) {
  const body: DemoLoginRequest = { userId };
  return apiRequest("/demo/login", parseDemoUser, {
    method: "POST",
    body,
    signal,
    includeDemoUser: false,
  });
}
