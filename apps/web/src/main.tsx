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
import "./styles/introduction.css";
import "./styles/reserve.css";
import "./styles/consent.css";
import "./styles/question.css";
import "./styles/passport.css";
import "./styles/check-in.css";
import "./styles/journey-select.css";
import "./styles/journey-result.css";
import "./styles/shared-result.css";
import "./styles/ar-experience.css";
import "./styles/login-experience.css";
import "./styles/journey-intro-experience.css";
import "./styles/profile-experience.css";
import "./styles/journey-support.css";

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
