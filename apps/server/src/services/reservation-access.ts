import type { UserRole } from "@mcm/shared";

import { AppError } from "../errors/app-error.js";

export function assertReservationAccess(
  actor: { id: string; role: UserRole },
  reservationUserId: string,
) {
  if (actor.role === "CUSTOMER" && actor.id !== reservationUserId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "The demo user cannot access this reservation.",
    );
  }
}
