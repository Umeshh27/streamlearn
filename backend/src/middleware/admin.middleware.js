import User from "../models/User.js";

const CREATOR_EMAILS = [
  "umeshalla73@gmail.com",
  (process.env.EMAIL_USER || "").toLowerCase(),
  (process.env.ADMIN_EMAIL || "").toLowerCase(),
].filter(Boolean);

export const isCreatorUser = (user) => {
  if (!user || !user.email) return false;
  return CREATOR_EMAILS.includes(user.email.toLowerCase());
};

// Auto-elevate creator to "admin" role if needed
const checkAndElevateCreator = async (req) => {
  if (isCreatorUser(req.user) && req.user.role !== "admin") {
    req.user.role = "admin";
    await User.findByIdAndUpdate(req.user._id, { role: "admin" });
  }
};

/**
 * 1. requireSubAdmin: Allows Sub-Admins and Admins (Staff)
 * Used for Reports Queue, User Directory, Stats Overview, and Moderation
 */
export const requireSubAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - Authentication required" });
    }

    await checkAndElevateCreator(req);

    const isSubAdminOrHigher =
      isCreatorUser(req.user) ||
      ["admin", "subadmin"].includes(req.user.role);

    if (!isSubAdminOrHigher) {
      return res.status(403).json({ message: "Forbidden - Sub-Admin or Administrator access required" });
    }

    next();
  } catch (error) {
    console.error("Error in requireSubAdmin middleware:", error);
    return res.status(500).json({ message: "Internal server error validating sub-admin permissions" });
  }
};

// requireStaff is an alias for requireSubAdmin (Sub-Admins and Admins)
export const requireStaff = requireSubAdmin;

/**
 * 3. requireAdmin: Strictly allows Admins (and Creator)
 * Used for Staff Promotion/Demotion, Deleting Users, Broadcasts, and AI/Infra
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - Authentication required" });
    }

    await checkAndElevateCreator(req);

    const isFullAdmin = isCreatorUser(req.user) || req.user.role === "admin";

    if (!isFullAdmin) {
      return res.status(403).json({ message: "Forbidden - Head Administrator access required" });
    }

    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    return res.status(500).json({ message: "Internal server error validating admin permissions" });
  }
};
