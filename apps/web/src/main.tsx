import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { DemoUserProvider } from "./context/DemoUserContext";
import { ReservationDraftProvider } from "./state/reservation-draft";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <DemoUserProvider>
        <ReservationDraftProvider>
          <App />
        </ReservationDraftProvider>
      </DemoUserProvider>
    </BrowserRouter>
  </StrictMode>,
);
