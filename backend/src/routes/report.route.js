import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createReport } from "../controllers/report.controller.js";

const router = express.Router();

router.post("/", protectRoute, createReport);

export default router;
