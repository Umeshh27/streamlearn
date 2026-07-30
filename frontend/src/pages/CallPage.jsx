import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken } from "../lib/api";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  StreamTheme,
  CallingState,
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { authUser, isLoading } = useAuthUser();

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    let videoClient;
    let callInstance;

    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) return;

      try {
        console.log("Initializing Stream video client...");

        const user = {
          id: authUser._id || authUser.id,
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        callInstance = videoClient.call("default", callId);

        if (callInstance.state.callingState !== CallingState.JOINED) {
          await callInstance.join({ create: true });
        }

        console.log("Joined call successfully");

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        toast.error("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();

    return () => {
      if (callInstance) {
        callInstance.leave().catch((err) => console.error("Error leaving call:", err));
      }
    };
  }, [tokenData?.token, authUser?._id, callId]);

  if (isLoading || isConnecting) return <PageLoader />;

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-base-300">
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {client && call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent callId={callId} authUser={authUser} />
            </StreamCall>
          </StreamVideo>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p>Could not initialize call. Please refresh or try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CallContent = ({ callId, authUser }) => {
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const navigate = useNavigate();

  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      const currentUserId = authUser?._id || authUser?.id;
      const targetUserId = callId?.split("-").find((id) => id !== currentUserId);

      if (targetUserId) {
        navigate(`/chat/${targetUserId}`);
      } else {
        navigate(-1);
      }
    }
  }, [callingState, navigate, callId, authUser]);

  // Deduplicate participants by userId so each user gets exactly 1 box
  const uniqueParticipants = [];
  const seenUserIds = new Set();

  for (const p of participants) {
    if (p.userId && !seenUserIds.has(p.userId)) {
      seenUserIds.add(p.userId);
      uniqueParticipants.push(p);
    }
  }

  return (
    <StreamTheme>
      <div className="w-full h-full flex flex-col items-center justify-between p-4 bg-base-300">
        <div className="flex-1 w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center my-auto">
          {uniqueParticipants.map((participant) => (
            <div
              key={participant.userId}
              className="relative w-full h-[65vh] rounded-2xl overflow-hidden shadow-2xl bg-neutral"
            >
              <ParticipantView participant={participant} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        <div className="py-4">
          <CallControls />
        </div>
      </div>
    </StreamTheme>
  );
};

export default CallPage;
