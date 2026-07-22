import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

function HomePage() {
  const queryClient = useQueryClient();

  const { mutate: logout, isPending } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/auth/logout");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Logged out successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to log out");
    },
  });

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Welcome to StreamLearn!</h1>
      <button
        onClick={() => logout()}
        disabled={isPending}
        className="btn btn-outline btn-error"
      >
        {isPending ? "Logging out..." : "Log Out"}
      </button>
    </div>
  );
}

export default HomePage;