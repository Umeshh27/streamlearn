import { BellIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router";

function NoNotificationsFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      <div className="size-14 sm:size-16 rounded-full bg-base-200 border border-base-300 flex items-center justify-center mb-3 sm:mb-4 shadow-xs">
        <BellIcon className="size-6 sm:size-8 text-base-content/40" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-base-content mb-1">No notifications yet</h3>
      <p className="text-xs sm:text-sm text-base-content/70 max-w-sm leading-relaxed mb-5">
        When you receive friend requests or new learning connections, they'll appear here.
      </p>
      <Link
        to="/friends"
        className="btn btn-primary btn-sm text-primary-content font-bold gap-1.5 shadow-xs h-9 sm:h-8 px-4 active:scale-95 transition-all"
      >
        <UsersIcon className="size-4" />
        <span>Find Language Partners</span>
      </Link>
    </div>
  );
}

export default NoNotificationsFound;
