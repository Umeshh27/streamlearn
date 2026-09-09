import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  SendIcon,
  GlobeIcon,
  MessageSquareIcon,
  UsersIcon,
  XIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  CheckIcon,
  HomeIcon,
  Trash2Icon,
  UserIcon,
  MoreHorizontalIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { useStreamChatContext } from "../context/StreamChatContext";
import { LANGUAGES, LANGUAGE_TO_FLAG } from "../constants";
import { getNameStyle, getNameClass } from "../lib/utils";
import { deleteAdminRoom } from "../lib/api";
import ReportUserModal from "./ReportUserModal";

// Max characters allowed per chat message
const MAX_MESSAGE_LENGTH = 300;

// Room inactivity limit: 30 minutes
const ROOM_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

// Global Lounge is the permanent default
const GLOBAL_ROOM = { id: "global-community", name: "Global Lounge", code: "general" };

// Deterministic High-Contrast Username Colors (matching reference community chat)
const USER_COLORS = [
  "text-sky-500 font-bold",
  "text-emerald-500 font-bold",
  "text-violet-500 font-bold",
  "text-pink-500 font-bold",
  "text-amber-500 font-bold",
  "text-cyan-500 font-bold",
  "text-rose-500 font-bold",
  "text-indigo-500 font-bold",
  "text-teal-500 font-bold",
  "text-orange-500 font-bold",
  "text-fuchsia-500 font-bold",
  "text-purple-500 font-bold",
  "text-lime-500 font-bold",
];

const getUsernameColor = (identifier) => {
  if (!identifier) return "text-primary font-bold";
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
};

const CREATOR_EMAIL = "umeshalla73@gmail.com";
const CREATOR_ID = "6a9c34fb0c1697ab23476030";
const SUBADMIN_ID = "6a9bac6fd61a0fe57c965057";

const checkIsAdmin = (userObj, currentAuth) => {
  if (!userObj) return false;
  const uid = (userObj.id || userObj._id)?.toString();
  const currentAuthId = (currentAuth?._id || currentAuth?.id)?.toString();
  const isMe = Boolean(uid && currentAuthId && uid === currentAuthId);

  if (uid === CREATOR_ID) return true;

  const email = (userObj.email || (isMe ? currentAuth?.email : "") || "").toLowerCase();
  if (email === CREATOR_EMAIL) return true;

  const role = (isMe ? currentAuth?.role : (userObj.userRole || userObj.appRole || userObj.role))?.toLowerCase();
  if (role === "admin") return true;

  const name = (userObj.name || (isMe ? currentAuth?.fullName : "") || "").trim().toLowerCase();
  if (name === "admin") return true;

  return false;
};

const checkIsSubAdmin = (userObj, currentAuth) => {
  if (!userObj) return false;
  if (checkIsAdmin(userObj, currentAuth)) return false;

  const uid = (userObj.id || userObj._id)?.toString();
  const currentAuthId = (currentAuth?._id || currentAuth?.id)?.toString();
  const isMe = Boolean(uid && currentAuthId && uid === currentAuthId);

  if (uid === SUBADMIN_ID) return true;

  const email = (userObj.email || (isMe ? currentAuth?.email : "") || "").toLowerCase();
  if (email === "umeshalla1@gmail.com") return true;

  const role = (isMe ? currentAuth?.role : (userObj.userRole || userObj.appRole || userObj.role))?.toLowerCase();
  if (role === "subadmin") return true;

  return false;
};

const GlobalChat = ({ onSelectUser }) => {
  const { authUser } = useAuthUser();
  const { client: streamClient } = useStreamChatContext();
  const chatClient = streamClient;
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportingTarget, setReportingTarget] = useState(null);

  // Sidebar Drawer state: null | "users" | "rooms"
  const [sidebarTab, setSidebarTab] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [showSentinelInfo, setShowSentinelInfo] = useState(false);

  // Only dynamically created language rooms (filter out rooms inactive > 30 mins)
  const [customRooms, setCustomRooms] = useState(() => {
    try {
      const saved = localStorage.getItem("streamlearn_active_language_rooms");
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const activeRooms = parsed.filter(
          (r) => now - (r.lastActiveAt || r.lastMessageAt || r.createdAt || 0) < ROOM_INACTIVITY_LIMIT_MS
        );
        return activeRooms;
      }
    } catch (e) {
      console.warn("Could not load custom rooms:", e);
    }
    return [];
  });

  const [activeRoomId, setActiveRoomId] = useState("global-community");

  // All active rooms = Global Lounge + active custom rooms
  const allRooms = [GLOBAL_ROOM, ...customRooms];
  const currentRoom = allRooms.find((r) => r.id === activeRoomId) || GLOBAL_ROOM;

  const messagesEndRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastOnlineIdsRef = useRef("");
  const activeChannelRef = useRef(null);

  // Helper to refresh activity timestamp on a room strictly when a message is sent/received
  const touchRoomActivity = (roomId) => {
    if (!roomId || roomId === "global-community") return;
    setCustomRooms((prev) => {
      const updated = prev.map((r) =>
        r.id === roomId ? { ...r, lastMessageAt: Date.now() } : r
      );
      try {
        localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Query remote livestream channels from Stream Chat so rooms are discovered across all users
  const fetchRemoteRooms = useCallback(async (client) => {
    if (!client || !client.userID) return;
    try {
      const channels = await client.queryChannels(
        { type: "livestream" },
        { last_message_at: -1 },
        { limit: 30 }
      );

      const now = Date.now();
      const remoteRooms = channels
        .filter((c) => c.id !== "global-community" && c.id?.startsWith("lang-"))
        .map((c) => {
          const rawName =
            c.data?.language ||
            c.data?.name?.replace(" Community Chat", "") ||
            c.id.replace("lang-", "");
          const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          const createdAtTime = new Date(c.data?.created_at || c.created_at || now).getTime();
          const lastMsgTime = c.data?.last_message_at
            ? new Date(c.data.last_message_at).getTime()
            : createdAtTime;

          return {
            id: c.id,
            name: cleanName,
            code: cleanName.toLowerCase(),
            createdAt: createdAtTime,
            lastMessageAt: lastMsgTime,
          };
        })
        .filter((r) => now - (r.lastMessageAt || r.createdAt || 0) < ROOM_INACTIVITY_LIMIT_MS);

      setCustomRooms((prev) => {
        const remoteIds = new Set(remoteRooms.map((r) => r.id));
        const finalRooms = [...remoteRooms];

        // Keep local room ONLY if it was created very recently (< 15 seconds ago) by this user
        // and is still propagating to Stream Chat backend
        prev.forEach((localRoom) => {
          if (!remoteIds.has(localRoom.id) && now - (localRoom.createdAt || 0) < 15000) {
            finalRooms.push(localRoom);
          }
        });

        // If the current active room was removed/closed, immediately return to global-community
        if (activeRoomId !== "global-community" && !finalRooms.some((r) => r.id === activeRoomId)) {
          setActiveRoomId("global-community");
        }

        try {
          localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(finalRooms));
        } catch (e) {}

        return finalRooms;
      });
    } catch (err) {
      console.warn("Error querying remote rooms from Stream:", err.message);
    }
  }, [activeRoomId]);

  // Listen for local and cross-tab room removal events
  useEffect(() => {
    const handleLocalRoomRemoved = (e) => {
      const removedId = e.detail?.roomId;
      if (!removedId) return;
      setCustomRooms((prev) => {
        const next = prev.filter((r) => r.id !== removedId);
        try {
          localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(next));
        } catch (err) {}
        return next;
      });
      if (activeRoomId === removedId) {
        setActiveRoomId("global-community");
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === "streamlearn_active_language_rooms") {
        try {
          const parsed = JSON.parse(e.newValue || "[]");
          setCustomRooms(parsed);
          if (activeRoomId !== "global-community" && !parsed.some((r) => r.id === activeRoomId)) {
            setActiveRoomId("global-community");
          }
        } catch (err) {}
      }
    };

    window.addEventListener("streamlearn_room_removed", handleLocalRoomRemoved);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("streamlearn_room_removed", handleLocalRoomRemoved);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [activeRoomId]);

  // Periodic cleanup check: Closes custom rooms where NO messages have been sent for 30 minutes
  useEffect(() => {
    const checkExpiredRooms = () => {
      const now = Date.now();
      setCustomRooms((prev) => {
        const validRooms = prev.filter((r) => {
          const lastActivityTime = r.lastMessageAt || r.createdAt || 0;
          const isExpired = now - lastActivityTime > ROOM_INACTIVITY_LIMIT_MS;
          if (isExpired && activeRoomId === r.id) {
            setActiveRoomId("global-community");
            toast("Room closed due to 30 mins of no chat messages", { icon: "⏳" });
          }
          return !isExpired;
        });

        if (validRooms.length !== prev.length) {
          try {
            localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(validRooms));
          } catch (e) {}
        }
        return validRooms;
      });
    };

    const interval = setInterval(checkExpiredRooms, 60000); // check every 1 minute
    return () => clearInterval(interval);
  }, [activeRoomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper to render flag for language
  const getFlag = (langName, iconClass = "size-4 shrink-0") => {
    if (!langName || langName.toLowerCase() === "general" || langName.toLowerCase() === "global lounge") {
      return <GlobeIcon className={`${iconClass} inline-block`} />;
    }
    const countryCode = LANGUAGE_TO_FLAG[langName.toLowerCase()];
    if (countryCode) {
      return (
        <img
          src={`https://flagcdn.com/24x18/${countryCode}.png`}
          alt={langName}
          className="w-5 h-3.5 inline-block rounded-xs object-cover shrink-0 shadow-2xs"
        />
      );
    }
    return <span className="text-sm">🗣️</span>;
  };

  // Handle Room Switching (Casual visits DO NOT reset expiration timer)
  const handleSelectRoom = (roomId) => {
    if (roomId === activeRoomId) {
      setSidebarTab(null);
      return;
    }
    setActiveRoomId(roomId);
    setMessages([]);
    setLoading(true);
    setSidebarTab(null);
  };

  // Handle Room Creation (1 Room per Language Rule, synced across all users)
  const handleCreateRoom = async (languageName) => {
    if (!languageName) return;

    const normalizedId = `lang-${languageName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const existing = allRooms.find(
      (r) => r.id === normalizedId || r.name.toLowerCase() === languageName.toLowerCase()
    );

    if (existing) {
      setActiveRoomId(existing.id);
      setShowAddRoomModal(false);
      setSidebarTab(null);
      setRoomSearchQuery("");
      toast.success(`Switched to existing ${existing.name} Room!`);
      return;
    }

    const newRoom = {
      id: normalizedId,
      name: languageName,
      code: languageName.toLowerCase(),
      createdAt: Date.now(),
      lastMessageAt: Date.now(), // 30m grace period to start chatting
    };

    const updatedCustomRooms = [...customRooms.filter((r) => r.id !== normalizedId), newRoom];
    setCustomRooms(updatedCustomRooms);
    try {
      localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(updatedCustomRooms));
    } catch (e) {}

    setActiveRoomId(newRoom.id);
    setShowAddRoomModal(false);
    setSidebarTab(null);
    setRoomSearchQuery("");
    toast.success(`Created ${languageName} Room! (Active for 30m of practice) 🎉`);

    // Create & watch on Stream Chat, then broadcast room_created event to all users
    if (streamClient && streamClient.userID) {
      try {
        const roomChannel = streamClient.channel("livestream", normalizedId, {
          name: `${languageName} Community Chat`,
          language: languageName,
          code: languageName.toLowerCase(),
        });
        await roomChannel.create();
        await roomChannel.watch({ messages: { limit: 20 } });

        // Broadcast to all connected learners over the permanent global-community channel
        const globalCh = streamClient.channel("livestream", "global-community");
        globalCh
          .sendEvent({
            type: "room_created",
            room: newRoom,
          })
          .catch((err) => {
            console.warn("Failed to broadcast room_created event:", err.message);
          });
      } catch (err) {
        console.warn("Error creating Stream room channel:", err.message);
      }
    }
  };

  // Remove an empty / inactive custom room
  const handleRemoveRoom = async (e, roomId) => {
    e.stopPropagation();
    const updated = customRooms.filter((r) => r.id !== roomId);
    setCustomRooms(updated);
    try {
      localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(updated));
    } catch (err) {}

    if (activeRoomId === roomId) {
      setActiveRoomId("global-community");
    }
    toast.success("Room removed from active lounges");

    const isStaff = checkIsAdmin(authUser, authUser) || checkIsSubAdmin(authUser, authUser);
    if (isStaff) {
      try {
        await deleteAdminRoom(roomId);
      } catch (err) {
        console.warn("Backend room deletion notice:", err.message);
      }
    }

    // Broadcast room removal event to other users
    if (streamClient && streamClient.userID) {
      try {
        const globalCh = streamClient.channel("livestream", "global-community");
        globalCh
          .sendEvent({
            type: "room_removed",
            roomId: roomId,
          })
          .catch((err) => {
            console.warn("Failed to broadcast room_removed event:", err.message);
          });
      } catch (err) {}
    }
  };

  // Core fetch logic for online presence
  const fetchOnlineUsers = useCallback(async (client, ch) => {
    if (!client) return;
    let result = [];

    try {
      const response = await client.queryUsers(
        { id: { $ne: "" } },
        { last_active: -1 },
        { presence: true, limit: 100 }
      );
      const allUsers = response?.users || [];
      result = allUsers.filter((u) => u.online === true);
    } catch (err) {
      if (ch) {
        try {
          const watcherResponse = await ch.query({ watchers: { limit: 50, offset: 0 } });
          result = watcherResponse?.watchers || [];
        } catch {}
      }
    }

    const newIds = result.map((u) => u.id).sort().join(",");
    if (newIds !== lastOnlineIdsRef.current) {
      lastOnlineIdsRef.current = newIds;
      setOnlineUsers(result);
    }
  }, []);

  const refreshOnlineUsers = useCallback((client, ch) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchOnlineUsers(client, ch);
    }, 800);
  }, [fetchOnlineUsers]);

  // Connect to active room channel and establish robust real-time synchronization
  useEffect(() => {
    let isSubscribed = true;
    let retryTimeout = null;
    let subscriptions = [];

    const currentUserIdStr = (authUser?._id || authUser?.id)?.toString();

    // If client is not yet connected to Stream with this user, wait in loading state
    if (!streamClient || !streamClient.userID || streamClient.userID !== currentUserIdStr) {
      setLoading(true);
      return;
    }

    const handleIncomingMessage = (event) => {
      const eventChannelId =
        event.channel_id || event.channel?.id || event.cid?.split(":")[1];
      if (eventChannelId && eventChannelId !== activeRoomId) return;

      touchRoomActivity(activeRoomId);

      const incomingMsg = event.message;
      if (!incomingMsg || !incomingMsg.id) return;

      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === incomingMsg.id)) return prev;

        // Replace any matching optimistic temporary message
        const senderId = (incomingMsg.user?.id || incomingMsg.user?._id)?.toString();
        const filtered = prev.filter((m) => {
          if (
            m.__isOptimistic &&
            m.text === incomingMsg.text &&
            m.user?.id?.toString() === senderId
          ) {
            return false;
          }
          return true;
        });

        const updated = [...filtered, incomingMsg];
        return updated.length > 50 ? updated.slice(-50) : updated;
      });
    };

    const handleUpdatedMessage = (event) => {
      const incomingMsg = event.message;
      if (!incomingMsg?.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === incomingMsg.id ? incomingMsg : m))
      );
    };

    const handleDeletedMessage = (event) => {
      const incomingMsg = event.message;
      if (!incomingMsg?.id) return;
      setMessages((prev) => prev.filter((m) => m.id !== incomingMsg.id));
    };

    const handlePresence = () => {
      if (isSubscribed && activeChannelRef.current) {
        refreshOnlineUsers(streamClient, activeChannelRef.current);
      }
    };

    const handleRoomCreated = (event) => {
      const incomingRoom = event.room;
      if (!incomingRoom || !incomingRoom.id) return;
      setCustomRooms((prev) => {
        if (prev.some((r) => r.id === incomingRoom.id)) return prev;
        const next = [...prev, incomingRoom];
        try {
          localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    };

    const handleRoomRemoved = (event) => {
      const removedId = event.roomId;
      if (!removedId) return;
      setCustomRooms((prev) => {
        const next = prev.filter((r) => r.id !== removedId);
        try {
          localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      if (activeRoomId === removedId) {
        setActiveRoomId("global-community");
      }
    };

    const initRoomChat = async (retryCount = 0) => {
      try {
        setLoading(true);

        const roomChannel = streamClient.channel("livestream", activeRoomId, {
          name: `${currentRoom.name} Community Chat`,
        });

        const queryState = await roomChannel.watch({
          messages: { limit: 20 },
        });

        if (!isSubscribed) return;

        setChannel(roomChannel);
        activeChannelRef.current = roomChannel;

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const stateMessages = queryState?.messages || roomChannel.state?.messages || [];
        const freshTodayHistory = stateMessages
          .filter((msg) => {
            const msgTime = new Date(msg.created_at || msg.created_at_dt || Date.now()).getTime();
            return now - msgTime < ONE_DAY_MS;
          })
          .slice(-20);

        setMessages(freshTodayHistory);
        setLoading(false);

        // Fetch presence and remote rooms in background without blocking chat render
        setTimeout(() => {
          if (isSubscribed) {
            fetchOnlineUsers(streamClient, roomChannel);
            fetchRemoteRooms(streamClient);
          }
        }, 150);

        // Channel-level event subscriptions
        subscriptions.push(roomChannel.on("message.new", handleIncomingMessage));
        subscriptions.push(roomChannel.on("message.updated", handleUpdatedMessage));
        subscriptions.push(roomChannel.on("message.deleted", handleDeletedMessage));

        // Client-level fallback & cross-user sync subscriptions
        subscriptions.push(streamClient.on("message.new", handleIncomingMessage));
        subscriptions.push(streamClient.on("user.presence.changed", handlePresence));
        subscriptions.push(streamClient.on("room_created", handleRoomCreated));
        subscriptions.push(streamClient.on("room_removed", handleRoomRemoved));
      } catch (error) {
        console.error("Error initializing Room Chat:", error);
        if (isSubscribed) {
          if (retryCount < 3) {
            retryTimeout = setTimeout(() => {
              if (isSubscribed) {
                initRoomChat(retryCount + 1);
              }
            }, 1200);
          } else {
            toast.error(`Failed to connect to ${currentRoom.name}`);
            setLoading(false);
          }
        }
      }
    };

    initRoomChat();

    return () => {
      isSubscribed = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      // Cleanly unsubscribe each subscription to prevent stale closures and memory leaks
      subscriptions.forEach((sub) => {
        try {
          sub?.unsubscribe?.();
        } catch (e) {}
      });
      subscriptions = [];
      // Note: We deliberately DO NOT call roomChannel.stopWatching() here to avoid
      // server-side watcher deregistration race conditions across page transitions.
    };
  }, [
    streamClient,
    (authUser?._id || authUser?.id)?.toString(),
    activeRoomId,
    currentRoom.name,
    refreshOnlineUsers,
    fetchOnlineUsers,
    fetchRemoteRooms,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !channel) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message too long! Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
      return;
    }

    const messageText = text.trim();
    setText("");
    touchRoomActivity(activeRoomId);

    // Optimistic temporary message rendered immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: messageText,
      user: {
        id: (authUser?._id || authUser?.id)?.toString(),
        name: authUser?.fullName || "You",
        image: authUser?.profilePic,
      },
      created_at: new Date().toISOString(),
      __isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await channel.sendMessage({
        text: messageText,
      });

      if (response?.message) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId && m.id !== response.message.id);
          const updated = [...filtered, response.message];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Could not send message. Please try again.");
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day}/${month} ${time}`;
  };

  const currentUserId = authUser?._id || authUser?.id;
  const currentUserName = authUser?.fullName || "";

  // @Mention system
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef(null);

  // Sorted Online Members:
  // 1. Admin / Creator (Always on top)
  // 2. Sub-Admins (If online, immediately after Admin)
  // 3. Learners (In alphabetical order A-to-Z by name)
  const sortedOnlineUsers = useMemo(() => {
    return [...onlineUsers].sort((a, b) => {
      const isAdminA = checkIsAdmin(a, authUser);
      const isAdminB = checkIsAdmin(b, authUser);

      const isSubAdminA = !isAdminA && checkIsSubAdmin(a, authUser);
      const isSubAdminB = !isAdminB && checkIsSubAdmin(b, authUser);

      const rankA = isAdminA ? 0 : isSubAdminA ? 1 : 2;
      const rankB = isAdminB ? 0 : isSubAdminB ? 1 : 2;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Within the same rank, sort alphabetically A-to-Z by name
      const nameA = (a.name || "").trim();
      const nameB = (b.name || "").trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [onlineUsers, authUser]);

  const mentionSuggestions = mentionQuery
    ? sortedOnlineUsers
        .filter((u) => u.id !== currentUserId && (u.name || "").toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  const handleTextChange = (e) => {
    const val = e.target.value;
    if (val.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Maximum message limit reached (${MAX_MESSAGE_LENGTH} characters)`, { id: "msg-limit-toast" });
      setText(val.slice(0, MAX_MESSAGE_LENGTH));
    } else {
      if (val.length === MAX_MESSAGE_LENGTH && text.length < MAX_MESSAGE_LENGTH) {
        toast.error(`Maximum message limit reached (${MAX_MESSAGE_LENGTH} characters)`, { id: "msg-limit-toast" });
      }
      setText(val);
    }

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const insertMention = (user) => {
    if (!user?.name) return;
    insertMentionByName(user.name);
  };

  const insertMentionByName = (name) => {
    if (!name) return;
    const cleanName = name.trim();
    setText((prev) => {
      if (!prev.trim()) {
        return `@${cleanName} `;
      }
      return `${prev.trim()} @${cleanName} `;
    });
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!showMentions || mentionSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(mentionSuggestions[mentionIndex]);
    } else if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const renderMessageText = (msgText) => {
    if (!msgText) return null;

    const parts = msgText.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionedName = part.slice(1);
        const isMentioningMe = currentUserName && mentionedName.toLowerCase() === currentUserName.toLowerCase();

        if (isMentioningMe) {
          return (
            <span
              key={i}
              className="inline-block px-2 py-0.5 mx-0.5 rounded-md font-bold bg-warning text-warning-content shadow-sm"
              title={`Mentioned you: ${mentionedName}`}
            >
              {part}
            </span>
          );
        }

        return (
          <span
            key={i}
            className="inline-block px-2 py-0.5 mx-0.5 rounded-md font-bold bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-primary-content cursor-pointer transition-colors shadow-2xs"
            title={`Mentioned: ${mentionedName}`}
            onClick={() => insertMentionByName(mentionedName)}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const isMentionedInMsg = (msgText) => {
    if (!msgText || !currentUserName) return false;
    return msgText.toLowerCase().includes(`@${currentUserName.toLowerCase()}`);
  };

  const filteredLanguages = LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(roomSearchQuery.toLowerCase())
  );

  return (
    <div className="card bg-base-100 border border-base-300 shadow-xl overflow-hidden h-full flex-1 flex flex-col relative">
      {/* Clean Chat Top Header */}
      <div className="bg-base-100 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-base-300 flex items-center justify-between gap-2">
        {/* Left: Current Room Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="size-8 sm:size-9 rounded-xl bg-primary text-primary-content flex items-center justify-center shrink-0 shadow-xs">
            {getFlag(currentRoom.name, "size-4 sm:size-5 text-primary-content")}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base md:text-lg leading-tight text-base-content flex items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[130px] sm:max-w-xs md:max-w-sm">{currentRoom.name}</span>
              <span className="badge badge-primary badge-xs text-primary-content font-black">Live</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-base-content/85 truncate font-medium">
              {currentRoom.id === "global-community"
                ? "Global Community Lounge • Open to all learners"
                : `Dedicated practice lounge for ${currentRoom.name}`}
            </p>
          </div>
        </div>

        {/* Right Corner: Clean Icon Buttons (🏠 Rooms + 👥 Online Users) */}
        <div className="flex items-center gap-1.5">
          {/* Rooms Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setSidebarTab((prev) => (prev === "rooms" ? null : "rooms"));
              fetchRemoteRooms(chatClient);
            }}
            className={`btn btn-sm btn-circle transition-colors ${
              sidebarTab === "rooms"
                ? "btn-primary text-primary-content shadow-xs"
                : "btn-ghost border border-base-300 bg-base-200/80 hover:bg-base-300 text-base-content font-bold"
            }`}
            title="Language Lounges"
          >
            <HomeIcon className="size-4" />
          </button>

          {/* Online Users Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setSidebarTab((prev) => (prev === "users" ? null : "users"));
              if (sidebarTab !== "users") refreshOnlineUsers(chatClient, channel);
            }}
            className={`btn btn-sm px-2 sm:px-3 gap-1 sm:gap-1.5 transition-colors ${
              sidebarTab === "users"
                ? "btn-primary text-primary-content shadow-xs"
                : "btn-ghost border border-base-300 bg-base-200/80 hover:bg-base-300 text-base-content font-bold"
            }`}
            title="Online Members"
          >
            <UsersIcon className="size-4" />
            {onlineUsers.length > 0 && (
              <span className="badge badge-info badge-sm font-black text-info-content">
                {onlineUsers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Divided Community Messages Feed (Full Center) */}
        <div className={`flex-1 overflow-y-auto divide-y divide-base-200 bg-base-100 transition-all duration-200 ${sidebarTab ? "sm:mr-0" : ""}`}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 py-12">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="text-xs opacity-60">Connecting to {currentRoom.name}...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-60">
              <MessageSquareIcon className="size-10 text-primary/40" />
              <p className="font-semibold text-sm">No messages yet today in {currentRoom.name}</p>
              <p className="text-xs">
                {currentRoom.id === "global-community"
                  ? "Be the first to say hello in the Global Chat!"
                  : `Be the first to practice ${currentRoom.name} today!`}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const sender = msg.user || {};
              const isMe = sender.id === currentUserId;
              const senderId = sender.id;
              const isMentioned = isMentionedInMsg(msg.text);

              return (
                <div
                  key={msg.id || msg.created_at || index}
                  className={`group relative flex items-start justify-between gap-3 px-3.5 py-1.5 sm:py-2 hover:bg-base-200/50 transition-colors ${
                    isMentioned && !isMe ? "bg-warning/10 border-l-4 border-warning pl-2.5" : ""
                  }`}
                >
                  {/* Left Column: Avatar & Message Body */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* User Avatar (Opens Profile) */}
                    <div
                      className="avatar cursor-pointer hover:opacity-85 transition-opacity shrink-0 mt-0.5"
                      onClick={() => senderId && onSelectUser(senderId)}
                      title={`View ${sender.name || "User"}'s profile`}
                    >
                      <div className="w-8 h-8 rounded-full ring-1 ring-base-300 bg-base-200 overflow-hidden">
                        {sender.image ? (
                          <img src={sender.image} alt={sender.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-content font-bold text-xs">
                            {(sender.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Author Header (Clicking Name Auto-Mentions in text input) */}
                      <div className="flex items-center gap-1.5 leading-none mb-0.5">
                        <UserIcon className="size-3 text-base-content/70 shrink-0" />
                        {(() => {
                          const authorColor = sender.nameColor || (isMe ? authUser?.nameColor : null);
                          return (
                            <span
                              className={`font-bold text-xs sm:text-sm cursor-pointer hover:underline truncate ${
                                authorColor ? getNameClass(authorColor) : getUsernameColor(sender.id || sender.name)
                              }`}
                              style={authorColor ? getNameStyle(authorColor) : {}}
                              onClick={() => {
                                if (!isMe && sender.name) {
                                  insertMentionByName(sender.name);
                                }
                              }}
                              title={isMe ? "You" : `Click to mention @${sender.name}`}
                            >
                              {sender.name || "Learner"}
                            </span>
                          );
                        })()}

                        {/* Role Badges */}
                        {(() => {
                          const isSenderAdmin = checkIsAdmin(sender, isMe ? authUser : null);
                          const isSenderSubAdmin = !isSenderAdmin && checkIsSubAdmin(sender, isMe ? authUser : null);

                          if (isSenderAdmin) {
                            return (
                              <span className="badge badge-primary badge-xs font-black uppercase text-[9px] px-1.5 py-0.5 shadow-2xs gap-0.5 shrink-0" title="Platform Creator & Admin">
                                👑 Creator
                              </span>
                            );
                          }
                          if (isSenderSubAdmin) {
                            return (
                              <span className="badge badge-accent badge-xs font-black px-1 py-0.5 shadow-2xs shrink-0 inline-flex items-center justify-center" title="Sub-Admin">
                                <ShieldCheckIcon className="size-3 fill-current" />
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Message Text Line */}
                      <div className="text-xs sm:text-sm text-base-content leading-snug break-words font-medium">
                        {renderMessageText(msg.text)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timestamp & Action Menu */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <time className="text-[11px] text-base-content/75 font-mono font-medium">
                      {formatDateTime(msg.created_at)}
                    </time>

                    <div className={`dropdown dropdown-end ${index >= messages.length - 2 ? "dropdown-top" : ""}`}>
                      <button
                        type="button"
                        tabIndex={0}
                        className="btn btn-ghost hover:bg-base-300 btn-xs btn-circle text-base-content/70 hover:text-base-content transition-colors"
                        title="Options"
                      >
                        <MoreHorizontalIcon className="size-3.5" />
                      </button>

                      <ul
                        tabIndex={0}
                        className="dropdown-content menu z-50 p-1.5 shadow-2xl bg-base-100 border border-base-300 rounded-2xl w-48 text-xs font-semibold space-y-0.5"
                      >
                        {!isMe && senderId && (
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                if (document.activeElement?.blur) document.activeElement.blur();
                                setReportingTarget({
                                  targetUser: {
                                    _id: senderId,
                                    fullName: sender.name || "Learner",
                                    profilePic: sender.image || "",
                                  },
                                  context: `Global Lounge (${currentRoom.name}) - Message: "${msg.text || ""}"`,
                                });
                              }}
                              className="text-error hover:bg-error/15 hover:text-error rounded-xl gap-2 font-bold py-2"
                            >
                              <ShieldAlertIcon className="size-3.5 text-error" />
                              <span>Report Message</span>
                            </button>
                          </li>
                        )}
                        {!isMe && sender.name && (
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                if (document.activeElement?.blur) document.activeElement.blur();
                                insertMentionByName(sender.name);
                              }}
                              className="hover:bg-base-200 rounded-xl gap-2 py-2"
                            >
                              <MessageSquareIcon className="size-3.5" />
                              <span>Mention @{sender.name}</span>
                            </button>
                          </li>
                        )}
                        {senderId && (
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                if (document.activeElement?.blur) document.activeElement.blur();
                                onSelectUser(senderId);
                              }}
                              className="hover:bg-base-200 rounded-xl gap-2 py-2"
                            >
                              <UserIcon className="size-3.5" />
                              <span>View Profile</span>
                            </button>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Collapsible Right Sidebar Drawer (Only shown when 🏠 or 👥 clicked) */}
        {sidebarTab && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 max-w-full bg-base-100 border-l border-base-300 flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* DRAWER: ROOMS TAB */}
            {sidebarTab === "rooms" && (
              <>
                <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between bg-base-100">
                  <div className="flex items-center gap-2">
                    <HomeIcon className="size-4 text-primary" />
                    <span className="font-bold text-sm text-base-content">Language Lounges</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fetchRemoteRooms(chatClient)}
                      className="btn btn-ghost hover:bg-base-300 btn-xs btn-circle text-base-content hover:text-base-content transition-colors"
                      title="Refresh Lounges"
                    >
                      <RefreshCwIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setSidebarTab(null)}
                      className="btn btn-ghost hover:bg-base-300 btn-xs btn-circle text-base-content hover:text-error transition-colors"
                      title="Close"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 border-b border-base-300 bg-base-200/50">
                  <button
                    onClick={() => {
                      setShowAddRoomModal(true);
                      fetchRemoteRooms(chatClient);
                    }}
                    className="btn btn-primary btn-sm w-full gap-1.5 shadow-sm font-semibold"
                  >
                    <PlusIcon className="size-4" />
                    <span>Create Language Room</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {allRooms.map((room) => {
                    const isActive = room.id === activeRoomId;
                    const isGlobal = room.id === "global-community";

                    return (
                      <div
                        key={room.id}
                        onClick={() => handleSelectRoom(room.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? "bg-primary text-primary-content font-semibold shadow-sm"
                            : "hover:bg-base-200 bg-base-100 border border-base-300/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive
                                ? "bg-base-100 text-primary shadow-xs"
                                : "bg-base-200 text-base-content border border-base-300"
                            }`}
                          >
                            {getFlag(
                              room.name,
                              `size-4 ${isActive ? "text-primary" : "text-base-content"}`
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-sm truncate leading-tight font-bold ${
                                isActive ? "text-primary-content" : "text-base-content"
                              }`}
                            >
                              {room.name}
                            </p>
                            <p
                              className={`text-[11px] font-medium ${
                                isActive ? "text-primary-content/90" : "text-base-content/70"
                              }`}
                            >
                              {isGlobal ? "All languages" : "Language lounge"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <span className="badge badge-sm bg-base-100 text-primary font-black shadow-xs border-none">
                              Active
                            </span>
                          ) : (
                            <span className="badge badge-sm badge-ghost text-[10px] font-bold opacity-75">
                              Join
                            </span>
                          )}
                          {!isGlobal && (checkIsAdmin(authUser, authUser) || checkIsSubAdmin(authUser, authUser)) && (
                            <button
                              type="button"
                              onClick={(e) => handleRemoveRoom(e, room.id)}
                              className={`btn btn-ghost btn-xs btn-circle transition-colors ml-0.5 ${
                                isActive
                                  ? "text-primary-content hover:text-primary-content hover:bg-base-100/20"
                                  : "text-error/70 hover:text-error hover:bg-error/15"
                              }`}
                              title="Delete Lounge"
                            >
                              <Trash2Icon className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* DRAWER: ONLINE USERS TAB */}
            {sidebarTab === "users" && (
              <>
                <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between bg-base-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-base-content">Online Learners</span>
                    <span className="badge badge-info badge-sm font-black text-info-content">
                      {onlineUsers.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setSidebarTab(null)}
                    className="btn btn-ghost hover:bg-base-300 btn-xs btn-circle text-base-content hover:text-error transition-colors"
                    title="Close"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 divide-y divide-base-200">
                  {sortedOnlineUsers.length === 0 ? (
                    <div className="text-center py-8 opacity-60">
                      <UsersIcon className="size-8 mx-auto mb-2 text-primary" />
                      <p className="text-xs text-base-content font-medium">No other learners in room</p>
                    </div>
                  ) : (
                    sortedOnlineUsers.map((user) => {
                      const isMe = user.id === currentUserId;
                      return (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-base-200/80 cursor-pointer transition-colors ${
                            isMe ? "opacity-80" : ""
                          }`}
                          onClick={() => {
                            if (!isMe && user.id) onSelectUser(user.id);
                          }}
                          title={isMe ? "You" : `View ${user.name || "User"}'s profile`}
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-base-300 overflow-hidden ring-1 ring-base-300">
                              {user.image ? (
                                <img
                                  src={user.image}
                                  alt={user.name}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-content font-bold text-sm">
                                  {(user.name || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full ring-2 ring-base-100" />
                          </div>

                          <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                            {(() => {
                              const memberColor = user.nameColor || (isMe ? authUser?.nameColor : null);
                              const isMemberAdmin = checkIsAdmin(user, isMe ? authUser : null);
                              const isMemberSubAdmin = !isMemberAdmin && checkIsSubAdmin(user, isMe ? authUser : null);

                              return (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p
                                    className={`text-sm font-semibold truncate ${
                                      memberColor ? getNameClass(memberColor) : getUsernameColor(user.id || user.name)
                                    }`}
                                    style={memberColor ? getNameStyle(memberColor) : {}}
                                  >
                                    {isMe ? `${user.name || "You"} (You)` : user.name || "Learner"}
                                  </p>
                                  {isMemberAdmin ? (
                                    <span className="badge badge-primary badge-xs font-black uppercase text-[8px] px-1.5 py-0.5 shadow-2xs shrink-0" title="Platform Creator & Admin">
                                      👑 Creator
                                    </span>
                                  ) : isMemberSubAdmin ? (
                                    <span className="badge badge-accent badge-xs font-black px-1 py-0.5 shadow-2xs shrink-0 inline-flex items-center justify-center" title="Sub-Admin">
                                      <ShieldCheckIcon className="size-2.5 fill-current" />
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })()}
                            {!isMe && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  insertMention(user);
                                }}
                                className="btn btn-primary text-primary-content btn-xs font-black px-2 shadow-xs hover:scale-105 transition-transform"
                                title={`Mention @${user.name}`}
                              >
                                @
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pinned Message Composer at bottom */}
      <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] sm:pb-3 bg-base-100 border-t border-base-300 relative shrink-0">
        {showMentions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-base-100 border border-base-300 rounded-xl shadow-xl overflow-hidden z-30 max-h-48 overflow-y-auto">
            <div className="px-3 py-1.5 bg-base-200 text-[11px] font-bold text-base-content uppercase tracking-wider flex items-center justify-between border-b border-base-300">
              <span>Mention Online Learner</span>
              <span className="text-[10px] font-medium text-base-content/70">Tab / Enter to select</span>
            </div>
            {mentionSuggestions.map((user, index) => (
              <div
                key={user.id}
                onClick={() => insertMention(user)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  index === mentionIndex ? "bg-primary/20 text-primary font-bold" : "hover:bg-base-200"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-base-300 overflow-hidden shrink-0">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-content text-xs font-bold">
                      {(user.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold truncate flex-1 text-base-content">{user.name}</span>
                <span className="text-[10px] font-mono text-base-content/60">@{user.name?.replace(/\s+/g, "")}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={`Message ${currentRoom.name} (type @ to mention)...`}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={loading || !channel}
            className="input input-bordered input-sm sm:input-md flex-1 bg-base-200/70 focus:bg-base-100 text-base-content placeholder:text-base-content/60 border-base-300 text-xs sm:text-sm font-medium"
          />
          {(() => {
            const isSendDisabled = !text.trim() || text.length > MAX_MESSAGE_LENGTH || loading || !channel;
            return (
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`btn btn-sm sm:btn-md px-2.5 sm:px-4 gap-1.5 font-bold shadow-sm shrink-0 transition-all ${
                  isSendDisabled
                    ? "bg-base-300 text-base-content/40 cursor-not-allowed border-base-300 hover:bg-base-300 hover:text-base-content/40 shadow-none"
                    : "btn-primary text-primary-content cursor-pointer"
                }`}
              >
                <SendIcon className="size-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            );
          })()}
        </div>
      </form>

      {/* CREATE LANGUAGE ROOM MODAL */}
      {showAddRoomModal && (
        <div className="modal modal-open bg-black/50 z-50 p-2 sm:p-4">
          <div className="modal-box max-w-md w-full mx-auto bg-base-100 p-4 sm:p-6 rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary" />
                <h3 className="font-bold text-lg">Create Language Room</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddRoomModal(false);
                  setRoomSearchQuery("");
                }}
                className="btn btn-ghost hover:bg-base-300 btn-sm btn-circle text-base-content hover:text-error transition-colors"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <p className="text-xs text-base-content/80 mb-4 font-medium">
              Pick a language to open its dedicated practice lounge. Exactly one official room exists per language to unite all learners!
            </p>

            {/* Search Language Input */}
            <label className="input input-bordered input-sm sm:input-md flex items-center gap-2.5 mb-4 bg-base-200/50 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary border-base-300 text-base-content">
              <SearchIcon className="size-4 text-base-content/60 shrink-0" />
              <input
                type="text"
                placeholder="Search language (e.g. Japanese, Spanish, Italian)..."
                className="grow bg-transparent focus:outline-none text-sm text-base-content font-medium"
                value={roomSearchQuery}
                onChange={(e) => setRoomSearchQuery(e.target.value)}
                autoFocus
              />
              {roomSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRoomSearchQuery("")}
                  className="btn btn-ghost hover:bg-base-300 btn-xs btn-circle text-base-content hover:text-error transition-colors"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </label>

            {/* Language Selection List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-base-200">
              {filteredLanguages.length === 0 ? (
                <div className="text-center py-6 text-base-content/60 text-sm font-medium">
                  No matching languages found
                </div>
              ) : (
                filteredLanguages.map((lang) => {
                  const normalizedId = `lang-${lang.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
                  const exists = allRooms.some(
                    (r) => r.id === normalizedId || r.name.toLowerCase() === lang.toLowerCase()
                  );
                  const isCurrent = activeRoomId === normalizedId;

                  return (
                    <div
                      key={lang}
                      onClick={() => handleCreateRoom(lang)}
                      className="flex items-center justify-between p-2.5 hover:bg-base-200 rounded-xl cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        {getFlag(lang, "size-4 text-primary")}
                        <span className="text-sm font-bold text-base-content group-hover:text-primary transition-colors">
                          {lang}
                        </span>
                      </div>

                      {isCurrent ? (
                        <span className="badge badge-primary badge-sm font-black flex items-center gap-1 text-primary-content">
                          <CheckIcon className="size-3" /> Active
                        </span>
                      ) : exists ? (
                        <span className="badge bg-base-200 border border-base-300 text-base-content badge-sm text-xs font-bold">
                          Active Room
                        </span>
                      ) : (
                        <span className="badge badge-outline badge-primary badge-sm text-xs font-bold hover:bg-primary hover:text-primary-content transition-colors">
                          + Create Room
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-action mt-5">
              <button
                onClick={() => {
                  setShowAddRoomModal(false);
                  setRoomSearchQuery("");
                }}
                className="btn btn-sm btn-ghost border border-base-300 text-base-content hover:bg-base-300 w-full font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingTarget && (
        <ReportUserModal
          targetUser={reportingTarget.targetUser}
          context={reportingTarget.context}
          onClose={() => setReportingTarget(null)}
        />
      )}

      {/* ── SENTINEL BOT INFORMATION MODAL ───────────────────────── */}
      {showSentinelInfo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-base-100 border border-base-300 rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-content shadow-lg ring-4 ring-primary/20">
                  <ShieldAlertIcon className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-base-content">StreamGuard Sentinel</h3>
                    <span className="badge badge-primary text-primary-content badge-xs font-black uppercase text-[9px]">BOT</span>
                  </div>
                  <p className="text-xs text-base-content/60">Automated 24/7 Lounge Moderation</p>
                </div>
              </div>
              <button
                onClick={() => setShowSentinelInfo(false)}
                className="btn btn-ghost hover:bg-base-200 text-base-content btn-xs btn-circle"
              >
                ✕
              </button>
            </div>

            <div className="bg-base-200/70 rounded-2xl p-4 text-xs space-y-2 border border-base-300">
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Safety Status: Guarding Lounge</span>
              </div>
              <p className="text-base-content/75 leading-relaxed">
                StreamGuard Sentinel is a permanent automated moderation bot stationed in this lounge 24 hours a day, 7 days a week.
              </p>
              <ul className="list-disc list-inside space-y-1 text-base-content/70 pt-1">
                <li>Maintains an active deterrent presence in all rooms</li>
                <li>Monitors chat message flow for harassment & toxicity</li>
                <li>Safeguards language learners around the clock</li>
                <li>Ensures safety even when human staff are away</li>
              </ul>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowSentinelInfo(false)}
                className="btn btn-sm btn-primary text-primary-content font-bold px-5"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalChat;
