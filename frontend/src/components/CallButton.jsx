import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <button
      onClick={handleVideoCall}
      className="btn btn-success btn-xs sm:btn-sm text-success-content flex items-center gap-1.5 shadow-sm hover:scale-105 transition-all shrink-0 px-2 sm:px-3"
      title="Start Video Call"
    >
      <VideoIcon className="size-4" />
      <span className="font-medium text-xs hidden sm:inline">Video Call</span>
    </button>
  );
}

export default CallButton;
