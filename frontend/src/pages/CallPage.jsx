import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
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
  useCall,
  ParticipantView,
  ParticipantsAudio,
  hasScreenShare,
  hasVideo,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import toast from "react-hot-toast";
import PageLoader from "../components/PageLoader";
import { Maximize2, MonitorUp, ShipWheel, RefreshCw } from "lucide-react";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { id: callId } = useParams();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { authUser, isLoading } = useAuthUser();
  const isInitializing = useRef(false);

  const { data: tokenData } = useQuery({
    queryKey: ["streamToken"],
    queryFn: getStreamToken,
    enabled: !!authUser,
  });

  useEffect(() => {
    // Guard: prevent double initialization from React StrictMode / fast re-renders
    if (isInitializing.current) return;

    let cancelled = false;
    let callInstance;

    const initCall = async () => {
      if (!tokenData?.token || !authUser || !callId) return;

      isInitializing.current = true;

      try {
        const user = {
          id: (authUser._id || authUser.id).toString(),
          name: authUser.fullName,
          image: authUser.profilePic,
        };

        const videoClient = StreamVideoClient.getOrCreateInstance({
          apiKey: STREAM_API_KEY,
          user,
          token: tokenData.token,
        });

        callInstance = videoClient.call("default", callId);

        // Only join if not already joined
        if (callInstance.state.callingState !== CallingState.JOINED) {
          await callInstance.join({ create: true });
        }

        // If cleanup ran while we were awaiting, leave immediately
        if (cancelled) {
          callInstance.leave().catch(() => {});
          isInitializing.current = false;
          return;
        }

        // Enable screen share audio support so browser captures tab and system audio
        try {
          if (callInstance.screenShare) {
            callInstance.screenShare.enableScreenShareAudio();
          }
        } catch (screenAudioErr) {
          console.warn("Screen share audio enable error:", screenAudioErr);
        }

        // Automatically enable camera and microphone
        try {
          await callInstance.camera.enable();
        } catch (camErr) {
          console.warn("Camera auto-enable error:", camErr?.message || camErr);
        }

        try {
          await callInstance.microphone.enable();
        } catch (micErr) {
          console.warn("Microphone auto-enable error:", micErr?.message || micErr);
        }

        if (!cancelled) {
          setClient(videoClient);
          setCall(callInstance);
        }
      } catch (error) {
        console.error("Error joining call:", error);
        if (!cancelled) {
          toast.error("Could not join the call. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
        isInitializing.current = false;
      }
    };

    initCall();

    const handleBeforeUnload = () => {
      if (callInstance) {
        callInstance.leave().catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cancelled = true;
      if (callInstance) {
        callInstance.leave().catch((err) => console.error("Error leaving call:", err));
      }
      isInitializing.current = false;
    };
  }, [tokenData?.token, authUser, callId]);

  const location = useLocation();

  if (isLoading || isConnecting) return <PageLoader />;

  if (!client || !call) {
    const currentUserId = (authUser?._id || authUser?.id)?.toString();
    const partnerId =
      location.state?.targetUserId ||
      callId?.split("-").find((id) => id !== currentUserId && id.length >= 20);

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-base-300 p-6 text-center">
        <div className="bg-base-100 border border-base-300 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-4">
          <h2 className="text-xl font-black text-base-content">Call Ended</h2>
          <p className="text-sm text-base-content/70">
            This video call has ended or was disconnected.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-primary btn-sm font-bold flex-1 w-full gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className="size-4" />
              Reconnect Call
            </button>
            <button
              type="button"
              onClick={() => {
                if (partnerId) {
                  navigate(`/chat/${partnerId}`, { replace: true });
                } else {
                  navigate("/friends", { replace: true });
                }
              }}
              className="btn btn-ghost border border-base-300 hover:bg-base-200 btn-sm font-bold flex-1 w-full active:scale-95 transition-all cursor-pointer"
            >
              Return to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallContent callId={callId} authUser={authUser} />
      </StreamCall>
    </StreamVideo>
  );
};

const isParticipantScreenSharing = (p) => {
  if (!p) return false;
  // Must currently publish TrackType.SCREEN_SHARE (3)
  const isPublishingScreen =
    (typeof hasScreenShare === "function" && hasScreenShare(p)) ||
    p.publishedTracks?.includes(3);

  if (!isPublishingScreen) return false;

  // If a stream object exists, ensure its video track is live (not ended)
  if (p.screenShareStream) {
    const tracks = p.screenShareStream.getVideoTracks();
    if (tracks.length > 0 && tracks[0].readyState === "ended") {
      return false;
    }
  }

  return true;
};

const isParticipantVideoActive = (p) => {
  if (!p) return false;
  // Must currently publish TrackType.VIDEO (2)
  const isPublishingVideo =
    (typeof hasVideo === "function" && hasVideo(p)) ||
    p.publishedTracks?.includes(2);

  if (!isPublishingVideo) return false;

  if (p.videoStream) {
    const tracks = p.videoStream.getVideoTracks();
    if (tracks.length > 0 && tracks[0].readyState === "ended") {
      return false;
    }
  }
  return true;
};

const getParticipantKey = (p, trackType) => {
  if (!p) return "none";
  const isScreen = trackType === "screenShareTrack";
  const stream = isScreen ? p.screenShareStream : p.videoStream;
  const isLive = isScreen ? isParticipantScreenSharing(p) : isParticipantVideoActive(p);
  const streamId = stream?.id || (isLive ? "live" : "muted");
  return `${p.sessionId}-${trackType}-${streamId}`;
};

const CallContent = ({ callId, authUser }) => {
  const { useCallCallingState, useLocalParticipant, useRemoteParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const navigate = useNavigate();
  const location = useLocation();
  const call = useCall();
  const hasNavigatedRef = useRef(false);
  const hasEverJoinedRef = useRef(false);

  const handleLeaveCall = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    const currentUserId = (authUser?._id || authUser?.id)?.toString();
    const partnerId =
      location.state?.targetUserId ||
      callId?.split("-").find((id) => id !== currentUserId && id.length >= 20);

    // Teardown call asynchronously in background without blocking navigation
    if (call) {
      call.leave().catch(() => {});
    }

    if (partnerId) {
      navigate(`/chat/${partnerId}`, { replace: true });
    } else {
      navigate("/friends", { replace: true });
    }
  };

  // Ensure screen share audio is enabled for this call instance
  useEffect(() => {
    if (call?.screenShare) {
      try {
        call.screenShare.enableScreenShareAudio();
      } catch (err) {
        console.warn("Could not enable screen share audio on call:", err);
      }
    }
  }, [call]);

  // State to track if local participant is manually enlarged (Google Meet swap)
  const [isLocalSpotlight, setIsLocalSpotlight] = useState(false);

  useEffect(() => {
    if (callingState === CallingState.JOINED) {
      hasEverJoinedRef.current = true;
    } else if (
      hasEverJoinedRef.current &&
      (callingState === CallingState.LEFT || callingState === CallingState.IDLE)
    ) {
      handleLeaveCall();
    }
  }, [callingState]);


  // Deduplicate remote participants by userId, preferring the entry with active video / audio
  const participantMap = new Map();
  for (const p of remoteParticipants) {
    if (!p.userId || p.userId === localParticipant?.userId) continue;
    const existing = participantMap.get(p.userId);
    if (!existing) {
      participantMap.set(p.userId, p);
    } else {
      const existingScore =
        (isParticipantVideoActive(existing) ? 10 : 0) +
        (isParticipantScreenSharing(existing) ? 5 : 0) +
        (existing.audioStream ? 5 : 0) +
        (existing.screenShareAudioStream ? 5 : 0);
      const newScore =
        (isParticipantVideoActive(p) ? 10 : 0) +
        (isParticipantScreenSharing(p) ? 5 : 0) +
        (p.audioStream ? 5 : 0) +
        (p.screenShareAudioStream ? 5 : 0);
      if (newScore >= existingScore) {
        participantMap.set(p.userId, p);
      }
    }
  }
  const uniqueRemoteParticipants = Array.from(participantMap.values());
  const otherParticipant = uniqueRemoteParticipants[0] || null;

  // Screen sharing detection
  const isOtherScreenSharing = isParticipantScreenSharing(otherParticipant);
  const isLocalScreenSharing = isParticipantScreenSharing(localParticipant);
  const hasActiveScreenShare = isOtherScreenSharing || isLocalScreenSharing;
  const presenter = isOtherScreenSharing ? otherParticipant : (isLocalScreenSharing ? localParticipant : null);

  // Automatically return spotlight to normal camera view once screen share ends
  const prevScreenShareRef = useRef(false);
  useEffect(() => {
    if (prevScreenShareRef.current && !hasActiveScreenShare) {
      setIsLocalSpotlight(false);
    }
    prevScreenShareRef.current = hasActiveScreenShare;
  }, [hasActiveScreenShare]);

  let mainParticipant = otherParticipant || localParticipant;
  let mainTrackType = "videoTrack";
  let mainObjectFit = "cover";

  let floatingParticipant = otherParticipant ? localParticipant : null;
  let floatingTrackType = "videoTrack";
  let floatingObjectFit = "cover";

  if (hasActiveScreenShare && presenter) {
    const nonPresenter = presenter === otherParticipant ? localParticipant : otherParticipant;
    if (!isLocalSpotlight) {
      // Default: screen share is main, camera is floating
      mainParticipant = presenter;
      mainTrackType = "screenShareTrack";
      mainObjectFit = "contain";

      floatingParticipant = nonPresenter || null;
      floatingTrackType = "videoTrack";
      floatingObjectFit = "cover";
    } else {
      // Swapped: camera is main, screen share is floating
      mainParticipant = nonPresenter || presenter;
      mainTrackType = "videoTrack";
      mainObjectFit = "cover";

      floatingParticipant = presenter;
      floatingTrackType = "screenShareTrack";
      floatingObjectFit = "contain";
    }
  } else {
    // Standard camera view
    if (otherParticipant && isLocalSpotlight) {
      mainParticipant = localParticipant;
      floatingParticipant = otherParticipant;
    } else {
      mainParticipant = otherParticipant || localParticipant;
      floatingParticipant = otherParticipant ? localParticipant : null;
    }
    mainTrackType = "videoTrack";
    mainObjectFit = "cover";
    floatingTrackType = "videoTrack";
    floatingObjectFit = "cover";
  }

  const handleSwap = () => {
    setIsLocalSpotlight((prev) => !prev);
  };

  return (
    <StreamTheme className="w-full h-full">
      <div className="w-full h-full min-h-[100dvh] max-h-[100dvh] flex flex-col bg-[#14151a] text-white overflow-hidden select-none">
        {/* Continuous audio playback for remote participants */}
        <ParticipantsAudio participants={remoteParticipants} />

        {/* TOP HEADER (Meeting Info & Room Status) */}
        <div className="h-11 sm:h-12 flex-shrink-0 px-2.5 sm:px-6 flex items-center justify-between z-20 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-white/80 truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs">
              {otherParticipant ? `1-on-1 with ${otherParticipant.name || "Partner"}` : "1-on-1 Call"}
            </span>
            <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-white/10 text-white/60 font-medium shrink-0">
              {uniqueRemoteParticipants.length + 1} {uniqueRemoteParticipants.length + 1 === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Screen share status pill if active */}
            {hasActiveScreenShare && (
              <div className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] sm:text-xs font-semibold">
                <MonitorUp className="size-3 sm:size-3.5 animate-pulse" />
                <span className="hidden xs:inline">
                  {isLocalScreenSharing ? "You are presenting" : `${otherParticipant?.name || "Partner"} is presenting`}
                </span>
              </div>
            )}

            <button
              onClick={handleLeaveCall}
              className="btn btn-ghost btn-xs text-white/70 hover:text-white border border-white/10 hover:border-white/20 rounded-full px-2 sm:px-3"
            >
              Exit to Chat
            </button>
          </div>
        </div>


        {/* MAIN MEETING STAGE (Properly bounded with padding and rounded corners) */}
        <div className="flex-1 min-h-0 w-full px-1.5 sm:px-6 pb-1.5 pt-0.5 sm:pb-2 sm:pt-1 flex items-center justify-center relative">
          {/* Main Card: bounded, rounded, with breathing room so it never touches top or bottom bars */}
          <div className="w-full h-full relative rounded-xl sm:rounded-3xl overflow-hidden bg-[#22242c] shadow-2xl flex items-center justify-center border border-white/5">
            {mainParticipant ? (
              <ParticipantView
                key={getParticipantKey(mainParticipant, mainTrackType)}
                participant={mainParticipant}
                trackType={mainTrackType}
                muteAudio={true}
                className="w-full h-full"
                style={{ width: "100%", height: "100%", objectFit: mainObjectFit }}
              />
            ) : (
              <div className="text-white/60 text-sm">Connecting video stream...</div>
            )}

            {/* Waiting for partner indicator when alone in room and not presenting */}
            {!otherParticipant && !hasActiveScreenShare && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/65 backdrop-blur-md px-3.5 sm:px-5 py-1 sm:py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs sm:text-sm font-medium text-white/90 shadow-lg whitespace-nowrap">
                <span className="size-2 rounded-full bg-warning animate-ping inline-block" />
                <span>Waiting for partner to join...</span>
              </div>
            )}

            {/* FLOATING PICTURE-IN-PICTURE (DOCKED IN THE CORNER OF THE CARD) */}
            {floatingParticipant && (
              <div
                onClick={handleSwap}
                className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 z-20 w-24 h-16 sm:w-44 sm:h-28 md:w-60 md:h-38 rounded-lg sm:rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/50 hover:border-primary cursor-pointer transition-all duration-200 hover:scale-[1.02] bg-[#14151a] group"
                title="Click to swap view"
              >
                <ParticipantView
                  key={getParticipantKey(floatingParticipant, floatingTrackType)}
                  participant={floatingParticipant}
                  trackType={floatingTrackType}
                  muteAudio={true}
                  className="w-full h-full"
                  style={{ width: "100%", height: "100%", objectFit: floatingObjectFit, pointerEvents: "none" }}
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-black/75 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1.5 backdrop-blur-xs">
                    <Maximize2 className="size-3" />
                    <span>Click to swap</span>
                  </div>
                </div>

                {/* User Name Badge */}
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/70 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded pointer-events-none">
                  {floatingTrackType === "screenShareTrack"
                    ? "Screen share"
                    : floatingParticipant.isLocalParticipant
                    ? "You"
                    : (floatingParticipant.name || "Partner")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DEDICATED BOTTOM BAR (Clean footer bar, never overlapping the video!) */}
        <div className="h-16 sm:h-20 flex-shrink-0 w-full px-2 sm:px-6 flex items-center justify-between bg-[#14151a] border-t border-white/5 z-30">
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/70 font-bold min-w-[180px]">
            <ShipWheel className="size-4 text-primary" />
            <span>LangBridge Meet</span>
          </div>

          <div className="flex items-center justify-center flex-1 max-w-full overflow-hidden">
            <CallControls onLeave={handleLeaveCall} />
          </div>


          <div className="hidden sm:flex justify-end items-center min-w-[180px]" />
        </div>
      </div>
    </StreamTheme>
  );
};

export default CallPage;


