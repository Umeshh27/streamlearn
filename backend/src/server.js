import express from "express";
import http from "http";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import aiRoutes from "./routes/ai.route.js";
import adminRoutes from "./routes/admin.route.js";
import reportRoutes from "./routes/report.route.js";

import { connectDB } from "./lib/db.js";
import { connectRedis } from "./lib/redis.js";
import { setupWebSocketServer } from "./lib/wsHandler.js";
import { syncAllUsersToStream } from "./lib/stream.js";

import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Mount Live WebSocket handler for Voice Assistant & Live features
setupWebSocketServer(server);

app.use(
  cors({
    origin: true,
    credentials: true, // allow frontend to send cookies
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);

const possibleDistPaths = [
  path.resolve(currentDir, "../../frontend/dist"),
  path.resolve(process.cwd(), "frontend/dist"),
  path.resolve(process.cwd(), "../frontend/dist"),
];
const distPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (distPath || process.env.NODE_ENV === "production") {
  const finalDist = distPath || path.resolve(currentDir, "../../frontend/dist");
  app.use(express.static(finalDist));

  app.get("*", (req, res, next) => {
    // Let API and WebSocket requests fall through
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
      return next();
    }
    res.sendFile(path.join(finalDist, "index.html"));
  });
}

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await connectDB();
  await connectRedis();
  await syncAllUsersToStream();
});
