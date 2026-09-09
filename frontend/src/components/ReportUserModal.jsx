import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangleIcon, ShieldAlertIcon, XIcon, CheckCircle2Icon } from "lucide-react";
import { submitUserReport } from "../lib/api";
import toast from "react-hot-toast";

const REPORT_REASONS = [
  { id: "harassment", label: "Harassment & Bullying", desc: "Targeted insults, hostility, or aggressive behavior" },
  { id: "inappropriate_webcam", label: "Inappropriate Webcam / Attire", desc: "Indecent webcam stream, offensive visuals, or inappropriate conduct" },
  { id: "vulgar_language", label: "Vulgar / Obscene Language", desc: "Profanity, offensive sexual comments, or slurs" },
  { id: "spam_flooding", label: "Spam & Advertising", desc: "Flooding messages, unsolicited links, or product promos" },
  { id: "dating_unsolicited", label: "Unwanted Dating / Solicitation", desc: "Treating the educational platform as a dating service" },
  { id: "other", label: "Other Rule Violation", desc: "Behavior violating Streamify community guidelines" },
];

const ReportUserModal = ({ targetUser, context = "Community Lounge", onClose }) => {
  const [selectedReason, setSelectedReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutate: sendReport, isPending } = useMutation({
    mutationFn: () =>
      submitUserReport({
        reportedUserId: targetUser._id || targetUser.id,
        reason: selectedReason,
        details,
        context,
      }),
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Report submitted to moderation team");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to submit report");
    },
  });

  if (!targetUser) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-base-100 border border-base-300 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-200 relative max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute top-4 right-4 text-base-content/60 hover:text-base-content"
        >
          <XIcon className="size-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="size-16 bg-success/15 text-success rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2Icon className="size-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-base-content">Report Submitted</h3>
            <p className="text-xs text-base-content/70 max-w-xs mx-auto leading-relaxed">
              Thank you for keeping Streamify a respectful learning space. Our creator and moderation team will review this report promptly.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-sm font-bold px-6 shadow-md">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-error/15 text-error flex items-center justify-center shrink-0">
                <ShieldAlertIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-base-content leading-tight">
                  Report {targetUser.fullName || "User"}
                </h3>
                <p className="text-xs text-base-content/60">
                  Help us maintain a safe language exchange community
                </p>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wide">
                Select Violation Reason:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedReason === r.id
                        ? "border-error bg-error/10 text-base-content shadow-xs"
                        : "border-base-300 bg-base-200/50 hover:bg-base-200 text-base-content/80"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selectedReason === r.id}
                      onChange={() => setSelectedReason(r.id)}
                      className="radio radio-error radio-xs mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-snug">{r.label}</p>
                      <p className="text-[11px] text-base-content/50 leading-tight pt-0.5 truncate">
                        {r.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70 uppercase tracking-wide">
                Additional Context (Optional):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what happened (specific words, message timestamp, or call conduct)..."
                rows={3}
                maxLength={500}
                className="textarea textarea-bordered w-full text-xs rounded-xl focus:textarea-error resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn btn-ghost btn-sm font-bold text-base-content/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => sendReport()}
                disabled={isPending || !selectedReason}
                className="btn btn-error btn-sm font-bold text-error-content shadow-sm gap-1.5 px-5"
              >
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangleIcon className="size-3.5" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportUserModal;
