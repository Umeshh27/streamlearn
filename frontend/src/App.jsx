import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import CallPage from "./pages/CallPage.jsx";
import NotificationPage from "./pages/NotificationPage.jsx";
import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./lib/axios.js";
import { getAuthUser } from "./lib/api.js";
import UseAuthUser from "./hooks/UseAuthUser.js";

const App = () => {
  //tanstack query is used for data fetching and caching in react applications. It provides a simple and efficient way to manage server state, handle caching, and perform background updates. It helps to reduce the amount of boilerplate code needed for data fetching and provides a better user experience by keeping the UI in sync with the server state.

  const { isLoading, data: authUser, error } = UseAuthUser();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" data-theme="night">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }



  return (
    <div className="h-screen" data-theme="night">
      <Routes>
  <Route
    path="/"
    element={authUser ? <HomePage /> : <Navigate to="/login" />}
  />

  <Route
    path="/signup"
    element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
  />

  <Route
    path="/login"
    element={!authUser ? <LoginPage /> : <Navigate to="/" />}
  />

  <Route
    path="/notifications"
    element={authUser ? <NotificationPage /> : <Navigate to="/login" />}
  />

  <Route
    path="/call"
    element={authUser ? <CallPage /> : <Navigate to="/login" />}
  />

  <Route
    path="/chat"
    element={authUser ? <ChatPage /> : <Navigate to="/login" />}
  />

  <Route
    path="/onboarding"
    element={authUser ? <OnboardingPage /> : <Navigate to="/login" />}
  />
</Routes>
      <Toaster />
    </div>
  );
};

export default App;
