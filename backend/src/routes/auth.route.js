import express from "express";
import {
  login,
  logout,
  onboard,
  signup,
  verifyEmail,
  resendVerificationCode,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { generateStreamToken } from "../lib/stream.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/resend-code", resendVerificationCode);
router.post("/login", login);
router.post("/logout", logout);

router.post("/onboarding", protectRoute, onboard);

// check if user is logged in
router.get("/me", protectRoute, (req, res) => {
  const streamToken = generateStreamToken(req.user._id);
  res.status(200).json({ success: true, user: req.user, streamToken });
});

export default router;
