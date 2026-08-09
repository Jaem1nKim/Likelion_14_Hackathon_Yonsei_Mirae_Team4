import { useContext } from "react";

import { DemoUserContext } from "../context/DemoUserContext";

export function useDemoUser() {
  const context = useContext(DemoUserContext);
  if (!context) {
    throw new Error("useDemoUser must be used within DemoUserProvider");
  }
  return context;
}
