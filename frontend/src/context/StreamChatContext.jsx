import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StreamChat } from "stream-chat";
import useAuthUser from "../hooks/useAuthUser";
import { getStreamToken } from "../lib/api";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const StreamChatContext = createContext({
  client: null,
  unreadCounts: {},
  totalUnread: 0,
  clearUnreadForUser: () => {},
});

export const StreamChatProvider = ({ children }) => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const navigate = useNavigate();

  const [client, setChatClient] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const processedMessageIds = useRef(new Set());
  const activeListenerRef = useRef(null);
  const connectingPromiseRef = useRef(null);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  useEffect(() => {
    let streamClient = null;

    const initClient = async () => {
      const userId = authUser?._id || authUser?.id;

      // Handle user logout
      if (!authUser || !userId) {
        try {
          const inst = StreamChat.getInstance(STREAM_API_KEY);
          if (inst.userID) {
            await inst.disconnectUser();
          }
        } catch {
          // Ignore disconnection error if already disconnected
        }
        setChatClient(null);
        setUnreadCounts({});
        return;
      }

      if (!tokenData?.token) return;

      const userIdStr = userId.toString();

      try {
        streamClient = StreamChat.getInstance(STREAM_API_KEY);

        // If connected as a DIFFERENT user, disconnect first
        if (streamClient.userID && streamClient.userID !== userIdStr) {
          await streamClient.disconnectUser();
        }

        // If a connection for this client is currently in flight, await it
        try {
          if (connectingPromiseRef.current) {
            await connectingPromiseRef.current;
          } else if (!streamClient.userID) {
            const isCreator = authUser?.email?.toLowerCase() === "umeshalla73@gmail.com";
            const effectiveRole = isCreator ? "admin" : (authUser?.role || "user");
            connectingPromiseRef.current = streamClient.connectUser(
              {
                id: userIdStr,
                name: authUser.fullName,
                image: authUser.profilePic,
                email: authUser.email || (isCreator ? "umeshalla73@gmail.com" : ""),
                role: effectiveRole === "admin" ? "admin" : "user",
                userRole: effectiveRole,
                appRole: effectiveRole,
                nameColor: authUser.nameColor || "",
              },
              tokenData.token
            );
            await connectingPromiseRef.current;
          }
        } finally {
          connectingPromiseRef.current = null;
        }

        // Set client immediately so GlobalChat and UI can render without delay
        setChatClient(streamClient);

        // Query and watch DM messaging channels asynchronously in background
        streamClient
          .queryChannels(
            { type: "messaging", members: { $in: [userIdStr] } },
            { last_message_at: -1 },
            { watch: true, state: true }
          )
          .catch((err) => {
            console.log("Stream queryChannels watch fallback:", err.message);
          });

        // Remove any previously saved listener reference
        if (activeListenerRef.current) {
          streamClient.off("message.new", activeListenerRef.current);
          streamClient.off("notification.message_new", activeListenerRef.current);
          activeListenerRef.current = null;
        }

        // Define single direct message listener
        const handleNewMessage = (event) => {
          const isMessaging =
            event.channel_type === "messaging" ||
            event.cid?.startsWith("messaging:") ||
            event.channel?.type === "messaging";

          if (!isMessaging) return;

          const msgId = event.message?.id || event.id;
          if (msgId) {
            if (processedMessageIds.current.has(msgId)) return;
            processedMessageIds.current.add(msgId);
            if (processedMessageIds.current.size > 300) {
              const first = processedMessageIds.current.values().next().value;
              processedMessageIds.current.delete(first);
            }
          }

          const sender = event.user || event.message?.user || {};
          const currentUserId = userId.toString();
          const senderId = sender.id ? sender.id.toString() : "";

          // Only process messages from OTHER users
          if (senderId && senderId !== currentUserId) {
            const currentPath = window.location.pathname;
            const activeChatPath = `/chat/${senderId}`;

            // If user is not currently in direct chat with sender
            if (currentPath !== activeChatPath) {
              setUnreadCounts((prev) => ({
                ...prev,
                [senderId]: (prev[senderId] || 0) + 1,
              }));

              const toastId = `dm-toast-${senderId}`;
              const messageText = event.message?.text || "Sent a message";

              // Use toast.custom with fixed ID so at most 1 toast banner exists per sender
              toast.custom(
                (t) => (
                  <div
                    className={`flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl bg-base-100 border border-base-300 shadow-2xl transition-all duration-200 ${
                      t.visible ? "animate-in fade-in zoom-in-95" : "animate-out fade-out zoom-out-95"
                    }`}
                    onClick={() => {
                      toast.dismiss(t.id);
                      navigate(`/chat/${senderId}`);
                    }}
                  >
                    <div className="avatar size-10 rounded-full bg-primary/20 shrink-0 overflow-hidden">
                      {sender.image ? (
                        <img src={sender.image} alt={sender.name} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold bg-primary text-primary-content">
                          {(sender.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-base-content flex items-center gap-1.5">
                        <span>{sender.name || "Friend"}</span>
                        <span className="badge badge-xs badge-primary">New Message</span>
                      </p>
                      <p className="text-xs opacity-80 truncate mt-0.5 max-w-[200px]">
                        {messageText}
                      </p>
                    </div>
                  </div>
                ),
                {
                  id: toastId,
                  duration: 5000,
                  position: "top-right",
                }
              );
            }
          }
        };

        activeListenerRef.current = handleNewMessage;
        streamClient.on("message.new", handleNewMessage);
        streamClient.on("notification.message_new", handleNewMessage);
      } catch (err) {
        console.error("Error in StreamChatProvider:", err);
      }
    };

    initClient();

    return () => {
      if (streamClient && activeListenerRef.current) {
        streamClient.off("message.new", activeListenerRef.current);
        streamClient.off("notification.message_new", activeListenerRef.current);
        activeListenerRef.current = null;
      }
    };
  }, [tokenData?.token, authUser?._id, navigate]);

  const clearUnreadForUser = (userId) => {
    setUnreadCounts((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  // Clear unread whenever user visits /chat/:id
  useEffect(() => {
    if (location.pathname.startsWith("/chat/")) {
      const targetId = location.pathname.split("/chat/")[1];
      if (targetId) {
        clearUnreadForUser(targetId);
      }
    }
  }, [location.pathname]);

  const totalUnread = Object.values(unreadCounts).reduce((acc, c) => acc + c, 0);

  return (
    <StreamChatContext.Provider
      value={{
        client,
        unreadCounts,
        totalUnread,
        clearUnreadForUser,
      }}
    >
      {children}
    </StreamChatContext.Provider>
  );
};

export const useStreamChatContext = () => useContext(StreamChatContext);
