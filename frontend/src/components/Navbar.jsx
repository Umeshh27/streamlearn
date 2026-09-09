import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import {
  BellIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  ShipWheelIcon,
  Sparkles,
  ShieldCheckIcon,
} from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import useNotificationCount from "../hooks/useNotificationCount";
import { useProfileModalStore } from "../store/useProfileModalStore";
import { useSidebarStore } from "../store/useSidebarStore";

const Navbar = ({ showSidebarToggle = false }) => {
  const { authUser } = useAuthUser();
  const { openProfile } = useProfileModalStore();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const location = useLocation();
  const isChatPage = location.pathname?.startsWith("/chat");

  const { unreadCount } = useNotificationCount();
  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-14 sm:h-16 flex items-center shrink-0">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between w-full">
          {/* LEFT SIDE: TOGGLE SIDEBAR BUTTON & LOGO */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            {showSidebarToggle && (
              <button
                type="button"
                onClick={toggleSidebar}
                className="btn btn-ghost hover:bg-base-300 active:scale-95 btn-circle btn-xs sm:btn-sm text-base-content hover:text-base-content transition-all shrink-0 cursor-pointer select-none"
                title={isOpen ? "Collapse Navigation" : "Expand Navigation"}
                aria-label="Toggle navigation sidebar"
              >
                {isOpen ? (
                  <PanelLeftCloseIcon className="size-4 sm:size-5" />
                ) : (
                  <PanelLeftIcon className="size-4 sm:size-5 text-primary" />
                )}
              </button>
            )}

            {/* Brand Logo: Cleanly visible across viewports, hidden on desktop only if static sidebar is expanded */}
            <Link
              to="/"
              className={`items-center gap-1.5 sm:gap-2 min-w-0 ${
                isOpen && showSidebarToggle && !isChatPage ? "flex md:hidden" : "flex"
              }`}
            >
              <ShipWheelIcon className="size-6 sm:size-8 text-primary shrink-0" />
              <span className="text-base sm:text-xl md:text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider drop-shadow-xs truncate">
                Streamify
              </span>
            </Link>
          </div>

          {/* RIGHT SIDE ACTIONS: AI Tutor, Bell, Staff Portal, Theme, Avatar, Logout */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
            <Link
              to="/ai-tutor"
              className="btn btn-xs sm:btn-sm btn-primary text-primary-content gap-1 font-bold shadow-xs hover:scale-105 transition-transform shrink-0 px-2 sm:px-3"
              title="AI Voice Tutor"
            >
              <Sparkles className="size-3.5 sm:size-4 animate-pulse" />
              <span className="hidden sm:inline text-xs sm:text-sm">AI Tutor</span>
            </Link>

            <Link
              to="/notifications"
              className="btn btn-ghost hover:bg-base-300 btn-circle btn-xs sm:btn-sm text-base-content hover:text-base-content transition-colors relative shrink-0"
              title="Notifications"
            >
              <BellIcon className="size-4 sm:size-5" />
              {unreadCount > 0 && (
                <span className="badge badge-primary text-primary-content font-black badge-xs absolute -top-1 -right-1 text-[9px] min-w-[1.1rem] h-4 px-1 flex items-center justify-center border border-base-200 shadow-sm animate-pulse z-10 pointer-events-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Staff Portal Badge for Appointed Sub-Admins & Admins */}
            {(authUser?.role === "subadmin" ||
              authUser?.role === "admin" ||
              authUser?.email?.toLowerCase() === "umeshalla73@gmail.com") && (
              <Link
                to="/admin"
                className="btn btn-xs sm:btn-sm btn-warning text-warning-content gap-1 font-bold text-xs shadow-xs shrink-0 px-2 sm:px-2.5"
                title="Staff Portal (Sub-Admin & Admin Command Center)"
              >
                <ShieldCheckIcon className="size-3 sm:size-3.5" />
                <span className="hidden md:inline">Staff Portal</span>
              </Link>
            )}

            <div className="shrink-0">
              <ThemeSelector />
            </div>

            {/* Clickable Profile Avatar */}
            <div
              className="avatar cursor-pointer hover:opacity-85 transition-opacity shrink-0"
              onClick={() => {
                const myId = authUser?._id || authUser?.id;
                if (myId) openProfile(myId);
              }}
              title="View & Edit Profile"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full ring-2 ring-primary/60 hover:ring-primary overflow-hidden">
                {authUser?.profilePic ? (
                  <img src={authUser.profilePic} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold text-xs sm:text-sm">
                    {authUser?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </div>

            {/* Logout button */}
            <button
              className="btn btn-ghost hover:bg-base-300 btn-circle btn-xs sm:btn-sm text-base-content hover:text-error transition-colors shrink-0"
              onClick={logoutMutation}
              title="Log Out"
            >
              <LogOutIcon className="size-4 sm:size-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
