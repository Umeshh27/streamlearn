import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";
import { upsertStreamUser } from "../lib/stream.js";

export async function getRecommendedUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const currentUser = req.user;

    const recommendedUsers = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, //exclude current user
        { _id: { $nin: currentUser.friends } }, // exclude current user's friends
        { isOnboarded: true },
      ],
    });
    res.status(200).json(recommendedUsers);
  } catch (error) {
    console.error("Error in getRecommendedUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("friends")
      .populate("friends", "fullName profilePic nativeLanguage learningLanguage location bio");

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getMyFriends controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


export async function sendFriendRequest(req, res) {
  try {
    const myId = req.user.id;
    const { id: recipientId } = req.params;

    // prevent sending req to yourself
    if (myId === recipientId) {
      return res.status(400).json({ message: "You can't send friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // check if user is already friends
    if (recipient.friends.includes(myId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // check if a req already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: myId, recipient: recipientId },
        { sender: recipientId, recipient: myId },
      ],
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A friend request already exists between you and this user" });
    }

    const friendRequest = await FriendRequest.create({
      sender: myId,
      recipient: recipientId,
    });

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error("Error in sendFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Verify the current user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to accept this request" });
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    // add each user to the other's friends array
    // $addToSet: adds elements to an array only if they do not already exist.
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.recipient },
    });

    await User.findByIdAndUpdate(friendRequest.recipient, {
      $addToSet: { friends: friendRequest.sender },
    });

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log("Error in acceptFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectFriendRequest(req, res) {
  try {
    const { id: requestId } = req.params;
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to decline this request" });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    res.status(200).json({ message: "Friend request declined" });
  } catch (error) {
    console.log("Error in rejectFriendRequest controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function dismissNotification(req, res) {
  try {
    const { id: requestId } = req.params;
    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(200).json({ message: "Notification already dismissed" });
    }

    if (request.sender.toString() !== req.user.id && request.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to dismiss this notification" });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    res.status(200).json({ message: "Notification dismissed" });
  } catch (error) {
    console.log("Error in dismissNotification controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function clearAllNotifications(req, res) {
  try {
    const userId = req.user.id;
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, status: "accepted" },
        { recipient: userId, status: "accepted" },
      ],
    });
    res.status(200).json({ message: "All notifications cleared" });
  } catch (error) {
    console.log("Error in clearAllNotifications controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFriendRequests(req, res) {
  try {
    const incomingReqs = await FriendRequest.find({
      recipient: req.user.id,
      status: "pending",
    }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

    const acceptedReqs = await FriendRequest.find({
      sender: req.user.id,
      status: "accepted",
    }).populate("recipient", "fullName profilePic");

    res.status(200).json({ incomingReqs, acceptedReqs });
  } catch (error) {
    console.log("Error in getPendingFriendRequests controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOutgoingFriendReqs(req, res) {
  try {
    const outgoingRequests = await FriendRequest.find({
      sender: req.user.id,
      status: "pending",
    }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage");

    res.status(200).json(outgoingRequests);
  } catch (error) {
    console.log("Error in getOutgoingFriendReqs controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const currentUserId = req.user.id;
    const { id: targetUserId } = req.params;

    const user = await User.findById(targetUserId).select(
      "fullName email role profilePic nativeLanguage learningLanguage location bio age nameColor createdAt friends"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = currentUserId === targetUserId;
    const isFriend = user.friends.some((fId) => fId.toString() === currentUserId);

    let outgoingRequest = null;
    let incomingRequest = null;

    if (!isSelf && !isFriend) {
      outgoingRequest = await FriendRequest.findOne({
        sender: currentUserId,
        recipient: targetUserId,
        status: "pending",
      });

      incomingRequest = await FriendRequest.findOne({
        sender: targetUserId,
        recipient: currentUserId,
        status: "pending",
      });
    }

    res.status(200).json({
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        nativeLanguage: user.nativeLanguage,
        learningLanguage: user.learningLanguage,
        location: user.location,
        bio: user.bio,
        age: user.age || null,
        nameColor: user.nameColor || "",
        createdAt: user.createdAt,
      },
      isSelf,
      isFriend,
      hasSentRequest: !!outgoingRequest,
      hasReceivedRequest: !!incomingRequest,
      incomingRequestId: incomingRequest ? incomingRequest._id : null,
    });
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, bio, nativeLanguage, learningLanguage, location, age, profilePic, nameColor } = req.body;

    const updateFields = {};
    if (fullName) {
      const trimmedName = fullName.trim();
      const existingName = await User.findOne({
        fullName: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i") },
        _id: { $ne: userId },
      });
      if (existingName) {
        return res.status(400).json({ message: "Username is already taken, please choose a unique username." });
      }
      updateFields.fullName = trimmedName;
    }
    if (bio !== undefined) updateFields.bio = bio;
    if (nativeLanguage !== undefined) updateFields.nativeLanguage = nativeLanguage;
    if (learningLanguage !== undefined) updateFields.learningLanguage = learningLanguage;
    if (location !== undefined) updateFields.location = location;
    if (profilePic !== undefined) updateFields.profilePic = profilePic;
    if (nameColor !== undefined) updateFields.nameColor = nameColor;
    if (age !== undefined) {
      if (age === null || age === "") {
        updateFields.age = null;
      } else {
        const numAge = Number(age);
        if (!isNaN(numAge) && numAge >= 14 && numAge <= 120) {
          updateFields.age = numAge;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sync with Stream Chat
    try {
      await upsertStreamUser({
        id: updatedUser._id.toString(),
        name: updatedUser.fullName,
        image: updatedUser.profilePic || "",
        nameColor: updatedUser.nameColor || "",
      });
    } catch (streamError) {
      console.log("Error updating Stream user during profile update:", streamError.message);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in updateUserProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAllUsers(req, res) {
  try {
    const currentUserId = req.user.id;

    const users = await User.find({
      _id: { $ne: currentUserId },
      isOnboarded: true,
    }).select("fullName profilePic nativeLanguage learningLanguage location bio friends");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function unfriendUser(req, res) {
  try {
    const myId = req.user.id;
    const { id: friendId } = req.params;

    await User.findByIdAndUpdate(myId, {
      $pull: { friends: friendId },
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: myId },
    });

    await FriendRequest.deleteMany({
      $or: [
        { sender: myId, recipient: friendId },
        { sender: friendId, recipient: myId },
      ],
    });

    res.status(200).json({ message: "Unfriended successfully" });
  } catch (error) {
    console.error("Error in unfriendUser controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * Respond to Sub-Admin nomination invitation (Accept or Decline)
 */
export async function respondToStaffInvitation(req, res) {
  try {
    const { action } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.subadminInvitation || user.subadminInvitation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "No pending Sub-Admin nomination was found for your account.",
      });
    }

    if (action === "accept") {
      user.role = "subadmin";
      user.subadminInvitation.status = "accepted";
      user.subadminInvitation.respondedAt = new Date();
      await user.save();

      // Sync role with Stream Chat metadata
      upsertStreamUser({
        id: user._id.toString(),
        name: user.fullName,
        image: user.profilePic || "",
        nameColor: user.nameColor || "",
        role: "subadmin",
        email: user.email,
      }).catch((e) => console.warn("Stream role sync error on accept:", e.message));

      return res.status(200).json({
        success: true,
        message: "Congratulations! You have accepted the Sub-Admin appointment. You now have staff moderation access.",
        user,
      });
    }

    if (action === "reject" || action === "decline") {
      user.role = "user";
      user.subadminInvitation.status = "rejected";
      user.subadminInvitation.respondedAt = new Date();
      await user.save();

      upsertStreamUser({
        id: user._id.toString(),
        name: user.fullName,
        image: user.profilePic || "",
        nameColor: user.nameColor || "",
        role: "user",
        email: user.email,
      }).catch((e) => console.warn("Stream role sync error on decline:", e.message));

      return res.status(200).json({
        success: true,
        message: "You have declined the Sub-Admin appointment. Your role remains standard learner.",
        user,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action. Please specify 'accept' or 'reject'.",
    });
  } catch (error) {
    console.error("Error in respondToStaffInvitation controller:", error);
    return res.status(500).json({ success: false, message: "Failed to process staff invitation response." });
  }
}



