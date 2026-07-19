import {  StreamChat } from "stream-chat";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error(
    "STREAM_API_KEY and STREAM_API_SECRET must be set in the environment variables.",
  );
}

const StreamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await StreamClient.upsertUser(userData);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

const generateStreamToken = (userId) => {};

