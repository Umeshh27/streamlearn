import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, ShieldAlertIcon, ClockIcon, LogOutIcon, BookOpenIcon } from "lucide-react";
import useLogout from "../hooks/useLogout";
import toast from "react-hot-toast";

const SuspensionLockoutOverlay = ({ authUser }) => {
  const queryClient = useQueryClient();
  const { logoutMutation, isPending: isLoggingOut } = useLogout();

  const isBanned = Boolean(authUser?.isBanned);
  const rawSuspendedUntil = authUser?.suspendedUntil ? new Date(authUser.suspendedUntil).getTime() : null;

  const [timeLeftMs, setTimeLeftMs] = useState(() => {
    if (!rawSuspendedUntil) return 0;
    return Math.max(0, rawSuspendedUntil - Date.now());
  });

  const isSuspended = rawSuspendedUntil && timeLeftMs > 0;

  useEffect(() => {
    if (!rawSuspendedUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, rawSuspendedUntil - Date.now());
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        toast.success("Suspension period has concluded. Welcome back to LangBridge!");
        queryClient.invalidateQueries({ queryKey: ["authUser"] });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rawSuspendedUntil, queryClient]);

  if (!authUser || (!isBanned && !isSuspended)) {
    return null;
  }

  // Format MM:SS for countdown timer
  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);
  const formattedTimer = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-base-100 border border-base-300 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* PERMANENT BAN VIEW */}
        {isBanned ? (
          <>
            <div className="size-20 bg-error/15 text-error rounded-full flex items-center justify-center mx-auto ring-8 ring-error/10">
              <ShieldAlertIcon className="size-10 text-error" />
            </div>

            <div className="space-y-2">
              <span className="badge badge-error font-black uppercase text-xs tracking-wider px-3 py-2">
                Permanent Ban • Strike 3 of 3
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-base-content">
                Account Terminated
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed max-w-md mx-auto">
                Your account has been permanently suspended due to repeated or severe violations of LangBridge Community Guidelines.
              </p>
            </div>

            <div className="bg-base-200/80 border border-base-300 rounded-2xl p-4 text-left space-y-1">
              <span className="text-xs font-bold text-base-content/50 uppercase tracking-wide">
                Reason for Termination:
              </span>
              <p className="text-sm font-semibold text-error">
                {authUser.suspensionReason || "Violation of Community Rules & User Safety Policy"}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => logoutMutation()}
                disabled={isLoggingOut}
                className="btn btn-error btn-block font-bold text-error-content shadow-lg gap-2"
              >
                <LogOutIcon className="size-4" />
                {isLoggingOut ? "Logging out..." : "Log Out of LangBridge"}
              </button>
            </div>
          </>
        ) : (
          /* TEMPORARY SUSPENSION / COOLDOWN VIEW */
          <>
            <div className="size-20 bg-warning/15 text-warning rounded-full flex items-center justify-center mx-auto ring-8 ring-warning/10 animate-pulse">
              <AlertTriangleIcon className="size-10 text-warning" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="badge badge-warning font-black text-xs tracking-wide px-3 py-2">
                  Strike {authUser.strikeCount || 1} of 3
                </span>
                <span className="badge badge-neutral font-bold text-xs tracking-wide px-3 py-2">
                  Temporary Cooldown
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-base-content">
                Account Temporarily Suspended
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed max-w-md mx-auto">
                Your access to chat lounges, 1-on-1 calls, and community interactions is paused while you reflect on community guidelines.
              </p>
            </div>

            {/* LIVE COUNTDOWN TIMER CLOCK */}
            <div className="bg-base-200/90 border border-warning/30 rounded-3xl p-5 text-center space-y-1 shadow-inner">
              <div className="flex items-center justify-center gap-2 text-warning text-xs font-bold uppercase tracking-wider">
                <ClockIcon className="size-4" />
                <span>Access Restores In</span>
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black text-base-content tracking-wider py-1">
                {formattedTimer}
              </div>
              <p className="text-xs text-base-content/50">
                This page will automatically unlock once the cooldown reaches zero.
              </p>
            </div>

            {/* VIOLATION REASON & ESCALATION NOTICE */}
            <div className="bg-base-200/60 border border-base-300 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div>
                <span className="font-bold text-base-content/50 uppercase tracking-wide">
                  Reported Issue:
                </span>
                <p className="font-semibold text-base-content pt-0.5">
                  {authUser.suspensionReason || "Reported for community guidelines violation"}
                </p>
              </div>

              <div className="border-t border-base-300/80 pt-2 text-warning/90 font-medium">
                {authUser.strikeCount >= 2 ? (
                  <span>
                    🚨 <strong>FINAL WARNING:</strong> A third infraction will result in an instant permanent ban.
                  </span>
                ) : (
                  <span>
                    ⚠️ <strong>Next Offense:</strong> Will result in a 10-minute lockout. Continued misconduct leads to permanent ban.
                  </span>
                )}
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href="/rules"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost border border-base-300 hover:bg-base-200 text-base-content btn-sm sm:btn-md flex-1 font-bold gap-2 w-full"
              >
                <BookOpenIcon className="size-4" />
                Review Rules
              </a>

              <button
                onClick={() => logoutMutation()}
                disabled={isLoggingOut}
                className="btn btn-ghost text-base-content/70 hover:text-base-content btn-sm sm:btn-md font-bold gap-2 w-full sm:w-auto"
              >
                <LogOutIcon className="size-4" />
                Log Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuspensionLockoutOverlay;
