import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { getUserConsent } from "../api/consent-api";
import { AppLayout } from "../components/AppLayout";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useDemoUser } from "../hooks/useDemoUser";
import { ConsentPage } from "../pages/ConsentPage";
import { DevHealthPage } from "../pages/DevHealthPage";
import { LoginPage } from "../pages/LoginPage";
import { PassportPage } from "../pages/PassportPage";
import { ProfilePage } from "../pages/ProfilePage";
import { QuestionPage } from "../pages/QuestionPage";
import { ReservePage } from "../pages/ReservePage";
import { JourneyIntroPage } from "../pages/JourneyIntroPage";
import { JourneyPage } from "../pages/JourneyPage";
import { JourneyResultPage } from "../pages/JourneyResultPage";
import { SharedResultPage } from "../pages/SharedResultPage";
import { StaffJourneyPage } from "../pages/StaffJourneyPage";
import { StaffLoginPage } from "../pages/StaffLoginPage";
import { StaffReservationsPage } from "../pages/StaffReservationsPage";
import { StoreCheckInPage } from "../pages/StoreCheckInPage";

function RequireCustomer() {
  const { user, isInitializing } = useDemoUser();
  const location = useLocation();

  if (isInitializing) {
    return (
      <AppLayout>
        <LoadingState message="로그인 정보를 확인하고 있습니다." />
      </AppLayout>
    );
  }

  if (!user || user.role !== "CUSTOMER") {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function RequireStaff() {
  const { user, isInitializing } = useDemoUser();
  const location = useLocation();

  if (isInitializing) {
    return <AppLayout><LoadingState message="직원 정보를 확인하고 있습니다." /></AppLayout>;
  }
  if (!user || user.role !== "STAFF") {
    return <Navigate replace to="/staff/login" state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function HomeRoute() {
  const { user, isInitializing } = useDemoUser();
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role === "STAFF") {
      setDestination("/staff/reservations");
      return;
    }

    const controller = new AbortController();
    setError(null);
    void getUserConsent(user.id, controller.signal)
      .then(({ currentConsent }) => {
        setDestination(
          currentConsent?.journeyDataAllowed ? "/profile" : "/consent",
        );
      })
      .catch((caught: unknown) => {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : "동의를 확인하지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [attempt, user]);

  if (isInitializing) {
    return <LoadingState message="Journey를 준비하고 있습니다." />;
  }
  if (!user) {
    return <Navigate replace to="/login" />;
  }
  if (destination) {
    return <Navigate replace to={destination} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />;
  }
  return <LoadingState message="동의 상태를 확인하고 있습니다." />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout>
            <HomeRoute />
          </AppLayout>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/share/:shareToken" element={<SharedResultPage />} />
      <Route path="/dev/health" element={<DevHealthPage />} />
      <Route element={<RequireCustomer />}>
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reserve" element={<ReservePage />} />
        <Route path="/question" element={<QuestionPage />} />
        <Route path="/passport/:reservationId" element={<PassportPage />} />
        <Route path="/store/check-in" element={<StoreCheckInPage />} />
        <Route path="/journey/:journeyId/intro" element={<JourneyIntroPage />} />
        <Route path="/journey/:journeyId/select" element={<JourneyPage view="select" />} />
        <Route path="/journey/:journeyId/route" element={<JourneyPage view="route" />} />
        <Route path="/journey/:journeyId/progress" element={<JourneyPage view="progress" />} />
        <Route path="/journey/:journeyId/decision" element={<JourneyPage view="decision" />} />
        <Route path="/journey/:journeyId/result" element={<JourneyResultPage />} />
      </Route>
      <Route element={<RequireStaff />}>
        <Route path="/staff/reservations" element={<StaffReservationsPage />} />
        <Route path="/staff/journeys/:journeyId" element={<StaffJourneyPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
