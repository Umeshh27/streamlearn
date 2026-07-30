import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall }) {
  return (
    <button
      onClick={handleVideoCall}
      className="btn btn-success btn-sm text-white flex items-center gap-2 shadow-sm hover:scale-105 transition-all"
      title="Start Video Call"
    >
      <VideoIcon className="size-4" />
      <span className="font-medium text-xs">Video Call</span>
    </button>
  );
}

export default CallButton;
