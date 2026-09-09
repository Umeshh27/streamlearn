import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheckIcon,
  ZapIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  LockIcon,
  ScaleIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { respondToStaffInvitation } from "../lib/api";

const SubAdminInvitationModal = ({ authUser }) => {
  const queryClient = useQueryClient();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isDismissedSession, setIsDismissedSession] = useState(() => {
    return sessionStorage.getItem("streamlearn_subadmin_modal_postponed") === "true";
  });

  const isPending = authUser?.subadminInvitation?.status === "pending";

  const { mutate: respondMutation, isPending: isResponding } = useMutation({
    mutationFn: respondToStaffInvitation,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });

      if (variables.action === "accept") {
        toast.success(
          "🎉 Welcome to the Moderation Staff! You are now an official Sub-Admin. The Staff Portal is now live in your navigation bar.",
          { duration: 6000 }
        );
      } else {
        toast("Sub-Admin invitation declined. Your role remains Learner.", {
          icon: "ℹ️",
        });
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to process staff invitation response."
      );
    },
  });

  // If not pending or already postponed for this session, do not render
  if (!isPending || isDismissedSession) return null;

  const handleAccept = () => {
    if (!agreedToTerms) {
      toast.error("Please confirm that you have read and agreed to the responsibilities and security requirements.");
      return;
    }
    respondMutation({ action: "accept" });
  };

  const handleDecline = () => {
    if (window.confirm("Are you sure you want to decline this Sub-Admin appointment?")) {
      respondMutation({ action: "reject" });
    }
  };

  const handlePostpone = () => {
    sessionStorage.setItem("streamlearn_subadmin_modal_postponed", "true");
    setIsDismissedSession(true);
    toast("You can review this invitation anytime in your Notifications page.", {
      icon: "📋",
      duration: 4000,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-base-100 border border-primary/30 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90dvh] max-h-[90vh] ring-1 ring-primary/20">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary/20 via-secondary/15 to-accent/15 p-6 border-b border-base-300 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary text-primary-content shadow-lg ring-4 ring-primary/20">
              <ZapIcon className="size-6 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-info text-info-content text-xs font-black tracking-wider uppercase">
                  Staff Appointment
                </span>
                <span className="badge badge-warning text-warning-content badge-sm font-bold uppercase text-[10px]">
                  Action Required
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-base-content mt-1">
                Sub-Admin Nomination & Terms
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300">
            <p className="font-semibold text-base-content leading-relaxed">
              Hello <span className="font-black text-primary">{authUser?.fullName || "Learner"}</span>, you have been officially selected by the Head Administrator to join the LangBridge moderation team as a <strong className="text-primary font-bold">Sub-Admin</strong>.
            </p>
            <p className="text-xs text-base-content/70 mt-1">
              Before your staff privileges can be activated, please thoroughly review your duties and security accountability requirements below.
            </p>
          </div>

          {/* Duties Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-base-content/80 flex items-center gap-1.5">
              <ScaleIcon className="size-4 text-primary" />
              <span>Core Staff Responsibilities</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-xl bg-base-200 border border-base-300/80 flex items-start gap-3">
                <ShieldCheckIcon className="size-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-base-content">Active Community Safety</p>
                  <p className="text-xs text-base-content/70">
                    Monitor Global Chat, assist learners, and swiftly review user reports in the moderation queue.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-base-200 border border-base-300/80 flex items-start gap-3">
                <ClockIcon className="size-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-base-content">Fair Disciplinary Enforcement</p>
                  <p className="text-xs text-base-content/70">
                    Issue temporary 5m or 10m timeouts, unban wrongfully punished accounts, and clear strikes without personal bias or favoritism.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-base-200 border border-base-300/80 flex items-start gap-3">
                <LockIcon className="size-5 text-info shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-base-content">Confidentiality & Integrity</p>
                  <p className="text-xs text-base-content/70">
                    Moderation queue data, reporter identities, and internal discussions are confidential. Sharing them outside the staff team is strictly prohibited.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Accountability Warning */}
          <div className="p-4 rounded-2xl bg-error/10 border border-error/30 space-y-2">
            <div className="flex items-center gap-2 text-error font-black text-xs uppercase tracking-wide">
              <AlertTriangleIcon className="size-4" />
              <span>Mandatory Security & Accountability Notice</span>
            </div>
            <p className="text-xs text-base-content/90 font-medium leading-relaxed">
              With elevated staff powers comes strict responsibility. If you misuse moderation tools (e.g. harassing learners, silencing valid opinions), fail to protect your account security, or leak confidential reports, you will face:
            </p>
            <ul className="text-xs list-disc list-inside space-y-1 font-semibold text-error/90">
              <li>Immediate and permanent revocation of staff privileges</li>
              <li>Instant account suspension or permanent platform ban</li>
              <li>Disciplinary review and blacklist from future roles</li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-base-200 border border-base-300 cursor-pointer hover:bg-base-200/90 transition-colors">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm mt-0.5"
            />
            <span className="text-xs text-base-content font-bold select-none leading-normal">
              I have read, understood, and accept these moderation duties and security accountability requirements. I agree to serve the community fairly.
            </span>
          </label>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-base-300 bg-base-200/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePostpone}
            disabled={isResponding}
            className="btn btn-ghost btn-sm text-xs text-base-content/60 hover:text-base-content order-3 sm:order-1"
          >
            Review Later
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isResponding}
              className="btn btn-sm bg-error/15 hover:bg-error text-error hover:text-error-content border border-error/30 font-bold flex-1 sm:flex-none gap-1.5 shadow-2xs transition-all"
            >
              <XCircleIcon className="size-4" />
              <span>Decline</span>
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreedToTerms || isResponding}
              className="btn btn-sm btn-primary text-primary-content font-black shadow-md flex-1 sm:flex-none gap-1.5"
            >
              {isResponding ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              <span>Accept Sub-Admin Role</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubAdminInvitationModal;
