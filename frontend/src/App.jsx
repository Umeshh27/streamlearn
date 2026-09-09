import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";

import HomePage from "./pages/HomePage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import VoiceAssistantPage from "./pages/VoiceAssistantPage.jsx";
import RulesPage from "./pages/RulesPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

import { Toaster } from "react-hot-toast";

import PageLoader from "./components/PageLoader.jsx";
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/useThemeStore.js";
import { StreamChatProvider } from "./context/StreamChatContext.jsx";
import SuspensionLockoutOverlay from "./components/SuspensionLockoutOverlay.jsx";
import SubAdminInvitationModal from "./components/SubAdminInvitationModal.jsx";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;
  const isStaff =
    authUser?.role === "admin" ||
    authUser?.role === "subadmin" ||
    (authUser?.email && authUser.email.toLowerCase() === "umeshalla73@gmail.com");

  if (isLoading) return <PageLoader />;

  return (
    <StreamChatProvider>
      <div className="app-root-container" data-theme={theme}>
        {/* Fullscreen suspension & timeout lockout overlay */}
        <SuspensionLockoutOverlay authUser={authUser} />

        {/* Sub-Admin appointment invitation modal */}
        <SubAdminInvitationModal authUser={authUser} />

        <Routes>
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/disclaimer" element={<RulesPage />} />
          <Route
            path="/"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}>
                  <HomePage />
                </Layout>
              ) : isAuthenticated && !isOnboarded ? (
                <Navigate to="/onboarding" />
              ) : (
                <RulesPage />
              )
            }
          />
          <Route
            path="/signup"
            element={
              !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
            }
          />
          <Route
            path="/login"
            element={
              !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />
            }
          />
          <Route
            path="/notifications"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}>
                  <NotificationsPage />
                </Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/friends"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}>
                  <FriendsPage />
                </Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/call/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <CallPage />
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/ai-tutor"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}>
                  <VoiceAssistantPage />
                </Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />
          <Route
            path="/voice-assistant"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={true}>
                  <VoiceAssistantPage />
                </Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/chat/:id"
            element={
              isAuthenticated && isOnboarded ? (
                <Layout showSidebar={false}>
                  <ChatPage />
                </Layout>
              ) : (
                <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
              )
            }
          />

          <Route
            path="/onboarding"
            element={
              isAuthenticated ? (
                !isOnboarded ? (
                  <OnboardingPage />
                ) : (
                  <Navigate to="/" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Staff & Admin Command Center */}
          <Route
            path="/admin"
            element={
              isAuthenticated && isStaff ? (
                <AdminPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>

        <Toaster />
      </div>
    </StreamChatProvider>
  );
};
export default App;
