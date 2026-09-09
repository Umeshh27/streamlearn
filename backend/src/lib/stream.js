import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY 
const apiSecret = process.env.STREAM_API_SECRET

if (!apiKey || !apiSecret) {
  console.error("Stream API key or Secret is missing");
}

export const streamClient = StreamChat.getInstance(apiKey, apiSecret);


export const upsertStreamUser = async (userData) => {
  try {
    const isCreator = (userData.email || "").toLowerCase() === "umeshalla73@gmail.com";
    const effectiveRole = isCreator ? "admin" : (userData.role || "user");
    const streamPayload = {
      ...userData,
      // Stream's built-in role accepts admin or user
      role: effectiveRole === "admin" ? "admin" : "user",
      // Custom attributes to persist our platform role hierarchy
      userRole: effectiveRole,
      appRole: effectiveRole,
      email: userData.email || (isCreator ? "umeshalla73@gmail.com" : ""),
    };
    await streamClient.upsertUsers([streamPayload]);
    return streamPayload;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const syncAllUsersToStream = async () => {
  try {
    const User = (await import("../models/User.js")).default;
    const users = await User.find({}).lean();
    if (!users || users.length === 0) return;

    const payloads = users.map((u) => {
      const isCreator = (u.email || "").toLowerCase() === "umeshalla73@gmail.com";
      const effectiveRole = isCreator ? "admin" : (u.role || "user");
      return {
        id: u._id.toString(),
        name: u.fullName,
        email: u.email,
        image: u.profilePic || "",
        role: effectiveRole === "admin" ? "admin" : "user",
        userRole: effectiveRole,
        appRole: effectiveRole,
        nameColor: u.nameColor || "",
      };
    });

    await streamClient.upsertUsers(payloads);
    console.log(`Successfully synced ${payloads.length} users to Stream Chat`);
  } catch (error) {
    console.warn("Failed to sync users to Stream Chat on startup:", error.message);
  }
};

export const generateStreamToken = (userId) => {
  try {
    // ensure userId is a string
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};
