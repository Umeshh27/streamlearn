import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "harassment",
        "inappropriate_webcam",
        "spam_flooding",
        "vulgar_language",
        "dating_unsolicited",
        "other",
      ],
      required: true,
    },
    details: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    context: {
      type: String,
      default: "", // e.g. "Global Chat", "1-on-1 Call", etc.
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
    },
    actionTaken: {
      type: String,
      default: "", // e.g. "5m_timeout", "10m_timeout", "permanent_ban", "dismissed"
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

export default Report;
