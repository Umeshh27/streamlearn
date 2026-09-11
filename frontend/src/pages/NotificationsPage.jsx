import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  dismissNotification,
  clearAllNotifications,
  getFriendRequests,
} from "../lib/api";
import {
  BellIcon,
  CheckIcon,
  ClockIcon,
  MessageSquareIcon,
  Trash2Icon,
  UserCheckIcon,
  XIcon,
  ZapIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
} from "lucide-react";
import NoNotificationsFound from "../components/NoNotificationsFound";
import toast from "react-hot-toast";
import useNotificationCount from "../hooks/useNotificationCount";
import useAuthUser from "../hooks/useAuthUser";
import { respondToStaffInvitation } from "../lib/api";
import { useProfileModalStore } from "../store/useProfileModalStore";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { openProfile } = useProfileModalStore();
  useNotificationCount(); // Automatically marks notifications as seen when page mounts

  const [pendingActionIds, setPendingActionIds] = useState(new Set());
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isProcessingStaffInvite, setIsProcessingStaffInvite] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: friendRequests, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    staleTime: 1000 * 30, // 30s cache for snappy responses
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friendRequests"] }),
        queryClient.invalidateQueries({ queryKey: ["authUser"] }),
      ]);
      toast.success("Notifications updated!");
    } catch {
      toast.error("Failed to refresh notifications.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const hasPendingStaffInvite = authUser?.subadminInvitation?.status === "pending";
  const incomingRequests = friendRequests?.incomingReqs || [];
  const acceptedRequests = friendRequests?.acceptedReqs || [];
  const hasAnyNotifications =
    hasPendingStaffInvite || incomingRequests.length > 0 || acceptedRequests.length > 0;

  const handleStaffResponse = async (action) => {
    if (isProcessingStaffInvite) return;
    setIsProcessingStaffInvite(true);
    try {
      await respondToStaffInvitation({ action });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });

      if (action === "accept") {
        toast.success(
          "🎉 Welcome to the Moderation Staff! You are now an official Sub-Admin. Staff Portal is active in your navigation bar.",
          { duration: 6000 }
        );
      } else {
        toast("Sub-Admin nomination declined. Your role remains Learner.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to process staff invitation.");
    } finally {
      setIsProcessingStaffInvite(false);
    }
  };

  const handleAccept = async (requestId) => {
    const reqIdStr = requestId?.toString();
    if (!reqIdStr || pendingActionIds.has(reqIdStr)) return;

    setPendingActionIds((prev) => new Set(prev).add(reqIdStr));
    try {
      await acceptFriendRequest(requestId);
      toast.success("Friend request accepted!");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept friend request");
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(reqIdStr);
        return next;
      });
    }
  };

  const handleDecline = async (requestId) => {
    const reqIdStr = requestId?.toString();
    if (!reqIdStr || pendingActionIds.has(reqIdStr)) return;

    setPendingActionIds((prev) => new Set(prev).add(reqIdStr));
    try {
      await rejectFriendRequest(requestId);
      toast.success("Friend request declined");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to decline friend request");
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(reqIdStr);
        return next;
      });
    }
  };

  const handleDismiss = async (requestId) => {
    const reqIdStr = requestId?.toString();
    if (!reqIdStr || pendingActionIds.has(reqIdStr)) return;

    setPendingActionIds((prev) => new Set(prev).add(reqIdStr));
    try {
      await dismissNotification(requestId);
      toast.success("Notification cleared");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to dismiss notification");
    } finally {
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(reqIdStr);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    if (isClearingAll) return;
    setIsClearingAll(true);
    try {
      await clearAllNotifications();
      toast.success("All connection notifications cleared");
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clear notifications");
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 pb-24 sm:pb-12">
      <div className="container mx-auto max-w-4xl space-y-4 sm:space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-base-300/60 sm:border-b-0 sm:pb-0">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-base-content">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-base-content/70 mt-0.5 leading-snug">
              Stay updated with your friend requests and new learning connections
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-ghost border border-base-300 hover:bg-base-200 text-base-content btn-sm gap-1.5 font-bold transition-all active:scale-95 cursor-pointer flex-1 sm:flex-none justify-center h-9 sm:h-8"
              title="Refresh notifications"
            >
              <RefreshCwIcon className={`size-3.5 sm:size-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>

            {acceptedRequests.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="btn btn-outline btn-error btn-sm gap-1.5 font-bold hover:bg-error hover:text-error-content shadow-2xs transition-all active:scale-95 cursor-pointer flex-1 sm:flex-none justify-center h-9 sm:h-8"
                title="Clear all new connection notifications"
              >
                {isClearingAll ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <Trash2Icon className="size-3.5 sm:size-4" />
                )}
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <>
            {/* SUB-ADMIN NOMINATION INVITATION CARD */}
            {hasPendingStaffInvite && (
              <div className="card bg-gradient-to-br from-primary/15 via-base-200 to-secondary/15 border-2 border-primary/40 shadow-lg overflow-hidden animate-in fade-in mb-3 sm:mb-4 rounded-2xl sm:rounded-3xl">
                <div className="card-body p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 sm:p-3 rounded-2xl bg-primary text-primary-content shadow-md ring-4 ring-primary/20 shrink-0">
                      <ZapIcon className="size-5 sm:size-6 fill-current animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="badge bg-primary/20 text-primary border border-primary/40 font-black text-[10px] sm:text-xs uppercase tracking-wider">
                          Staff Nomination
                        </span>
                        <span className="badge badge-warning text-[9px] sm:text-[10px] font-bold uppercase">
                          Action Required
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-base-content mt-1 leading-snug">
                        Sub-Admin Moderation Appointment
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-base-content/85 font-medium leading-relaxed">
                    You have been nominated by the Platform Administration to serve as a <strong className="text-primary font-bold">Community Sub-Admin</strong>. You will help maintain a respectful community, review learner reports, and issue temporary timeouts.
                  </p>

                  {/* Security Notice */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-error/10 border border-error/25 text-xs text-base-content space-y-1">
                    <p className="font-bold text-error flex items-center gap-1.5 text-xs">
                      <AlertTriangleIcon className="size-4 shrink-0" />
                      Mandatory Security & Accountability Agreement:
                    </p>
                    <p className="text-base-content/80 leading-relaxed text-[11px] sm:text-xs">
                      Staff powers carry strict accountability. Misuse of moderation controls, harassment of members, leaking confidential queues, or security negligence will lead to <strong>immediate role revocation and account suspension</strong>.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 w-full">
                    <button
                      onClick={() => handleStaffResponse("accept")}
                      disabled={isProcessingStaffInvite}
                      className="btn btn-primary text-primary-content font-black shadow-md gap-1.5 h-10 sm:h-9 flex-1 sm:flex-none justify-center active:scale-95 transition-all"
                    >
                      {isProcessingStaffInvite ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <CheckIcon className="size-4" />
                      )}
                      <span>Accept Duties & Role</span>
                    </button>

                    <button
                      onClick={() => handleStaffResponse("reject")}
                      disabled={isProcessingStaffInvite}
                      className="btn btn-outline btn-error hover:bg-error hover:text-error-content font-bold gap-1.5 h-10 sm:h-9 flex-1 sm:flex-none justify-center active:scale-95 transition-all shadow-2xs"
                    >
                      <XIcon className="size-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* INCOMING FRIEND REQUESTS */}
            {incomingRequests.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 text-base-content">
                  <UserCheckIcon className="size-5 text-primary shrink-0" />
                  <span>Friend Requests</span>
                  <span className="badge badge-primary badge-sm font-bold ml-1">{incomingRequests.length}</span>
                </h2>

                <div className="space-y-2.5 sm:space-y-3">
                  {incomingRequests.map((request) => {
                    const reqIdStr = request._id?.toString();
                    const isProcessing = pendingActionIds.has(reqIdStr);

                    return (
                      <div
                        key={request._id}
                        className="card bg-base-200/90 hover:bg-base-200 border border-base-300/70 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden"
                      >
                        <div className="card-body p-3 sm:p-4 gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => request.sender?._id && openProfile(request.sender._id)}
                                className="avatar w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-base-300 ring-2 ring-primary/20 hover:ring-primary/50 transition-all overflow-hidden shrink-0 cursor-pointer active:scale-95"
                                title="View Profile"
                              >
                                {request.sender?.profilePic ? (
                                  <img
                                    src={request.sender.profilePic}
                                    alt={request.sender.fullName}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold text-sm sm:text-base">
                                    {request.sender?.fullName?.charAt(0)?.toUpperCase()}
                                  </div>
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => request.sender?._id && openProfile(request.sender._id)}
                                  className="font-bold text-sm sm:text-base text-base-content hover:text-primary transition-colors truncate block text-left cursor-pointer"
                                >
                                  {request.sender?.fullName}
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {request.sender?.nativeLanguage && (
                                    <span className="badge badge-secondary/90 badge-xs font-medium gap-1">
                                      <span>Native:</span>
                                      <span className="font-semibold">{request.sender.nativeLanguage}</span>
                                    </span>
                                  )}
                                  {request.sender?.learningLanguage && (
                                    <span className="badge badge-outline badge-xs font-medium gap-1">
                                      <span>Learning:</span>
                                      <span className="font-semibold">{request.sender.learningLanguage}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Accept & Decline Action Buttons */}
                            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 border-t border-base-300/60 sm:border-t-0 sm:pt-0 sm:justify-end">
                              <button
                                className="btn btn-outline btn-error hover:bg-error hover:text-error-content btn-sm font-bold gap-1.5 flex-1 sm:flex-none justify-center h-9 sm:h-8 active:scale-95 transition-all shadow-2xs"
                                onClick={() => handleDecline(request._id)}
                                disabled={isProcessing}
                              >
                                <XIcon className="size-4" />
                                <span>Decline</span>
                              </button>

                              <button
                                className="btn btn-primary text-primary-content btn-sm min-w-[90px] gap-1.5 font-bold shadow-xs flex-1 sm:flex-none justify-center h-9 sm:h-8 active:scale-95 transition-all"
                                onClick={() => handleAccept(request._id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs" />
                                    <span>Accepting...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckIcon className="size-4" />
                                    <span>Accept</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ACCEPTED REQS / NEW CONNECTIONS NOTIFICATIONS */}
            {acceptedRequests.length > 0 && (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 text-base-content">
                  <BellIcon className="size-5 text-success shrink-0" />
                  <span>New Connections</span>
                  <span className="badge badge-success text-success-content badge-sm font-bold ml-1">
                    {acceptedRequests.length}
                  </span>
                </h2>

                <div className="space-y-2.5 sm:space-y-3">
                  {acceptedRequests.map((notification) => {
                    const notifIdStr = notification._id?.toString();
                    const isDismissing = pendingActionIds.has(notifIdStr);

                    return (
                      <div
                        key={notification._id}
                        className="card bg-base-200/90 hover:bg-base-200 border border-base-300/70 shadow-xs hover:shadow-md transition-all rounded-2xl overflow-hidden"
                      >
                        <div className="card-body p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => notification.recipient?._id && openProfile(notification.recipient._id)}
                                className="avatar size-10 sm:size-12 rounded-full bg-base-300 ring-2 ring-success/30 hover:ring-success transition-all overflow-hidden shrink-0 cursor-pointer active:scale-95 mt-0.5 sm:mt-0"
                                title="View Profile"
                              >
                                {notification.recipient?.profilePic ? (
                                  <img
                                    src={notification.recipient.profilePic}
                                    alt={notification.recipient.fullName}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-content font-bold text-sm sm:text-base">
                                    {notification.recipient?.fullName?.charAt(0)?.toUpperCase()}
                                  </div>
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => notification.recipient?._id && openProfile(notification.recipient._id)}
                                    className="font-bold text-sm sm:text-base text-base-content hover:text-primary transition-colors truncate block text-left cursor-pointer"
                                  >
                                    {notification.recipient?.fullName}
                                  </button>
                                  <span className="badge badge-success badge-xs font-bold text-success-content shrink-0">
                                    Connected
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-base-content/80 mt-0.5 leading-snug">
                                  Accepted your friend request
                                </p>
                                <p className="text-[11px] sm:text-xs text-base-content/50 flex items-center gap-1 mt-1">
                                  <ClockIcon className="size-3 shrink-0" />
                                  <span>Recently</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-base-300/60 sm:border-t-0 sm:pt-0 justify-end w-full sm:w-auto">
                              {notification.recipient?._id && (
                                <Link
                                  to={`/chat/${notification.recipient._id}`}
                                  className="btn btn-primary btn-sm text-primary-content font-bold gap-1.5 flex-1 sm:flex-none justify-center h-9 sm:h-8 shadow-xs active:scale-95 transition-all"
                                >
                                  <MessageSquareIcon className="size-3.5 sm:size-4" />
                                  <span>Message</span>
                                </Link>
                              )}

                              <button
                                onClick={() => handleDismiss(notification._id)}
                                disabled={isDismissing}
                                className="btn btn-ghost hover:bg-base-300 btn-sm btn-circle text-base-content/70 hover:text-error transition-colors shrink-0 size-9 sm:size-8"
                                title="Dismiss notification"
                              >
                                {isDismissing ? (
                                  <span className="loading loading-spinner loading-xs" />
                                ) : (
                                  <XIcon className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!hasAnyNotifications && <NoNotificationsFound />}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
