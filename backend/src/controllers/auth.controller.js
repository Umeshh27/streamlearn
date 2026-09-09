import { upsertStreamUser, generateStreamToken } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../lib/email.js";

export async function signup(req, res) {
  const { email, password, fullName } = req.body;

  try {
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const trimmedName = fullName.trim();
    const existingName = await User.findOne({
      fullName: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    const existingUser = await User.findOne({ email: cleanEmail });

    // Generate 6-digit verification code expiring in 15 minutes
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: "Email already exists, please sign in or use a different email." });
      }

      // If user registered earlier but never verified their email, refresh details and resend code
      existingUser.fullName = trimmedName;
      existingUser.password = password; // mongoose pre-save will hash
      existingUser.verificationCode = verificationCode;
      existingUser.verificationCodeExpiresAt = verificationCodeExpiresAt;
      await existingUser.save();

      await sendVerificationEmail({
        email: existingUser.email,
        code: verificationCode,
        fullName: trimmedName,
      });

      return res.status(200).json({
        success: true,
        message: "Verification code sent to your email.",
        email: existingUser.email,
        requiresVerification: true,
      });
    }

    if (existingName) {
      return res.status(400).json({ message: "Username is already taken, please choose a unique username." });
    }

    const idx = Math.floor(Math.random() * 100) + 1; // generate a num between 1-100
    const randomAvatar = `https://avatars.rentcircle.ph/public/${idx}.png`;

    const newUser = await User.create({
      email: cleanEmail,
      fullName: trimmedName,
      password,
      profilePic: randomAvatar,
      isVerified: false,
      verificationCode,
      verificationCodeExpiresAt,
    });

    // Send verification email
    await sendVerificationEmail({
      email: newUser.email,
      code: verificationCode,
      fullName: newUser.fullName,
    });

    return res.status(201).json({
      success: true,
      message: "Verification code sent to your email. Please verify your account to proceed.",
      email: newUser.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.log("Error in signup controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and 6-digit verification code are required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: "Account not found with this email." });
    }

    if (user.isVerified) {
      const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
      const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "7d" });
      res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res.status(200).json({ success: true, message: "Email already verified.", user });
    }

    if (user.verificationCode !== cleanCode) {
      return res.status(400).json({ message: "Invalid 6-digit verification code. Please check your inbox and try again." });
    }

    if (!user.verificationCodeExpiresAt || new Date() > user.verificationCodeExpiresAt) {
      return res.status(400).json({ message: "Verification code has expired. Please click 'Resend Code'." });
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;
    await user.save();

    // Now upsert Stream user in background
    upsertStreamUser({
      id: user._id.toString(),
      name: user.fullName,
      image: user.profilePic || "",
    }).catch((streamError) => {
      console.log("Error creating Stream user:", streamError.message);
    });

    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: "7d" });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    const streamToken = generateStreamToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! Welcome to LangBridge.",
      user,
      streamToken,
    });
  } catch (error) {
    console.error("Error in verifyEmail controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function resendVerificationCode(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "This email is already verified. Please sign in." });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newCode;
    user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendVerificationEmail({
      email: user.email,
      code: newCode,
      fullName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Error in resendVerificationCode controller:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isPasswordCorrect = await user.matchPassword(password);
    if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid email or password" });

    // Guard against unverified users (treat undefined as true for legacy accounts)
    if (user.isVerified === false) {
      let currentCode = user.verificationCode;
      if (!currentCode || !user.verificationCodeExpiresAt || new Date() > user.verificationCodeExpiresAt) {
        currentCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = currentCode;
        user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        await sendVerificationEmail({ email: user.email, code: currentCode, fullName: user.fullName });
      }

      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in. A 6-digit code has been sent to your inbox.",
        isUnverified: true,
        email: user.email,
      });
    }

    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true, // prevent XSS attacks
      sameSite: "lax", // allow reliable top-level navigations & reloads while guarding against CSRF
      secure: process.env.NODE_ENV === "production",
    });

    // Ensure Stream user is synchronized in background without blocking response
    upsertStreamUser({
      id: user._id.toString(),
      name: user.fullName,
      image: user.profilePic || "",
      nameColor: user.nameColor || "",
    }).catch((streamErr) => {
      console.log("Stream upsert on login fallback:", streamErr.message);
    });

    const streamToken = generateStreamToken(user._id);

    return res.status(200).json({ success: true, user, streamToken });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export function logout(req, res) {
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(200).json({ success: true, message: "Logout successful" });
}

export async function onboard(req, res) {
  try {
    const userId = req.user._id;

    const { fullName, bio, nativeLanguage, learningLanguage, location, age } = req.body;

    if (
      !fullName ||
      !bio ||
      !nativeLanguage ||
      !learningLanguage ||
      !location ||
      age === undefined ||
      age === null ||
      age === ""
    ) {
      return res.status(400).json({
        message: "All fields are required",
        missingFields: [
          !fullName && "fullName",
          !bio && "bio",
          !nativeLanguage && "nativeLanguage",
          !learningLanguage && "learningLanguage",
          !location && "location",
          (age === undefined || age === null || age === "") && "age",
        ].filter(Boolean),
      });
    }

    const numAge = Number(age);
    if (isNaN(numAge) || numAge < 14 || numAge > 120) {
      return res.status(400).json({
        message: "You must be at least 14 years old to join LangBridge.",
      });
    }

    const bioWords = (bio || "").trim().split(/\s+/).filter(Boolean);
    if (bioWords.length < 20) {
      return res.status(400).json({
        message: `Please write a meaningful bio with at least 20 words (currently ${bioWords.length} words) so community members can get to know you.`,
      });
    }

    const trimmedName = fullName.trim();
    const existingName = await User.findOne({
      fullName: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") },
      _id: { $ne: userId },
    });
    if (existingName) {
      return res.status(400).json({ message: "Username is already taken, please choose a unique username." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...req.body,
        age: numAge,
        isOnboarded: true,
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
      });
      console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`);
    } catch (streamError) {
      console.log("Error updating Stream user during onboarding:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Onboarding error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
