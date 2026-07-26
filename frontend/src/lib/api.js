import { axiosInstance } from "./axios.js";

export const signup = async (signUpData) => {
    const res = await axiosInstance.post("/auth/signup", signUpData); 
    return res.data;
}

export const getAuthUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        return res.data;
      } catch (error) {
        return null;
      }
}

export const completeOnboarding = async (userData) => {
    const response= await axiosInstance.post("/auth/onboarding", userData);
    return response.data;
}