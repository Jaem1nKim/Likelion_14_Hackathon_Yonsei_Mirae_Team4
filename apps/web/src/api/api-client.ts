import {
  DEMO_USER_HEADER_NAME,
  type ApiError,
  type ApiErrorCode,
} from "@mcm/shared";

export const DEMO_USER_STORAGE_KEY = "mcm-demo-user-id";
export const AUTH_INVALID_EVENT = "mcm:demo-auth-invalid";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal | undefined;
  includeDemoUser?: boolean;
};

type ErrorKind = "api" | "network" | "response";

export class ApiClientError extends Error {
  readonly kind: ErrorKind;
  readonly status: number | null;
  readonly code: ApiErrorCode | null;

  constructor(
    message: string,
    options: { kind: ErrorKind; status?: number; code?: ApiErrorCode },
  ) {
    super(message);
    this.name = "ApiClientError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    (value.error.details === null || Array.isArray(value.error.details))
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiClientError("서버 응답을 확인할 수 없습니다.", {
      kind: "response",
      status: response.status,
    });
  }
}

function notifyInvalidAuth(status: number) {
  if ((status === 401 || status === 403) && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_INVALID_EVENT));
  }
}

export function getStoredDemoUserId() {
  return localStorage.getItem(DEMO_USER_STORAGE_KEY);
}

export async function apiRequest<T>(
  path: string,
  parseData: (value: unknown) => T,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const userId = getStoredDemoUserId();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.includeDemoUser !== false && userId) {
    headers.set(DEMO_USER_HEADER_NAME, userId);
  }

  let response: Response;

  try {
    const requestInit: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };
    if (options.body !== undefined) {
      requestInit.body = JSON.stringify(options.body);
    }
    if (options.signal) {
      requestInit.signal = options.signal;
    }
    response = await fetch(`${apiBaseUrl}${path}`, requestInit);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new ApiClientError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.", {
      kind: "network",
    });
  }

  const payload = await readJson(response);

  if (!response.ok) {
    notifyInvalidAuth(response.status);

    if (isApiError(payload)) {
      throw new ApiClientError(payload.error.message, {
        kind: "api",
        status: response.status,
        code: payload.error.code,
      });
    }

    throw new ApiClientError("요청을 처리하지 못했습니다.", {
      kind: "response",
      status: response.status,
    });
  }

  if (!isRecord(payload) || !("data" in payload)) {
    throw new ApiClientError("서버 응답 형식이 올바르지 않습니다.", {
      kind: "response",
      status: response.status,
    });
  }

  try {
    return parseData(payload.data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError("서버 응답 형식이 올바르지 않습니다.", {
      kind: "response",
      status: response.status,
    });
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "요청을 처리하지 못했습니다. 다시 시도해 주세요.";
}
