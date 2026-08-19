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

import { createUuidV4 } from "../utils/uuid";

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
    idempotencyKeyRef.current ??= createUuidV4();
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
