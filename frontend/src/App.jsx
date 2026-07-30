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
import useAuthUser from "./hooks/useAuthUser.js";
import Layout from "./components/Layout.jsx";
import { useThemeStore } from "./store/UseThemeStore.js";

const App = () => {
  //tanstack query is used for data fetching and caching in react applications. It provides a simple and efficient way to manage server state, handle caching, and perform background updates. It helps to reduce the amount of boilerplate code needed for data fetching and provides a better user experience by keeping the UI in sync with the server state.

  const { isLoading, data: authUser, error } = useAuthUser();
  const {theme,setTheme}= useThemeStore();
  const isAuthenticated = Boolean(authUser); // Check if authUser is not null or undefined
  const isOnboarded = authUser?.isOnboarded ?? authUser?.isOnBoarded; // Check if the user is onboarded

  

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center" data-theme="winter">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }



  return (
    <div className="h-screen" data-theme={theme}> 
      <Routes>
  <Route
    path="/"
    element={isAuthenticated && isOnboarded ? (<Layout showSidebar={true}>
      <HomePage/>
    </Layout>):(
      <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
    )}
  />

  <Route
    path="/signup"
    element={!isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"}/>}
  />

  <Route
    path="/login"
    element={!isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/" : "/onboarding"} />}
  />

  <Route
    path="/notifications"
    element={isAuthenticated && isOnboarded ? (<Layout showSidebar={true}>
      <NotificationPage />
    </Layout>
    ) : (
      <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
    )}
  />

  <Route
    path="/call"
    element={isAuthenticated ? <CallPage /> : <Navigate to="/login" />}
  />

  <Route
    path="/chat/:id"
    element={isAuthenticated && isOnboarded ? (<Layout showSidebar={false}>
      <ChatPage />
    </Layout>
    ) : (
      <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
    )}
  />

  <Route
    path="/onboarding"
    element={isAuthenticated? (!isOnboarded ? (<OnboardingPage/>):(<Navigate to="/" />)) : (<Navigate to="/login" />)}
  />
</Routes>
      <Toaster />
    </div>
  );
};

export default App;
