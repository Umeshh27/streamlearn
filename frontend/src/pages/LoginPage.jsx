import { useState } from "react";
import { ShipWheelIcon, ShieldCheckIcon, ArrowRightIcon, Mail } from "lucide-react";
import { Link } from "react-router";
import useLogin from "../hooks/useLogin";
import { useThemeStore } from "../store/useThemeStore";
import ThemeSelector from "../components/ThemeSelector";

const LoginPage = () => {
  const { theme } = useThemeStore();
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  const { isPending, loginMutation } = useLogin({
    onError: (err) => {
      if (err.response?.data?.isUnverified) {
        setUnverifiedEmail(err.response.data.email || loginData.email);
      }
    },
  });

  const handleLogin = (e) => {
    e.preventDefault();
    setUnverifiedEmail(null);
    loginMutation(loginData);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 relative"
      data-theme={theme}
    >
      <div className="absolute top-3 right-3 sm:top-5 sm:right-6 z-20">
        <ThemeSelector />
      </div>

      <div className="border border-base-300 flex flex-col lg:flex-row w-full max-w-5xl mx-auto bg-base-100 rounded-2xl shadow-xl overflow-hidden">
        {/* LOGIN FORM SECTION */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          {/* LOGO */}
          <div className="mb-6 flex items-center justify-start gap-2.5">
            <ShipWheelIcon className="size-8 text-primary" />
            <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              Streamify
            </span>
          </div>

          <div className="w-full">
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-base-content tracking-tight">
                    Welcome Back
                  </h2>
                  <p className="text-sm text-base-content/60 mt-1">
                    Sign in to your account to continue your language journey
                  </p>
                </div>

                {/* UNVERIFIED EMAIL ALERT */}
                {unverifiedEmail && (
                  <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-warning">
                      <Mail className="size-4 shrink-0" />
                      <span>Email Verification Required</span>
                    </div>
                    <p className="text-base-content/80 leading-relaxed">
                      Your account is created, but your email is not verified yet. We sent a 6-digit code to <strong>{unverifiedEmail}</strong>.
                    </p>
                    <Link
                      to={`/signup?step=verify&email=${encodeURIComponent(unverifiedEmail)}`}
                      className="btn btn-warning text-warning-content btn-sm font-bold w-full gap-1.5"
                    >
                      <span>Enter 6-Digit Code Now</span>
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <div className="form-control w-full space-y-1">
                    <label className="label py-1">
                      <span className="label-text font-semibold text-xs text-base-content/75">Email Address</span>
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="input input-bordered w-full text-sm font-medium"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      disabled={isPending}
                    />
                  </div>

                  <div className="form-control w-full space-y-1">
                    <label className="label py-1">
                      <span className="label-text font-semibold text-xs text-base-content/75">Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Enter your password"
                      className="input input-bordered w-full text-sm font-medium"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      disabled={isPending}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary text-primary-content w-full font-bold shadow-md mt-1" disabled={isPending}>
                    {isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <div className="text-center mt-2">
                    <p className="text-xs sm:text-sm text-base-content/80">
                      Don't have an account?{" "}
                      <Link to="/signup" className="text-primary hover:underline font-bold">
                        Create one
                      </Link>
                    </p>
                  </div>

                  {/* 14+ COMMUNITY RULES LINK */}
                  <div className="mt-3 pt-3 border-t border-base-200">
                    <Link
                      to="/rules"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-base-200/60 hover:bg-primary/10 border border-base-300 hover:border-primary/40 transition-all duration-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content flex items-center justify-center transition-colors shrink-0">
                          <ShieldCheckIcon className="size-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-base-content group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>Community Safety &amp; Rules</span>
                            <span className="badge badge-primary badge-xs text-primary-content font-bold">14+</span>
                          </p>
                          <p className="text-[11px] opacity-65 leading-tight">
                            Safe language exchange • View guidelines
                          </p>
                        </div>
                      </div>
                      <ArrowRightIcon className="size-3.5 text-base-content/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* IMAGE SECTION */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-primary/10 via-base-200/50 to-secondary/10 items-center justify-center p-8 border-l border-base-300/60">
          <div className="max-w-md space-y-6 text-center">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-base-300/60 bg-base-100">
              <img
                src="/rules-community.jpg"
                alt="Streamify Language Community"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-base-content">
                Connect with language partners worldwide
              </h3>
              <p className="text-xs sm:text-sm text-base-content/65 leading-relaxed">
                Practice conversations, make friends, and improve your language skills together
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
