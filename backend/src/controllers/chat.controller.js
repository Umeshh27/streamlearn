import { generateStreamToken, streamClient, upsertStreamUser } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  try {
    const userId = req.user.id || req.user._id;

    // Fire-and-forget user sync in background without blocking token generation
    upsertStreamUser({
      id: userId.toString(),
      name: req.user.fullName,
      image: req.user.profilePic || "",
      nameColor: req.user.nameColor || "",
      role: req.user.role || "user",
      email: req.user.email || "",
    }).catch((e) => {
      console.log("Stream user upsert in getStreamToken background fallback:", e.message);
    });

    // Synchronous HMAC token generation (instant <1ms)
    const token = generateStreamToken(userId);

    return res.status(200).json({ token });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOrCreateChatChannel(req, res) {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { targetUserId } = req.params;

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    const targetIdStr = targetUserId.toString();
    if (currentUserId === targetIdStr) {
      return res.status(400).json({ message: "Cannot create chat channel with yourself" });
    }

    const User = (await import("../models/User.js")).default;
    const targetUser = await User.findById(targetIdStr).lean();
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure target user is upserted to Stream Chat
    await upsertStreamUser({
      id: targetUser._id.toString(),
      name: targetUser.fullName,
      image: targetUser.profilePic || "",
      nameColor: targetUser.nameColor || "",
      role: targetUser.role || "user",
      email: targetUser.email || "",
    });

    // Ensure current user is also upserted to Stream Chat
    await upsertStreamUser({
      id: currentUserId,
      name: req.user.fullName,
      image: req.user.profilePic || "",
      nameColor: req.user.nameColor || "",
      role: req.user.role || "user",
      email: req.user.email || "",
    });

    const channelId = [currentUserId, targetIdStr].sort().join("-");
    const channel = streamClient.channel("messaging", channelId, {
      members: [currentUserId, targetIdStr],
      created_by_id: currentUserId,
    });

    await channel.create();

    return res.status(200).json({
      success: true,
      channelId,
      targetUser: {
        _id: targetUser._id.toString(),
        fullName: targetUser.fullName,
        profilePic: targetUser.profilePic || "",
        nameColor: targetUser.nameColor || "",
        role: targetUser.role || "user",
        email: targetUser.email || "",
      },
    });
  } catch (error) {
    console.error("Error in getOrCreateChatChannel:", error.message || error);
    return res.status(500).json({ message: "Failed to initialize chat channel" });
  }
}

export async function clearChatHistory(req, res) {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { targetUserId } = req.params;

    const channelId = [currentUserId, targetUserId.toString()].sort().join("-");
    const channel = streamClient.channel("messaging", channelId);

    try {
      await channel.truncate();
    } catch (truncateErr) {
      console.log("Truncate channel notice:", truncateErr.message);
    }

    res.status(200).json({ message: "Chat history deleted successfully" });
  } catch (error) {
    console.error("Error clearing chat history:", error.message);
    res.status(500).json({ message: "Failed to delete chat history" });
  }
}

