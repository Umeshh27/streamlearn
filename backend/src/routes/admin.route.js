import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  requireSubAdmin,
  requireAdmin,
} from "../middleware/admin.middleware.js";
import {
  getPlatformStats,
  getAllUsers,
  applyModerationAction,
  deleteUser,
  getReportsQueue,
  resolveReport,
  broadcastAnnouncement,
  updateUserRole,
  getMonitoredRooms,
  deleteMonitoredRoom,
} from "../controllers/admin.controller.js";

const router = express.Router();

// Guard all admin routes with authentication
router.use(protectRoute);

// Tier 1: Sub-Admin Access (Sub-Admins and Admins)
router.get("/stats", requireSubAdmin, getPlatformStats);
router.get("/users", requireSubAdmin, getAllUsers);
router.get("/reports", requireSubAdmin, getReportsQueue);
router.put("/reports/:reportId", requireSubAdmin, resolveReport);
router.post("/moderate", requireSubAdmin, applyModerationAction);
router.get("/rooms", requireSubAdmin, getMonitoredRooms);
router.delete("/rooms/:roomId", requireSubAdmin, deleteMonitoredRoom);

// Tier 2: Head Administrator Access Strictly
router.delete("/users/:userId", requireAdmin, deleteUser);
router.put("/users/:userId/role", requireAdmin, updateUserRole);
router.post("/broadcast", requireAdmin, broadcastAnnouncement);

export default router;
