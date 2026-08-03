import { randomBytes, randomInt } from "node:crypto";

const RESERVATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateQrToken() {
  return randomBytes(32).toString("base64url");
}

export function generateReservationCode() {
  return Array.from(
    { length: 8 },
    () => RESERVATION_CODE_ALPHABET[randomInt(RESERVATION_CODE_ALPHABET.length)],
  ).join("");
}
