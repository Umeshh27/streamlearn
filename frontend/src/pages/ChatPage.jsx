import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";
import { VideoIcon } from "lucide-react";

import {
  Channel,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";

import ChatLoader from "../components/ChatLoader";
import CallButton from "../components/CallButton";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatHeader = ({ channel, authUser, handleVideoCall }) => {
  const currentUserId = authUser?._id || authUser?.id;
  const members = channel?.state?.members ? Object.values(channel.state.members) : [];
  const otherMember = members.find((m) => m.user?.id !== currentUserId)?.user;

  const displayName = otherMember?.name || "Language Partner";
  const displayImage = otherMember?.image || "";

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-base-100 border-b border-base-300 w-full">
      {/* LEFT: User Profile Image & Name */}
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-1 overflow-hidden">
            {displayImage ? (
              <img src={displayImage} alt={displayName} className="object-cover w-full h-full" />
            ) : (
              <div className="bg-primary text-primary-content w-full h-full flex items-center justify-center font-bold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-base text-base-content">{displayName}</h3>
          <p className="text-xs text-success flex items-center gap-1">
            <span className="size-2 rounded-full bg-success inline-block" />
            Online
          </p>
        </div>
      </div>

      {/* RIGHT: Video Call Button */}
      <CallButton handleVideoCall={handleVideoCall} />
    </div>
  );
};

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();

  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const { authUser } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser, // this will run only when authUser is available
  });

  useEffect(() => {
    const initChat = async () => {
      if (!tokenData?.token || !authUser) return;

      try {
        console.log("Initializing stream chat client...");

        const client = StreamChat.getInstance(STREAM_API_KEY);

        await client.connectUser(
          {
            id: authUser._id,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          tokenData.token
        );

        const channelId = [authUser._id, targetUserId].sort().join("-");

        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        await currChannel.watch();

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [tokenData, authUser, targetUserId]);

  const handleVideoCall = () => {
    if (channel) {
      const callUrl = `${window.location.origin}/call/${channel.id}`;

      channel.sendMessage({
        text: `I've started a video call. Join me here: ${callUrl}`,
      });

      toast.success("Video call link sent! Redirecting to call room...");
      navigate(`/call/${channel.id}`);
    }
  };

  if (loading || !chatClient || !channel) return <ChatLoader />;

  return (
    <div className="h-[93vh]">
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <div className="w-full h-full relative">
            <Window>
              <ChatHeader channel={channel} authUser={authUser} handleVideoCall={handleVideoCall} />
              <MessageList />
              <MessageComposer />
            </Window>
          </div>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
export default ChatPage;
