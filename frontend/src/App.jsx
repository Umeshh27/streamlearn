import React from 'react'
import { Routes, Route } from 'react-router'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import CallPage from './pages/CallPage.jsx'
import NotificationPage from './pages/NotificationPage.jsx'

const App = () => {
  return (
    <div className='h-screen' data-theme="night">
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignUpPage />} />
        <Route path='/onboarding' element={<OnboardingPage />} />
        <Route path='/chat' element={<ChatPage />} />
        <Route path='/call' element={<CallPage />} />
        <Route path='/notifications' element={<NotificationPage />} />
      </Routes>
    </div>
  )
}

export default App