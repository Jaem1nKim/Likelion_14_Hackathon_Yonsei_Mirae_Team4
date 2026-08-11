import type { DemoUser } from "@mcm/shared";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AUTH_INVALID_EVENT,
  DEMO_USER_STORAGE_KEY,
  getStoredDemoUserId,
} from "../api/api-client";
import { loginDemoUser } from "../api/demo-api";

type DemoUserContextValue = {
  user: DemoUser | null;
  isInitializing: boolean;
  login: (userId: string) => Promise<DemoUser>;
  logout: () => void;
};

export const DemoUserContext = createContext<DemoUserContextValue | null>(null);

export function DemoUserProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (userId: string) => {
    const validatedUser = await loginDemoUser(userId);
    localStorage.setItem(DEMO_USER_STORAGE_KEY, validatedUser.id);
    setUser(validatedUser);
    return validatedUser;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const storedId = getStoredDemoUserId();

    if (!storedId) {
      setIsInitializing(false);
      return () => controller.abort();
    }

    void loginDemoUser(storedId, controller.signal)
      .then((validatedUser) => {
        setUser(validatedUser);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          logout();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsInitializing(false);
        }
      });

    return () => controller.abort();
  }, [logout]);

  useEffect(() => {
    const handleInvalidAuth = () => logout();
    window.addEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
    return () => window.removeEventListener(AUTH_INVALID_EVENT, handleInvalidAuth);
  }, [logout]);

  const value = useMemo(
    () => ({ user, isInitializing, login, logout }),
    [isInitializing, login, logout, user],
  );

  return (
    <DemoUserContext.Provider value={value}>
      {children}
    </DemoUserContext.Provider>
  );
}
