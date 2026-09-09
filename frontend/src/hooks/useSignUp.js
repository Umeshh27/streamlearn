import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signup } from "../lib/api";
import toast from "react-hot-toast";

const useSignUp = (options = {}) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      if (data?.requiresVerification) {
        toast.success(data.message || "Verification code sent to your email!");
        if (options.onSuccess) options.onSuccess(data);
      } else {
        toast.success("Account created successfully!");
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
        if (options.onSuccess) options.onSuccess(data);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create account. Please try again.");
    },
  });

  return { isPending, error, signupMutation: mutate };
};
export default useSignUp;
