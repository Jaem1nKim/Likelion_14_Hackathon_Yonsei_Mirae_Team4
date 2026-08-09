import type { StoreView } from "@mcm/shared";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ReservationDraft = {
  store: StoreView;
  reservedAt: string;
};

type ReservationDraftContextValue = {
  draft: ReservationDraft | null;
  setDraft: (draft: ReservationDraft) => void;
  clearDraft: () => void;
  ensureIdempotencyKey: () => string;
};

const ReservationDraftContext = createContext<ReservationDraftContextValue | null>(
  null,
);

function createUuid() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function ReservationDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraftState] = useState<ReservationDraft | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const setDraft = useCallback((nextDraft: ReservationDraft) => {
    idempotencyKeyRef.current = null;
    setDraftState(nextDraft);
  }, []);

  const clearDraft = useCallback(() => {
    idempotencyKeyRef.current = null;
    setDraftState(null);
  }, []);

  const ensureIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current ??= createUuid();
    return idempotencyKeyRef.current;
  }, []);

  const value = useMemo(
    () => ({ draft, setDraft, clearDraft, ensureIdempotencyKey }),
    [clearDraft, draft, ensureIdempotencyKey, setDraft],
  );

  return (
    <ReservationDraftContext.Provider value={value}>
      {children}
    </ReservationDraftContext.Provider>
  );
}

export function useReservationDraft() {
  const context = useContext(ReservationDraftContext);
  if (!context) {
    throw new Error(
      "useReservationDraft must be used within ReservationDraftProvider",
    );
  }
  return context;
}
