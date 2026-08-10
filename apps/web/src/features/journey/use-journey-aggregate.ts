import type { JourneyAggregate } from "@mcm/shared";
import { useCallback, useEffect, useState } from "react";

import { getJourney } from "../../api/journey-api";
import { journeyErrorMessage } from "./journey-errors";

export function useJourneyAggregate(journeyId: string | undefined) {
  const [aggregate, setAggregate] = useState<JourneyAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(async () => {
    if (!journeyId) {
      setError("Journey ID가 없습니다.");
      setIsLoading(false);
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const latest = await getJourney(journeyId);
      setAggregate(latest);
      return latest;
    } catch (caught) {
      setError(journeyErrorMessage(caught));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [journeyId]);

  useEffect(() => {
    if (!journeyId) {
      setError("Journey ID가 없습니다.");
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    void getJourney(journeyId, controller.signal)
      .then(setAggregate)
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(journeyErrorMessage(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [attempt, journeyId]);

  return {
    aggregate,
    setAggregate,
    isLoading,
    error,
    reload,
    retry: () => setAttempt((value) => value + 1),
  };
}
