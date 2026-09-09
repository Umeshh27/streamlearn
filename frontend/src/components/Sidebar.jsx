import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, HomeIcon, ShipWheelIcon, UsersIcon, Sparkles, XIcon, ShieldCheckIcon } from "lucide-react";
import { useProfileModalStore } from "../store/useProfileModalStore";
import useNotificationCount from "../hooks/useNotificationCount";

const Sidebar = ({ onNavigateMobile }) => {
  const { authUser } = useAuthUser();
  const { openProfile } = useProfileModalStore();
  const { unreadCount } = useNotificationCount();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLinkClick = () => {
    if (typeof onNavigateMobile === "function" && window.innerWidth < 768) {
      onNavigateMobile();
    }
  };

  return (
    <aside className="w-64 bg-base-200 border-r border-base-300 flex flex-col h-full max-h-full shrink-0 z-20 overflow-y-auto">
      {/* BRAND HEADER & MOBILE CLOSE BUTTON */}
      <div className="p-4 sm:p-5 border-b border-base-300 flex items-center justify-between">
        <Link to="/" onClick={handleLinkClick} className="flex items-center gap-2.5 min-w-0">
          <ShipWheelIcon className="size-8 sm:size-9 text-primary shrink-0" />
          <span className="text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider truncate">
            LangBridge
          </span>
        </Link>
        {/* Close Button on Mobile */}
        <button
          type="button"
          onClick={onNavigateMobile}
          className="btn btn-ghost btn-circle btn-sm md:hidden text-base-content/70 hover:text-base-content hover:bg-base-300 transition-colors"
          title="Close Navigation"
          aria-label="Close sidebar"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 p-4 space-y-1.5">
        <Link
          to="/"
          onClick={handleLinkClick}
          className={`btn justify-start w-full gap-3 px-3 font-bold transition-colors ${
            currentPath === "/" ? "btn-primary text-primary-content shadow-xs" : "btn-ghost text-base-content"
          }`}
        >
          <HomeIcon className="size-5" />
          <span>Home</span>
        </Link>

        <Link
          to="/ai-tutor"
          onClick={handleLinkClick}
          className={`btn justify-start w-full gap-3 px-3 font-bold transition-colors ${
            currentPath === "/ai-tutor" || currentPath === "/voice-assistant"
              ? "btn-primary text-primary-content shadow-xs"
              : "btn-ghost text-base-content"
          }`}
        >
          <Sparkles className="size-5 text-warning" />
          <span className="flex-1 text-left">AI Voice Tutor</span>
          <span className="badge badge-secondary badge-xs uppercase font-extrabold px-1.5 py-0.5">
            NEW
          </span>
        </Link>

        <Link
          to="/friends"
          onClick={handleLinkClick}
          className={`btn justify-start w-full gap-3 px-3 font-bold transition-colors ${
            currentPath === "/friends" ? "btn-primary text-primary-content shadow-xs" : "btn-ghost text-base-content"
          }`}
        >
          <UsersIcon className="size-5 opacity-70" />
          <span>Friends</span>
        </Link>

        <Link
          to="/notifications"
          onClick={handleLinkClick}
          className={`btn justify-start w-full gap-3 px-3 font-bold transition-colors ${
            currentPath === "/notifications" ? "btn-primary text-primary-content shadow-xs" : "btn-ghost text-base-content"
          }`}
        >
          <BellIcon className="size-5 opacity-70" />
          <span className="flex-1 text-left">Notifications</span>
          {unreadCount > 0 && (
            <span className="badge badge-primary text-primary-content font-black badge-sm animate-pulse ml-auto">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Staff Portal for Sub-Admins and Admins */}
        {(authUser?.role === "subadmin" ||
          authUser?.role === "admin" ||
          authUser?.email?.toLowerCase() === "umeshalla73@gmail.com") && (
          <Link
            to="/admin"
            onClick={handleLinkClick}
            className={`btn justify-start w-full gap-3 px-3 font-bold transition-colors ${
              currentPath === "/admin"
                ? "btn-warning text-warning-content shadow-xs"
                : "btn-ghost text-warning hover:bg-warning/10"
            }`}
          >
            <ShieldCheckIcon className="size-5" />
            <span>Staff Portal</span>
          </Link>
        )}
      </nav>

      {/* USER PROFILE FOOTER */}
      <div
        className="p-4 border-t border-base-300 mt-auto cursor-pointer hover:bg-base-300/50 transition-colors select-none"
        onClick={() => {
          const myId = authUser?._id || authUser?.id;
          if (myId) {
            openProfile(myId);
            handleLinkClick();
          }
        }}
        title="View & Edit Profile"
      >
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/40">
              {authUser?.profilePic ? (
                <img src={authUser.profilePic} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold text-sm">
                  {authUser?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{authUser?.fullName}</p>
            <p className="text-xs text-base-content/60 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success inline-block" />
              <span>Online</span>
              <span className="opacity-40">•</span>
              <span className="hover:underline text-primary font-medium">Edit Profile</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
