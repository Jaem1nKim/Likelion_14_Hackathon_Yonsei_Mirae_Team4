import type { ApiErrorCode, ApiErrorDetail } from "@mcm/shared";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details: ApiErrorDetail[] | null;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details: ApiErrorDetail[] | null = null,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
