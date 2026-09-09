import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../lib/api";
import toast from "react-hot-toast";

const useLogout = () => {
  const queryClient = useQueryClient();

  const {
    mutate: logoutMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast.success("Logged out successfully!");
      queryClient.setQueryData(["authUser"], null);
      queryClient.removeQueries({ queryKey: ["streamToken"] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to log out.");
    },
  });

  return { logoutMutation, isPending, error };
};
export default useLogout;
