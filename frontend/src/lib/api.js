import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const verifyEmail = async ({ email, code }) => {
  const response = await axiosInstance.post("/auth/verify-email", { email, code });
  return response.data;
};

export const resendVerificationCode = async ({ email }) => {
  const response = await axiosInstance.post("/auth/resend-code", { email });
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    // Only return null if explicitly 401 Unauthorized
    if (error.response?.status === 401) {
      return null;
    }
    console.warn("Transient error fetching auth user, retrying...", error.message || error);
    // Rethrow network errors / 5xx so TanStack Query retry logic can recover without logging out
    throw error;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function rejectFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/reject`);
  return response.data;
}

export async function dismissNotification(requestId) {
  const response = await axiosInstance.delete(`/users/friend-request/${requestId}/dismiss`);
  return response.data;
}

export async function clearAllNotifications() {
  const response = await axiosInstance.delete("/users/notifications/clear-all");
  return response.data;
}

export async function getUserProfile(userId) {
  const response = await axiosInstance.get(`/users/profile/${userId}`);
  return response.data;
}

export async function getAllGlobalUsers() {
  const response = await axiosInstance.get("/users/all-users");
  return response.data;
}

export async function clearChatHistory(targetUserId) {
  const response = await axiosInstance.delete(`/chat/clear/${targetUserId}`);
  return response.data;
}

export async function getOrCreateChatChannel(targetUserId) {
  const response = await axiosInstance.post(`/chat/channel/${targetUserId}`);
  return response.data;
}

export async function unfriendUser(friendId) {
  const response = await axiosInstance.delete(`/users/friend/${friendId}`);
  return response.data;
}

export async function updateMyProfile(profileData) {
  const response = await axiosInstance.put("/users/profile", profileData);
  return response.data;
}

// ─── ADMIN DASHBOARD & MODERATION APIS ─────────────────────────────

export async function getAdminStats() {
  const response = await axiosInstance.get("/admin/stats");
  return response.data;
}

export async function getAdminUsers({ search = "", status = "all", page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);

  const response = await axiosInstance.get(`/admin/users?${params.toString()}`);
  return response.data;
}

export async function applyAdminModeration({ userId, action, reason = "", reportId = null }) {
  const response = await axiosInstance.post("/admin/moderate", {
    userId,
    action,
    reason,
    reportId,
  });
  return response.data;
}

export async function deleteAdminUser(userId) {
  const response = await axiosInstance.delete(`/admin/users/${userId}`);
  return response.data;
}

export async function updateAdminUserRole({ userId, role }) {
  const response = await axiosInstance.put(`/admin/users/${userId}/role`, { role });
  return response.data;
}

export async function getAdminReports({ status = "all" } = {}) {
  const params = new URLSearchParams();
  if (status) params.append("status", status);

  const response = await axiosInstance.get(`/admin/reports?${params.toString()}`);
  return response.data;
}

export async function resolveAdminReport({ reportId, status, actionTaken = "" }) {
  const response = await axiosInstance.put(`/admin/reports/${reportId}`, {
    status,
    actionTaken,
  });
  return response.data;
}

export async function broadcastAdminAnnouncement({ message, targetRoom = "global-community" }) {
  const response = await axiosInstance.post("/admin/broadcast", {
    message,
    targetRoom,
  });
  return response.data;
}

// ─── USER VIOLATION REPORTING ──────────────────────────────────────

export async function submitUserReport({ reportedUserId, reason, details = "", context = "General" }) {
  const response = await axiosInstance.post("/reports", {
    reportedUserId,
    reason,
    details,
    context,
  });
  return response.data;
}

export async function respondToStaffInvitation({ action }) {
  const response = await axiosInstance.post("/users/staff-invitation/respond", { action });
  return response.data;
}

export async function getAdminRooms() {
  const response = await axiosInstance.get("/admin/rooms");
  return response.data;
}

export async function deleteAdminRoom(roomId) {
  const response = await axiosInstance.delete(`/admin/rooms/${roomId}`);
  return response.data;
}
