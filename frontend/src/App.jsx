import React from 'react'
import { Routes, Route } from 'react-router'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import CallPage from './pages/CallPage.jsx'
import NotificationPage from './pages/NotificationPage.jsx'
import { Toaster } from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const App = () => {

  //tanstack query is used for data fetching and caching in react applications. It provides a simple and efficient way to manage server state, handle caching, and perform background updates. It helps to reduce the amount of boilerplate code needed for data fetching and provides a better user experience by keeping the UI in sync with the server state.

  const {data,isLoading,error}= useQuery({
    queryKey:"todos",
    queryFn: async()=>{
      const res = await axios.get("https://jsonplaceholder.typicode.com/todos")
      return res.data;
    }
  })
  console.log(data,isLoading,error);

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
      <Toaster />
    </div>
  )
}

export default App