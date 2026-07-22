import React from "react";
import { ShipWheelIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { signup } from "../lib/api.js";

const SignUpPage = () => {
  const [signUpData, setSignUpData] = React.useState({
    fullName: "",
    email: "",
    password: "",
  });
  const queryClient = useQueryClient();
  const { mutate: signupMutation, isPending, error } = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      toast.success("Account created successfully!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create account");
    },
  });

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signUpData);
  };

  return (
    <div
      className="h-screen flex items-center justify-center p-4 sm:p-6 md:p-8"
      data-theme="forest"
    >
      <div className="border border-primary/25 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-xl shadow-lg overflow-hidden">

      {/* // Left side  */}
      <div className="w-full lg:w-1/2 p-4 sm:p-8 flex flex-col">
          {/* logo */}
          <div className="mb-4 flex items-center justify-start gap-2">
            <ShipWheelIcon className="size-9 text-primary" />
            <span className="text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
            StreamLearn </span>

            {/* error */}
            {error && (
              <div className="alert alert-error shadow-lg mt-4">
                <div>
                  <span>{error.response?.data?.message || "An error occurred"}</span>
                </div>
              </div>
            )}
          </div>

          <div className="w-full">
            <form onSubmit={handleSignup}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Create an Account</h2>
                  <p>Join StreamLearn And Start Your Learning Adventure!</p>
                </div>

                <div className="space-y-3">
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Full Name</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Enter your Full name"
                      className="input input-bordered w-full"
                      value={signUpData.fullName}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, fullName: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>

                    <input
                      type="text"
                      placeholder="Enter your Email"
                      className="input input-bordered w-full"
                      value={signUpData.email}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>

                    <input
                      type="password"
                      placeholder="Enter your Password"
                      className="input input-bordered w-full"
                      value={signUpData.password}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, password: e.target.value })
                      }
                      required
                    />

                    <p className="text-xm opacity-70 mt-1">
                      Password must be at least 6 characters long.
                    </p>
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm" required/>
                        <span className="text-xs leading-tight">
                          I agree to the{" "}
                          <span className="text-primary hover:underline">terms of service</span> and{" "}
                          <span className="text-primary hover:underline">privacy policy</span>
                        </span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full">
                { isPending ? "Signing Up..." : "Create Account" }
                </button>

                <div className="text-center mt-4">
                  <p className="text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary hover:underline">
                      Log in
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
      </div>

      {/* // Right side */}
      <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center bg-primary/10">
      <div className="max-w-md p-8">
        <div className="relative aspect-square max-w-sm mx-auto">
          <img
            src="/Video-call-bro.png"
            alt="Sign Up"
            />
        </div>
        <div className="text-center space-y-3 mt-6">
          <h2 className="text-xl font-semibold">Connect with language partners worldwide!</h2>
          <p className="text-sm opacity-70">
            practice conversations, share experiences, and enhance your language skills in a supportive community.
          </p>
        </div>
      </div>

      </div>
      </div>
    </div>
  );
};

export default SignUpPage;
