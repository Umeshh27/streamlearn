import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtErr) {
      return res.status(401).json({ message: "Unauthorized - Invalid or expired token" });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Unauthorized - Invalid token payload" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    const creatorEmail = (process.env.EMAIL_USER || "umeshalla73@gmail.com").toLowerCase();
    if (user.email && user.email.toLowerCase() === creatorEmail && user.role !== "admin") {
      user.role = "admin";
      await User.findByIdAndUpdate(user._id, { role: "admin" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message || error);
    res.status(401).json({ message: "Unauthorized - Token validation failed" });
  }
};

/**
 * Optional Auth Middleware
 * Attaches user to req.user if token is valid, but does NOT block unauthenticated requests.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.jwt ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (token) {
      const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded && decoded.userId) {
        const user = await User.findById(decoded.userId).select("-password");
        if (user) {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // Ignore invalid token in optionalAuth
  }
  next();
};
