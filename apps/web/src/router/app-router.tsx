import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { AppLayout } from "../components/AppLayout";
import { LoadingState } from "../components/LoadingState";
import { useDemoUser } from "../hooks/useDemoUser";
import { ConsentPage } from "../pages/ConsentPage";
import { DevHealthPage } from "../pages/DevHealthPage";
import { LoginPage } from "../pages/LoginPage";
import { JourneyIntroductionPage } from "../pages/JourneyIntroductionPage";
import { PassportPage } from "../pages/PassportPage";
import { ProfilePage } from "../pages/ProfilePage";
import { QuestionPage } from "../pages/QuestionPage";
import { ReservePage } from "../pages/ReservePage";
import { JourneyIntroPage } from "../pages/JourneyIntroPage";
import { JourneyArPage } from "../pages/JourneyArPage";
import { JourneyPage } from "../pages/JourneyPage";
import { JourneyResultPage } from "../pages/JourneyResultPage";
import { SharedResultPage } from "../pages/SharedResultPage";
import { StaffJourneyPage } from "../pages/StaffJourneyPage";
import { StaffLoginPage } from "../pages/StaffLoginPage";
import { StaffReservationsPage } from "../pages/StaffReservationsPage";
import { StoreCheckInPage } from "../pages/StoreCheckInPage";
import { ServiceIntroductionPage } from "../pages/ServiceIntroductionPage";

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

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ServiceIntroductionPage />} />
      <Route path="/journey-introduction" element={<JourneyIntroductionPage />} />
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
        <Route path="/journey/:journeyId/ar" element={<JourneyArPage />} />
      </Route>
      <Route element={<RequireStaff />}>
        <Route path="/staff/reservations" element={<StaffReservationsPage />} />
        <Route path="/staff/journeys/:journeyId" element={<StaffJourneyPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
