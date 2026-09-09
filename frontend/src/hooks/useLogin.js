import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../lib/api";
import toast from "react-hot-toast";

const useLogin = (options = {}) => {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      toast.success("Logged in successfully!");
      if (data?.user) {
        queryClient.setQueryData(["authUser"], { user: data.user });
      }
      if (data?.streamToken) {
        queryClient.setQueryData(["streamToken"], { token: data.streamToken });
      }
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      if (!data?.streamToken) {
        queryClient.invalidateQueries({ queryKey: ["streamToken"] });
      }
      if (options.onSuccess) options.onSuccess(data);
    },
    onError: (err) => {
      const data = err.response?.data;
      if (!data?.isUnverified) {
        toast.error(data?.message || "Failed to log in. Please check your credentials.");
      }
      if (options.onError) options.onError(err);
    },
  });

  return { error, isPending, loginMutation: mutate };
};

export default useLogin;
