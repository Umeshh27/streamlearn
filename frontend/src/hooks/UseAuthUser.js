import React from 'react'
import { useQuery } from "@tanstack/react-query";
import { getAuthUser } from "../lib/api.js";

const UseAuthUser = () => {
   const authUser = useQuery({
    queryKey: ["authUser"],
    queryFn: getAuthUser,
    retry: false, // Disable retrying on failure
  });

  return {
    isLoading: authUser.isLoading,
    data: authUser.data?.user,
    authUser: authUser.data?.user,
    error: authUser.error,
  };
}

export const useAuthUser = UseAuthUser;
export default UseAuthUser;