import Report from "../models/Report.js";
import User from "../models/User.js";

export const createReport = async (req, res) => {
  try {
    const { reportedUserId, reason, details = "", context = "General" } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ success: false, message: "Reported user and reason are required" });
    }

    if (req.user._id.toString() === reportedUserId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot report yourself" });
    }

    const targetUser = await User.findById(reportedUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Reported user not found" });
    }

    const creatorEmail = (process.env.EMAIL_USER || "umeshalla73@gmail.com").toLowerCase();
    if (targetUser.email && targetUser.email.toLowerCase() === creatorEmail) {
      return res.status(400).json({ success: false, message: "Cannot report the platform administrator" });
    }

    // Check if user already reported this person recently
    const recentReport = await Report.findOne({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      status: "pending",
    });

    if (recentReport) {
      return res.status(429).json({
        success: false,
        message: "You have already submitted a pending report for this user. The admin team is reviewing it.",
      });
    }

    const newReport = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      reason,
      details: details.trim().slice(0, 1000),
      context,
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully. Thank you for keeping our community safe.",
      report: newReport,
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return res.status(500).json({ success: false, message: "Failed to submit report" });
  }
};
