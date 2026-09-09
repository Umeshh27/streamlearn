import express from "express";
import {
  chatWithAi,
  transcribeAudio,
  checkPronunciation,
  getPracticeSentence,
  translateSentence,
  getKeyStatus,
  getTtsAudioStream,
} from "../controllers/ai.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Clean AI routes with Redis rate limiting
router.post("/chat", optionalAuth, aiRateLimiter, chatWithAi);
router.post("/transcribe", optionalAuth, aiRateLimiter, transcribeAudio);
router.post("/pronounce-check", optionalAuth, aiRateLimiter, checkPronunciation);
router.post("/practice-sentence", optionalAuth, aiRateLimiter, getPracticeSentence);
router.post("/translate", optionalAuth, aiRateLimiter, translateSentence);
router.get("/key-status", optionalAuth, getKeyStatus);
router.get("/tts", getTtsAudioStream);

export default router;
