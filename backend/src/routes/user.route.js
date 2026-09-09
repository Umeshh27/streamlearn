import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  dismissNotification,
  clearAllNotifications,
  getFriendRequests,
  getAllUsers,
  getMyFriends,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserProfile,
  sendFriendRequest,
  unfriendUser,
  updateUserProfile,
  respondToStaffInvitation,
} from "../controllers/user.controller.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/all-users", getAllUsers);
router.get("/friends", getMyFriends);

router.get("/profile/:id", getUserProfile);
router.put("/profile", updateUserProfile);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);
router.put("/friend-request/:id/reject", rejectFriendRequest);
router.delete("/friend-request/:id/dismiss", dismissNotification);
router.delete("/notifications/clear-all", clearAllNotifications);
router.delete("/friend/:id", unfriendUser);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendReqs);

router.post("/staff-invitation/respond", respondToStaffInvitation);

export default router;
