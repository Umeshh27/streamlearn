import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken, clearChatHistory, getOrCreateChatChannel } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.post("/channel/:targetUserId", protectRoute, getOrCreateChatChannel);
router.delete("/clear/:targetUserId", protectRoute, clearChatHistory);

export default router;

