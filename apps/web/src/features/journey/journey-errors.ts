import { ApiClientError, errorMessage } from "../../api/api-client";

const FRIENDLY_MESSAGES = {
  PRODUCT_NOT_ELIGIBLE:
    "현재 선택할 수 없는 제품입니다. 다른 제품을 선택해 주세요.",
  NO_ELIGIBLE_CANDIDATES:
    "현재 이 단계에서 체험 가능한 제품을 준비할 수 없습니다. 직원에게 문의해 주세요.",
  MINIMUM_SELECTION_REQUIRED:
    "Journey를 완성하려면 현재 단계의 선택을 확인해 주세요.",
  INVALID_STATE: "현재 Journey 상태에서는 이 작업을 진행할 수 없습니다.",
  RESOURCE_CONFLICT: "이미 처리된 요청과 충돌했습니다. 최신 상태를 불러와 주세요.",
  INTERNAL_ERROR: "Journey를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

export function journeyErrorMessage(error: unknown) {
  if (error instanceof ApiClientError && error.code && error.code in FRIENDLY_MESSAGES) {
    return FRIENDLY_MESSAGES[error.code as keyof typeof FRIENDLY_MESSAGES];
  }
  return errorMessage(error);
}

export function isJourneyError(error: unknown, code: string) {
  return error instanceof ApiClientError && error.code === code;
}
