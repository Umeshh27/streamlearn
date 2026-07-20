import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getRecommendedUsers, getMyFriends, sendFriendRequest, acceptFriendRequest, getFriendRequests } from "../controllers/user.controller.js";
im

const router = express.Router();
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);
router.get("/friend-requests", getFriendRequests);


export default router;