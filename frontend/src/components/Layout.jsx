import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import UserProfileModal from "./UserProfileModal";
import { useProfileModalStore } from "../store/useProfileModalStore";
import { useSidebarStore } from "../store/useSidebarStore";

const Layout = ({ children, showSidebar = false }) => {
  const { selectedUserId, closeProfile } = useProfileModalStore();
  const { isOpen, closeSidebar } = useSidebarStore();

  return (
    <div className="app-viewport-container bg-base-100 flex overflow-hidden relative">
      {showSidebar && (
        <>
          {/* Mobile Backdrop: smooth opacity fade */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200 ${
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeSidebar}
            aria-hidden="true"
          />

          {/* Sidebar Drawer: Always mounted in DOM for instant 0ms GPU slide & zero remount lag */}
          <div
            className={`fixed inset-y-0 left-0 z-50 md:static md:z-auto shrink-0 transition-transform duration-200 ease-out md:transition-[width,opacity] ${
              isOpen
                ? "translate-x-0 md:w-64 md:opacity-100"
                : "-translate-x-full pointer-events-none md:w-0 md:opacity-0 md:overflow-hidden md:pointer-events-none"
            }`}
          >
            <Sidebar onNavigateMobile={closeSidebar} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full max-h-full overflow-hidden relative">
        <Navbar showSidebarToggle={showSidebar} />

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-auto flex flex-col">
          {children}
        </main>
      </div>

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={closeProfile}
        />
      )}
    </div>
  );
};

export default Layout;
