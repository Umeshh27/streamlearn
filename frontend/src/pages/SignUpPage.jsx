import { useState, useEffect } from "react";
import { ShipWheelIcon, Mail, ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { Link, useSearchParams } from "react-router";

import useSignUp from "../hooks/useSignUp";
import useVerifyEmail from "../hooks/useVerifyEmail";
import { useThemeStore } from "../store/useThemeStore";
import ThemeSelector from "../components/ThemeSelector";

const SignUpPage = () => {
  const { theme } = useThemeStore();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(() => searchParams.get("step") === "verify" ? "verify" : "signup");
  const [registeredEmail, setRegisteredEmail] = useState(() => searchParams.get("email") || "");

  const [signupData, setSignupData] = useState({
    fullName: "",
    email: searchParams.get("email") || "",
    password: "",
  });

  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const { isPending, signupMutation } = useSignUp({
    onSuccess: (data) => {
      const emailTarget = data?.email || signupData.email;
      setRegisteredEmail(emailTarget);
      setStep("verify");
      setResendCooldown(60);
    },
  });

  const { verifyEmail, isVerifying, resendCode, isResending } = useVerifyEmail();

  // Handle 60s cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSignup = (e) => {
    e.preventDefault();
    signupMutation(signupData);
  };

  const handleVerify = (e) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) return;
    verifyEmail({
      email: registeredEmail || signupData.email,
      code: cleanCode,
    });
  };

  const handleResend = () => {
    if (resendCooldown > 0 || isResending) return;
    const targetEmail = registeredEmail || signupData.email;
    if (!targetEmail) return;
    resendCode({ email: targetEmail });
    setResendCooldown(60);
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
        {/* LEFT SIDE: FORM OR VERIFICATION */}
        <div className="w-full lg:w-1/2 p-6 sm:p-10 flex flex-col justify-center">
          {/* LOGO */}
          <div className="mb-6 flex items-center justify-start gap-2.5">
            <ShipWheelIcon className="size-8 text-primary" />
            <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              LangBridge
            </span>
          </div>

          {step === "signup" ? (
            /* ─── STEP 1: REGISTRATION ─── */
            <div className="w-full">
              <form onSubmit={handleSignup}>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-base-content tracking-tight">
                      Create an Account
                    </h2>
                    <p className="text-sm text-base-content/60 mt-1">
                      Join LangBridge and start practicing languages worldwide!
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {/* FULLNAME */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text font-semibold text-xs text-base-content/75">Full Name</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        className="input input-bordered w-full text-sm font-medium"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        required
                        disabled={isPending}
                      />
                    </div>

                    {/* EMAIL */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text font-semibold text-xs text-base-content/75">Email Address</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="input input-bordered w-full text-sm font-medium"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                        disabled={isPending}
                      />
                    </div>

                    {/* PASSWORD */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text font-semibold text-xs text-base-content/75">Password</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your password (min 6 characters)"
                        className="input input-bordered w-full text-sm font-medium"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        minLength={6}
                        disabled={isPending}
                      />
                    </div>

                    {/* RULES CHECKBOX */}
                    <div className="p-3 rounded-xl bg-base-200/60 border border-base-300 shadow-2xs">
                      <label className="label cursor-pointer justify-start gap-2.5 items-start p-0">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary mt-0.5 shrink-0"
                          required
                          disabled={isPending}
                        />
                        <span className="text-xs leading-relaxed text-base-content/85">
                          I confirm I am <span className="badge badge-primary badge-xs text-primary-content font-bold mx-1">14+</span> and agree to the{" "}
                          <Link to="/rules" target="_blank" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                            Community Rules &amp; Safety Disclaimer
                          </Link>
                        </span>
                      </label>
                    </div>
                  </div>

                  <button className="btn btn-primary text-primary-content w-full font-bold shadow-md gap-2" type="submit" disabled={isPending}>
                    {isPending ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Sending Verification Code...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>

                  <div className="text-center mt-3">
                    <p className="text-xs sm:text-sm text-base-content/75">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary font-bold hover:underline">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* ─── STEP 2: 6-DIGIT EMAIL VERIFICATION ─── */
            <div className="w-full space-y-5 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-primary/10 text-primary mb-3">
                  <Mail className="size-6" />
                </div>
                <h2 className="text-2xl font-bold text-base-content tracking-tight">
                  Verify Your Email
                </h2>
                <p className="text-sm text-base-content/65 mt-1 leading-relaxed">
                  We've sent a 6-digit verification code to:
                  <br />
                  <strong className="text-base-content font-bold">{registeredEmail || signupData.email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text font-semibold text-xs text-base-content/75">6-Digit Code</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="• • • • • •"
                    className="input input-bordered w-full text-center text-2xl font-mono tracking-[0.5em] font-extrabold text-primary placeholder:text-base-content/25 h-14 bg-base-200/50"
                    value={verificationCode}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setVerificationCode(onlyNums);
                    }}
                    required
                    disabled={isVerifying}
                  />
                  <span className="text-[11px] text-base-content/50 mt-1.5 text-center">
                    Check your inbox and spam folder (valid for 15 minutes)
                  </span>
                </div>

                <button
                  className="btn btn-primary text-primary-content w-full font-bold shadow-md gap-2"
                  type="submit"
                  disabled={isVerifying || verificationCode.trim().length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Verify &amp; Activate Account</span>
                    </>
                  )}
                </button>
              </form>

              {/* RESEND AND BACK ACTIONS */}
              <div className="pt-2 border-t border-base-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className="btn btn-ghost btn-xs font-semibold text-primary disabled:text-base-content/40 gap-1.5"
                >
                  <RefreshCw className={`size-3 ${isResending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend 6-Digit Code"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("signup")}
                  className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content gap-1"
                >
                  <ArrowLeft className="size-3" />
                  <span>Change Email</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: MODERN COMMUNITY ILLUSTRATION */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-primary/10 via-base-200/50 to-secondary/10 items-center justify-center p-8 border-l border-base-300/60">
          <div className="max-w-md space-y-6 text-center">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-base-300/60 bg-base-100">
              <img
                src="/rules-community.jpg"
                alt="LangBridge Global Language Community"
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-base-content">
                Connect with language partners worldwide
              </h3>
              <p className="text-xs sm:text-sm text-base-content/65 leading-relaxed">
                Practice conversations, make genuine friends, and improve your speaking skills in a verified, safe community.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
