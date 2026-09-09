import axios from "axios";

// In development, Vite proxies '/api' to 'http://localhost:5000/api'.
// In production, Express directly serves '/api'.
// Using same-origin relative '/api' ensures session cookies are never blocked or dropped on refresh.
export const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true, // send cookies with the request
});
