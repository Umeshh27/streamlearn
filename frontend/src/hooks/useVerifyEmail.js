import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyEmail, resendVerificationCode } from "../lib/api";
import toast from "react-hot-toast";

export const useVerifyEmail = () => {
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      toast.success("Email verified! Welcome to LangBridge.");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Invalid or expired verification code. Please try again."
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendVerificationCode,
    onSuccess: (data) => {
      toast.success(data?.message || "New 6-digit verification code sent to your email!");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to resend code. Please try again in a moment."
      );
    },
  });

  return {
    verifyEmail: verifyMutation.mutate,
    isVerifying: verifyMutation.isPending,
    resendCode: resendMutation.mutate,
    isResending: resendMutation.isPending,
  };
};

export default useVerifyEmail;
