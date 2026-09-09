import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/useAuthUser";
import { clearChatHistory, getOrCreateChatChannel, getUserProfile } from "../lib/api";
import {
  Trash2Icon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  RefreshCwIcon,
} from "lucide-react";

import {
  Channel,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";
import { useStreamChatContext } from "../context/StreamChatContext";
import { useThemeStore } from "../store/useThemeStore";

const CREATOR_EMAIL = "umeshalla73@gmail.com";
const CREATOR_ID = "6a9c34fb0c1697ab23476030";
const SUBADMIN_ID = "6a9bac6fd61a0fe57c965057";

const ChatHeader = ({
  channel,
  authUser,
  targetProfile,
  handleVideoCall,
  onRequestDelete,
  isTargetOnline,
  onGoBack,
}) => {
  const currentUserId = (authUser?._id || authUser?.id)?.toString();
  const members = channel?.state?.members ? Object.values(channel.state.members) : [];
  const otherMember = members.find(
    (m) => (m.user?.id || m.user_id)?.toString() !== currentUserId
  )?.user;

  const displayName =
    targetProfile?.fullName || otherMember?.name || "Language Partner";
  const displayImage = targetProfile?.profilePic || otherMember?.image || "";
  const nameColor = targetProfile?.nameColor || otherMember?.nameColor || "";
  const isOnline = isTargetOnline ?? (otherMember?.online === true);

  const targetId = (targetProfile?._id || otherMember?.id)?.toString();
  const targetEmail = (targetProfile?.email || otherMember?.email || "").toLowerCase();
  const targetRole = (
    targetProfile?.role ||
    otherMember?.userRole ||
    otherMember?.appRole ||
    otherMember?.role ||
    ""
  ).toLowerCase();

  const isCreator =
    targetId === CREATOR_ID ||
    targetEmail === CREATOR_EMAIL ||
    targetRole === "admin" ||
    (displayName || "").trim().toLowerCase() === "admin";

  const isSubAdmin =
    !isCreator &&
    (targetId === SUBADMIN_ID ||
      targetEmail === "umeshalla1@gmail.com" ||
      targetRole === "subadmin");

  return (
    <div className="flex items-center justify-between px-2 sm:px-6 py-2 sm:py-3 bg-base-100 border-b border-base-300 w-full shrink-0 gap-1.5 sm:gap-2">
      {/* LEFT: Back button + User Profile Image & Name */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onGoBack}
          className="btn btn-ghost btn-circle btn-sm -ml-1 text-base-content/80 hover:text-base-content shrink-0"
          title="Go back"
        >
          <ArrowLeftIcon className="size-4 sm:size-5" />
        </button>

        <div className="avatar relative shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring ring-primary/30 ring-offset-base-100 ring-offset-1 overflow-hidden">
            {displayImage ? (
              <img src={displayImage} alt={displayName} className="object-cover w-full h-full" />
            ) : (
              <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold text-xs sm:text-base">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Green / Gray Status Indicator Dot on Avatar */}
          <span
            className={`absolute bottom-0 right-0 size-2.5 sm:size-3 rounded-full border-2 border-base-100 ${
              isOnline ? "bg-success" : "bg-base-content/30"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <h3
              className="font-bold text-sm sm:text-base leading-tight truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[240px] md:max-w-xs"
              style={{ color: nameColor || undefined }}
            >
              {displayName}
            </h3>

            {/* Creator / Sub-Admin Badges */}
            {isCreator && (
              <span
                className="badge badge-primary badge-xs font-black uppercase text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 shadow-2xs gap-0.5 shrink-0"
                title="Platform Creator & Admin"
              >
                👑 Creator
              </span>
            )}
            {isSubAdmin && (
              <span
                className="badge badge-accent badge-xs font-black px-1 py-0.5 shadow-2xs shrink-0 inline-flex items-center justify-center"
                title="Sub-Admin"
              >
                <ShieldCheckIcon className="size-2.5 sm:size-3 fill-current" />
              </span>
            )}
          </div>

          {isOnline ? (
            <p className="text-[11px] sm:text-xs text-base-content/80 flex items-center gap-1 font-medium mt-0.5">
              <span className="size-1.5 sm:size-2 rounded-full bg-success inline-block animate-pulse" />
              Online
            </p>
          ) : (
            <p className="text-[11px] sm:text-xs text-base-content/50 flex items-center gap-1 mt-0.5">
              <span className="size-1.5 sm:size-2 rounded-full bg-base-content/30 inline-block" />
              Offline
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: Actions (Video Call & Delete Chat) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <CallButton handleVideoCall={handleVideoCall} />

        <button
          onClick={onRequestDelete}
          className="btn btn-outline btn-error btn-xs sm:btn-sm font-bold gap-1 shadow-2xs hover:bg-error hover:text-error-content transition-colors px-2 sm:px-3"
          title="Delete chat history"
        >
          <Trash2Icon className="size-3.5 sm:size-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const { authUser } = useAuthUser();
  const { client: streamClient } = useStreamChatContext();
  const { theme } = useThemeStore();

  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isTargetOnline, setIsTargetOnline] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Fetch target user profile for fast immediate header render & badge display
  const { data: targetProfileData } = useQuery({
    queryKey: ["userProfile", targetUserId],
    queryFn: () => getUserProfile(targetUserId),
    enabled: !!targetUserId && targetUserId !== authUser?._id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const targetProfile = targetProfileData?.user || null;

  const { mutate: deleteChatMutation, isPending: isDeleting } = useMutation({
    mutationFn: () => clearChatHistory(targetUserId),
    onSuccess: async () => {
      toast.success("Chat history deleted!");
      setShowConfirmDelete(false);
      if (channel) {
        try {
          await channel.watch();
        } catch {
          // Ignore watch refresh error
        }
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete chat history");
    },
  });

  useEffect(() => {
    let isCancelled = false;

    const initChat = async () => {
      const currentUserId = (authUser?._id || authUser?.id)?.toString();
      const targetIdStr = targetUserId?.toString();

      if (!currentUserId || !targetIdStr) return;

      if (currentUserId === targetIdStr) {
        toast.error("You cannot chat with yourself.");
        navigate("/");
        return;
      }

      // If streamClient is not yet connected, stay in loading state until it connects
      if (!streamClient || !streamClient.userID || streamClient.userID !== currentUserId) {
        setLoading(true);
        return;
      }

      const channelId = [currentUserId, targetIdStr].sort().join("-");
      const cid = `messaging:${channelId}`;

      // 1. Instant reconnection if channel is already active in memory (e.g. cutting video call)
      const cachedChannel = streamClient.activeChannels?.[cid];
      if (cachedChannel && cachedChannel.initialized) {
        if (!isCancelled) {
          setChannel(cachedChannel);
          setLoading(false);
          setInitError(null);
        }
        cachedChannel.markRead().catch(() => {});
        // Refresh presence and any new messages in background
        cachedChannel.watch({ presence: true }).catch(() => {});
      } else {
        setLoading(true);
        setInitError(null);

        let attempts = 0;
        const maxAttempts = 3;
        let connectSuccess = false;

        while (attempts < maxAttempts && !connectSuccess && !isCancelled) {
          attempts++;
          try {
            // 2. Direct client watch first (instant over existing WebSocket connection)
            let currChannel = streamClient.channel("messaging", channelId, {
              members: [currentUserId, targetIdStr],
            });

            try {
              await currChannel.watch({
                presence: true,
                messages: { limit: 50 },
              });
            } catch (watchErr) {
              console.warn("Direct watch fallback, ensuring on server:", watchErr.message);
              // If direct watch failed (e.g. brand new user/channel), register on server
              await getOrCreateChatChannel(targetIdStr);
              if (isCancelled) return;

              currChannel = streamClient.channel("messaging", channelId, {
                members: [currentUserId, targetIdStr],
              });
              await currChannel.watch({
                presence: true,
                messages: { limit: 50 },
              });
            }

            if (isCancelled) return;

            currChannel.markRead().catch(() => {});

            if (!isCancelled) {
              setChannel(currChannel);
              setLoading(false);
              connectSuccess = true;
            }
          } catch (err) {
            if (attempts < maxAttempts && !isCancelled) {
              console.warn(`Retry ${attempts}/${maxAttempts} connecting to chat channel...`);
              await new Promise((res) => setTimeout(res, 700));
            } else {
              console.error("Error initializing personal chat:", err);
              if (!isCancelled) {
                setInitError(
                  err.response?.data?.message ||
                    err.message ||
                    "Failed to load chat conversation"
                );
                setLoading(false);
              }
            }
          }
        }
      }

      // 3. Query target user presence accurately
      try {
        const userResponse = await streamClient.queryUsers(
          { id: targetIdStr },
          {},
          { presence: true }
        );
        if (userResponse.users && userResponse.users.length > 0) {
          setIsTargetOnline(userResponse.users[0].online === true);
        } else {
          const members = streamClient.activeChannels?.[cid]?.state?.members
            ? Object.values(streamClient.activeChannels[cid].state.members)
            : [];
          const otherUser = members.find(
            (m) => (m.user?.id || m.user_id)?.toString() === targetIdStr
          )?.user;
          setIsTargetOnline(otherUser?.online === true);
        }
      } catch (err) {
        console.warn("Presence query fallback:", err.message);
      }
    };

    initChat();

    // Setup real-time presence listener
    const handlePresence = (event) => {
      if (event.user?.id?.toString() === targetUserId?.toString()) {
        setIsTargetOnline(event.user.online === true);
      }
    };

    if (streamClient) {
      streamClient.on("user.presence.changed", handlePresence);
      streamClient.on("user.updated", handlePresence);
    }

    return () => {
      isCancelled = true;
      if (streamClient) {
        streamClient.off("user.presence.changed", handlePresence);
        streamClient.off("user.updated", handlePresence);
      }
    };
  }, [authUser, streamClient, targetUserId, navigate, retryTrigger]);

  const handleVideoCall = () => {
    if (channel) {
      const callSessionId = `${channel.id}-${Date.now()}`;
      const callUrl = `${window.location.origin}/call/${callSessionId}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent! Redirecting to call room...");
      navigate(`/call/${callSessionId}`, {
        state: { targetUserId },
      });
    }
  };

  const handleChatContainerClick = (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href) {
      try {
        const url = new URL(anchor.href);
        if (url.pathname.startsWith("/call/")) {
          e.preventDefault();
          navigate(url.pathname, {
            state: { targetUserId },
          });
        }
      } catch {
        // Ignore navigation parse error
      }
    }
  };

  const isDarkTheme = [
    "dark",
    "synthwave",
    "halloween",
    "forest",
    "black",
    "luxury",
    "dracula",
    "night",
    "dim",
    "sunset",
    "coffee",
    "business",
  ].includes(theme);

  if (loading) return <ChatLoader />;

  if (initError) {
    return (
      <div className="h-[90vh] flex flex-col items-center justify-center p-6">
        <div className="bg-base-100 border border-base-300 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto">
            <AlertCircleIcon className="size-8" />
          </div>
          <h2 className="text-xl font-black text-base-content">Unable to Open Chat</h2>
          <p className="text-sm text-base-content/70">{initError}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate("/friends")}
              className="btn btn-ghost border border-base-300 hover:bg-base-200 text-base-content font-bold btn-sm"
            >
              Go to Friends
            </button>
            <button
              type="button"
              onClick={() => {
                setInitError(null);
                setLoading(true);
                setRetryTrigger((prev) => prev + 1);
              }}
              className="btn btn-primary text-primary-content btn-sm font-bold gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCwIcon className="size-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!streamClient || !channel) return <ChatLoader />;

  return (
    <div className="p-0 sm:p-4 lg:p-5 sm:pb-4 flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div
        className="w-full sm:container sm:max-w-6xl mx-auto flex-1 flex flex-col h-full min-h-0 overflow-hidden"
        onClick={handleChatContainerClick}
      >
        <Chat
          client={streamClient}
          theme={isDarkTheme ? "str-chat__theme-dark" : "str-chat__theme-light"}
        >
          <Channel channel={channel}>
            <Window>
              <ChatHeader
                channel={channel}
                authUser={authUser}
                targetProfile={targetProfile}
                handleVideoCall={handleVideoCall}
                onRequestDelete={() => setShowConfirmDelete(true)}
                isTargetOnline={isTargetOnline}
                onGoBack={() => navigate("/friends")}
              />
              <MessageList />
              <MessageComposer />
            </Window>

            <Thread />
          </Channel>
        </Chat>
      </div>

      {/* DELETE CHAT CONFIRMATION MODAL */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-error">
              <div className="p-3 bg-error/10 rounded-full">
                <AlertTriangleIcon className="size-6 text-error" />
              </div>
              <h3 className="font-bold text-xl text-base-content">Delete Chat History?</h3>
            </div>

            <p className="text-sm opacity-80 leading-relaxed">
              Are you sure you want to delete all messages in this conversation? This will permanently clear the chat history for both participants.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="btn btn-ghost border border-base-300 text-base-content font-bold btn-sm sm:btn-md hover:bg-base-200"
              >
                Cancel
              </button>

              <button
                onClick={() => deleteChatMutation()}
                disabled={isDeleting}
                className="btn btn-error text-error-content btn-sm sm:btn-md font-bold gap-2 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2Icon className="size-4" />
                    Delete Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;

