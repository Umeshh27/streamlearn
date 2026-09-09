import { useEffect } from "react";
import { useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import useAuthUser from "./useAuthUser";
import { getFriendRequests } from "../lib/api";

// Module-level trackers so multiple hook consumers (Navbar, Sidebar) do not fire duplicate toasts
let lastKnownIncomingCount = null;
let lastKnownAcceptedCount = null;
let currentUserId = null;

export default function useNotificationCount() {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const userId = authUser?._id || authUser?.id;

  // Reset trackers if user changes or logs out
  if (userId !== currentUserId) {
    currentUserId = userId;
    lastKnownIncomingCount = null;
    lastKnownAcceptedCount = null;
  }

  const { data: friendRequests, refetch } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
    enabled: !!authUser,
    refetchInterval: 4000, // Poll every 4 seconds in background for real-time notifications
    refetchOnWindowFocus: true,
  });

  const incomingReqs = friendRequests?.incomingReqs || [];
  const acceptedReqs = friendRequests?.acceptedReqs || [];
  const hasPendingStaffInvite = authUser?.subadminInvitation?.status === "pending" ? 1 : 0;

  // Real-time toast alert when a new incoming friend request arrives
  useEffect(() => {
    if (!authUser) return;

    if (lastKnownIncomingCount === null) {
      lastKnownIncomingCount = incomingReqs.length;
    } else if (incomingReqs.length > lastKnownIncomingCount) {
      const latestReq = incomingReqs[0];
      const senderName = latestReq?.sender?.fullName || "A learner";
      toast(`👋 New friend request from ${senderName}!`, {
        id: `toast-incoming-req-${latestReq?._id || Date.now()}`,
        duration: 5000,
      });
      lastKnownIncomingCount = incomingReqs.length;
    } else {
      lastKnownIncomingCount = incomingReqs.length;
    }
  }, [incomingReqs, authUser]);

  // Real-time toast alert when someone accepts your friend request
  useEffect(() => {
    if (!authUser) return;

    if (lastKnownAcceptedCount === null) {
      lastKnownAcceptedCount = acceptedReqs.length;
    } else if (acceptedReqs.length > lastKnownAcceptedCount) {
      const latestAcc = acceptedReqs[0];
      const friendName = latestAcc?.recipient?.fullName || "A friend";
      toast.success(`🎉 ${friendName} accepted your friend request!`, {
        id: `toast-accepted-req-${latestAcc?._id || Date.now()}`,
        duration: 5000,
      });
      lastKnownAcceptedCount = acceptedReqs.length;
    } else {
      lastKnownAcceptedCount = acceptedReqs.length;
    }
  }, [acceptedReqs, authUser]);

  // Total active notifications requiring user attention
  const totalCount = incomingReqs.length + acceptedReqs.length + hasPendingStaffInvite;

  // When viewing /notifications directly, the badge number resets to 0
  const unreadCount = location.pathname === "/notifications" ? 0 : totalCount;

  return {
    unreadCount,
    totalCount,
    incomingCount: incomingReqs.length,
    acceptedCount: acceptedReqs.length,
    hasPendingStaffInvite: Boolean(hasPendingStaffInvite),
    refetchNotifications: refetch,
    markAsSeen: () => {},
  };
}
