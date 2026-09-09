import mongoose from "mongoose";
import User from "../models/User.js";
import Report from "../models/Report.js";
import { streamClient, upsertStreamUser } from "../lib/stream.js";
import { getGroqKeys } from "../services/groqService.js";
import { isRedisConnected } from "../lib/redis.js";
import { isCreatorUser } from "../middleware/admin.middleware.js";

/**
 * 1. Platform Statistics Overview
 */
export const getPlatformStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      verifiedUsers,
      onboardedUsers,
      bannedUsers,
      suspendedUsers,
      newUsersToday,
      pendingReportsCount,
      learningLanguagesAgg,
      nativeLanguagesAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isOnboarded: true }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ suspendedUntil: { $gt: new Date() } }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      Report.countDocuments({ status: "pending" }),
      User.aggregate([
        { $match: { learningLanguage: { $exists: true, $ne: "" } } },
        { $group: { _id: "$learningLanguage", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      User.aggregate([
        { $match: { nativeLanguage: { $exists: true, $ne: "" } } },
        { $group: { _id: "$nativeLanguage", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    // Service Health Checks
    const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const redisStatus = isRedisConnected() ? "connected" : "offline";
    const groqKeysCount = getGroqKeys().length;
    const streamStatus = Boolean(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET)
      ? "configured"
      : "missing";

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        onboardedUsers,
        bannedUsers,
        suspendedUsers,
        newUsersToday,
        pendingReportsCount,
        learningLanguages: learningLanguagesAgg.map((item) => ({
          language: item._id,
          count: item.count,
        })),
        nativeLanguages: nativeLanguagesAgg.map((item) => ({
          language: item._id,
          count: item.count,
        })),
      },
      services: {
        mongo: mongoStatus,
        redis: redisStatus,
        groqKeysCount,
        stream: streamStatus,
      },
    });
  } catch (error) {
    console.error("Error in getPlatformStats:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch platform stats" });
  }
};

/**
 * 2. User Directory with Search & Filtering
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 50 } = req.query;
    const query = {};

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: regex }, { email: regex }, { learningLanguage: regex }];
    }

    const now = new Date();
    if (status === "banned") {
      query.isBanned = true;
    } else if (status === "suspended") {
      query.suspendedUntil = { $gt: now };
    } else if (status === "unverified") {
      query.isVerified = false;
    } else if (status === "strikes") {
      query.strikeCount = { $gt: 0 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve user list" });
  }
};

/**
 * 3. Progressive Discipline & Moderation Actions
 */
export const applyModerationAction = async (req, res) => {
  try {
    const { userId, action, reason = "", reportId = null } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Protect platform creator from being moderated
    if (isCreatorUser(targetUser)) {
      return res.status(403).json({ success: false, message: "Cannot apply moderation to platform creator" });
    }

    const callerRole = req.user.role || "user";
    const isCallerCreator = isCreatorUser(req.user);

    // Role Hierarchy & Action Restrictions for Non-Creators
    if (!isCallerCreator) {
      // Sub-Admins cannot permanently ban users
      if (callerRole === "subadmin") {
        if (action === "ban") {
          return res.status(403).json({
            success: false,
            message: "Sub-Admins cannot issue permanent bans. Please escalate to the Head Administrator.",
          });
        }
        if (["subadmin", "admin"].includes(targetUser.role)) {
          return res.status(403).json({
            success: false,
            message: "Sub-Admins cannot moderate other Sub-Admins or Administrators.",
          });
        }
      }
    }

    const now = Date.now();
    let actionLabel = action;

    switch (action) {
      case "timeout_5": {
        // Strike 1 / 5-minute cooldown
        const nextStrikes = Math.min(3, (targetUser.strikeCount || 0) + 1);
        targetUser.strikeCount = nextStrikes;
        targetUser.suspendedUntil = new Date(now + 5 * 60 * 1000);
        targetUser.suspensionReason = reason || "Community Guidelines Violation (5-minute cooldown)";
        targetUser.isBanned = false;
        actionLabel = "5-Minute Timeout";
        break;
      }
      case "timeout_10": {
        // Strike 2 / 10-minute cooldown
        const nextStrikes = Math.min(3, (targetUser.strikeCount || 0) + 1);
        targetUser.strikeCount = nextStrikes;
        targetUser.suspendedUntil = new Date(now + 10 * 60 * 1000);
        targetUser.suspensionReason = reason || "Repeated Community Guidelines Violation (10-minute cooldown)";
        targetUser.isBanned = false;
        actionLabel = "10-Minute Timeout";
        break;
      }
      case "ban": {
        // Strike 3 / Permanent Ban
        targetUser.isBanned = true;
        targetUser.strikeCount = 3;
        targetUser.suspendedUntil = null;
        targetUser.suspensionReason = reason || "Permanent suspension for repeated community violations";
        actionLabel = "Permanent Ban";
        break;
      }
      case "unban": {
        targetUser.isBanned = false;
        targetUser.suspendedUntil = null;
        targetUser.suspensionReason = "";
        actionLabel = "Unbanned / Restored";
        break;
      }
      case "clear_strikes": {
        targetUser.strikeCount = 0;
        targetUser.suspendedUntil = null;
        targetUser.suspensionReason = "";
        actionLabel = "Strikes Cleared";
        break;
      }
      case "force_verify": {
        targetUser.isVerified = true;
        targetUser.verificationCode = null;
        targetUser.verificationCodeExpiresAt = null;
        actionLabel = "Account Force Verified";
        break;
      }
      case "clear_profile": {
        targetUser.bio = "";
        targetUser.profilePic = "";
        actionLabel = "Bio & Picture Cleared";
        break;
      }
      default:
        return res.status(400).json({ success: false, message: `Unsupported action: ${action}` });
    }

    await targetUser.save();

    // If moderation was triggered from a specific report, resolve it
    if (reportId) {
      await Report.findByIdAndUpdate(reportId, {
        status: "resolved",
        actionTaken: actionLabel,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully executed ${actionLabel} on ${targetUser.fullName}`,
      user: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        strikeCount: targetUser.strikeCount,
        suspendedUntil: targetUser.suspendedUntil,
        suspensionReason: targetUser.suspensionReason,
        isBanned: targetUser.isBanned,
        isVerified: targetUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Error in applyModerationAction:", error);
    return res.status(500).json({ success: false, message: "Failed to apply moderation action" });
  }
};

/**
 * 4. Permanently Delete User
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (isCreatorUser(targetUser)) {
      return res.status(403).json({ success: false, message: "Cannot delete the platform creator account" });
    }

    // Try deleting on Stream Chat
    try {
      await streamClient.deleteUser(userId, { delete_conversation_channels: false });
    } catch (streamErr) {
      console.warn("Stream delete user non-fatal:", streamErr.message);
    }

    await User.findByIdAndDelete(userId);
    await Report.deleteMany({ $or: [{ reporter: userId }, { reportedUser: userId }] });

    return res.status(200).json({
      success: true,
      message: `Account of ${targetUser.fullName} has been permanently deleted.`,
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

/**
 * 5. Moderation Reports Queue
 */
export const getReportsQueue = async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    const reports = await Report.find(filter)
      .populate("reporter", "fullName email profilePic")
      .populate("reportedUser", "fullName email profilePic strikeCount isBanned suspendedUntil")
      .populate("resolvedBy", "fullName email")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error in getReportsQueue:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reports queue" });
  }
};

/**
 * 6. Dismiss or Resolve Report
 */
export const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status = "dismissed", actionTaken = "dismissed" } = req.body;

    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        actionTaken,
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Report marked as ${status}`,
      report,
    });
  } catch (error) {
    console.error("Error in resolveReport:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve report" });
  }
};

/**
 * 7. Broadcast Official Creator Announcement to Global Lounges
 */
export const broadcastAnnouncement = async (req, res) => {
  try {
    const { message, targetRoom = "global-community" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Broadcast message cannot be empty" });
    }

    const channel = streamClient.channel("livestream", targetRoom);
    await channel.sendMessage({
      text: `📢 [ANNOUNCEMENT FROM CREATOR]: ${message.trim()}`,
      user: {
        id: req.user._id.toString(),
        name: "Admin / Creator",
        image: req.user.profilePic || "",
      },
    });

    return res.status(200).json({
      success: true,
      message: `Announcement broadcast successfully to ${targetRoom}`,
    });
  } catch (error) {
    console.error("Error in broadcastAnnouncement:", error);
    return res.status(500).json({ success: false, message: "Failed to broadcast announcement" });
  }
};

/**
 * 8. Promote / Demote Staff Roles (Superadmin / Head Admin only)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ success: false, message: "Missing userId or role parameter" });
    }

    const validRoles = ["user", "subadmin", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified: ${role}. Valid choices are: ${validRoles.join(", ")}`,
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    // Protect Creator from role changes
    if (isCreatorUser(targetUser)) {
      return res.status(403).json({
        success: false,
        message: "The platform creator's role is permanent and cannot be modified.",
      });
    }

    // If nominating as Sub-Admin, initiate pending invitation instead of direct grant
    if (role === "subadmin") {
      if (targetUser.role === "subadmin") {
        return res.status(200).json({
          success: true,
          message: `${targetUser.fullName} is already an active Sub-Admin.`,
          user: targetUser,
        });
      }

      targetUser.subadminInvitation = {
        status: "pending",
        invitedBy: req.user._id,
        invitedAt: new Date(),
        respondedAt: null,
      };
      await targetUser.save();

      return res.status(200).json({
        success: true,
        message: `Sub-Admin nomination invitation sent to ${targetUser.fullName}. They must review and accept the responsibilities & security agreement before receiving the role.`,
        user: targetUser,
      });
    }

    // Setting to user: clear invitations and ensure role is "user"
    if (role === "user") {
      targetUser.role = "user";
      targetUser.subadminInvitation = {
        status: "rejected",
        invitedBy: targetUser.subadminInvitation?.invitedBy || req.user._id,
        invitedAt: targetUser.subadminInvitation?.invitedAt || null,
        respondedAt: new Date(),
      };
      await targetUser.save();

      upsertStreamUser({
        id: targetUser._id.toString(),
        name: targetUser.fullName,
        image: targetUser.profilePic || "",
        nameColor: targetUser.nameColor || "",
        role: "user",
        email: targetUser.email,
      }).catch((e) => console.warn("Stream role sync error (non-fatal):", e.message));

      return res.status(200).json({
        success: true,
        message: `Set ${targetUser.fullName}'s role to Learner and cancelled staff nominations.`,
        user: targetUser,
      });
    }

    // Setting to admin: full platform administrator
    targetUser.role = role;
    targetUser.subadminInvitation = null;
    await targetUser.save();

    // Sync updated role to Stream Chat metadata
    upsertStreamUser({
      id: targetUser._id.toString(),
      name: targetUser.fullName,
      image: targetUser.profilePic || "",
      nameColor: targetUser.nameColor || "",
      role: targetUser.role,
      email: targetUser.email,
    }).catch((e) => console.warn("Stream role sync error (non-fatal):", e.message));

    return res.status(200).json({
      success: true,
      message: `Successfully updated ${targetUser.fullName}'s role to ${role}`,
      user: targetUser,
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return res.status(500).json({ success: false, message: "Failed to update staff role" });
  }
};

/**
 * 9. Get Monitored Language Lounges / Rooms
 */
export const getMonitoredRooms = async (req, res) => {
  try {
    const channels = await streamClient.queryChannels(
      { type: "livestream" },
      { last_message_at: -1 },
      { limit: 50 }
    );

    const now = Date.now();
    const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes

    const rooms = channels.map((c) => {
      const isDefault = c.id === "global-community";
      const rawName =
        c.data?.language ||
        c.data?.name?.replace(" Community Chat", "") ||
        c.id.replace("lang-", "");
      const cleanName = isDefault ? "Global Lounge" : rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const createdAtTime = new Date(c.data?.created_at || c.created_at || now).getTime();
      const lastMsgTime = c.data?.last_message_at
        ? new Date(c.data.last_message_at).getTime()
        : createdAtTime;
      const isInactive = !isDefault && now - lastMsgTime > INACTIVITY_LIMIT_MS;

      return {
        id: c.id,
        cid: c.cid,
        name: cleanName,
        language: c.data?.language || (isDefault ? "General" : cleanName),
        createdAt: createdAtTime,
        lastMessageAt: lastMsgTime,
        isDefault,
        isInactive,
      };
    });

    return res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Error in getMonitoredRooms:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch monitored rooms" });
  }
};

/**
 * 10. Delete / Close Monitored Room
 */
export const deleteMonitoredRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = (req.user?._id || req.user?.id)?.toString();

    if (!roomId) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    if (roomId === "global-community") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the permanent Global Community Lounge.",
      });
    }

    const cid = `livestream:${roomId}`;

    // Delete channel from Stream Chat
    try {
      await streamClient.deleteChannels([cid], { hard_delete: true });
    } catch (streamErr) {
      console.warn("Stream channel deletion warning:", streamErr.message);
    }

    // Broadcast room_removed event to all active clients over global-community
    try {
      const globalCh = streamClient.channel("livestream", "global-community");
      await globalCh.sendEvent({
        type: "room_removed",
        roomId,
        user_id: currentUserId,
      });
    } catch (broadcastErr) {
      console.warn("Stream room_removed broadcast error:", broadcastErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Room ${roomId} closed and removed successfully.`,
    });
  } catch (error) {
    console.error("Error in deleteMonitoredRoom:", error);
    return res.status(500).json({ success: false, message: "Failed to delete room" });
  }
};
