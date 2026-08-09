import { useCallback, useState } from "react";

import { errorMessage } from "../api/api-client";

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      if (isRunning) {
        return null;
      }

      setIsRunning(true);
      setError(null);
      try {
        return await action(...args);
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [action, isRunning],
  );

  return { run, isRunning, error, clearError: () => setError(null) };
}
