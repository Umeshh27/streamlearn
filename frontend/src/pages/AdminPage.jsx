import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
  UserIcon,
  UserCheckIcon,
  ClockIcon,
  AlertTriangleIcon,
  BanIcon,
  RefreshCwIcon,
  SearchIcon,
  RadioIcon,
  ActivityIcon,
  DatabaseIcon,
  ServerIcon,
  KeyIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Trash2Icon,
  SparklesIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  SendIcon,
  FlagIcon,
  UserXIcon,
  FileTextIcon,
  CrownIcon,
  GlobeIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import {
  getAdminStats,
  getAdminUsers,
  applyAdminModeration,
  deleteAdminUser,
  updateAdminUserRole,
  getAdminReports,
  resolveAdminReport,
  broadcastAdminAnnouncement,
  getAdminRooms,
  deleteAdminRoom,
} from "../lib/api";
import ThemeSelector from "../components/ThemeSelector";

const AdminPage = () => {
  const { authUser } = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Role derivation
  const isCreator = authUser?.email?.toLowerCase() === "umeshalla73@gmail.com";
  const userRole = isCreator ? "admin" : (authUser?.role || "user");
  const isAdmin = isCreator || userRole === "admin";
  const isSubAdmin = userRole === "subadmin";

  // Active Tab
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (isSubAdmin && ["broadcast", "system"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [isSubAdmin, activeTab]);

  // User Directory State
  const [userSearch, setUserSearch] = useState("");
  const [userFilterStatus, setUserFilterStatus] = useState("all");
  const [userPage, setUserPage] = useState(1);

  // Reports Queue State
  const [reportFilterStatus, setReportFilterStatus] = useState("all");

  // Moderation Action Modal State
  const [moderationModal, setModerationModal] = useState({
    isOpen: false,
    user: null,
    action: "", // 'timeout_5' | 'timeout_10' | 'ban' | 'unban' | 'clear_strikes' | 'force_verify' | 'clear_profile'
    reason: "",
    reportId: null,
  });

  // Delete User Confirm Modal State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastRoom, setBroadcastRoom] = useState("global-community");

  // Monitored Rooms State
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilterStatus, setRoomFilterStatus] = useState("all"); // 'all' | 'active' | 'inactive'
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState(null);

  // Live System Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  });

  // ─── 1. FETCH ADMIN STATS ──────────────────────────────────────────
  const {
    data: statsData,
    isRefetching: isRefetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["adminStats"],
    queryFn: getAdminStats,
    refetchInterval: 30000, // Background poll every 30s
  });

  // ─── 2. FETCH REPORTS QUEUE ────────────────────────────────────────
  const {
    data: reportsData,
    isLoading: isLoadingReports,
    isRefetching: isRefetchingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["adminReports", reportFilterStatus],
    queryFn: () => getAdminReports({ status: reportFilterStatus }),
    refetchInterval: 20000,
  });

  // ─── 3. FETCH USER DIRECTORY ───────────────────────────────────────
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isRefetching: isRefetchingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["adminUsers", userSearch, userFilterStatus, userPage],
    queryFn: () =>
      getAdminUsers({
        search: userSearch,
        status: userFilterStatus,
        page: userPage,
        limit: 25,
      }),
  });

  // ─── 4. FETCH MONITORED ROOMS ──────────────────────────────────────
  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    isRefetching: isRefetchingRooms,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ["adminRooms"],
    queryFn: getAdminRooms,
    refetchInterval: 20000,
  });

  // ─── 5. MUTATIONS ──────────────────────────────────────────────────
  const moderateMutation = useMutation({
    mutationFn: applyAdminModeration,
    onSuccess: (data) => {
      toast.success(data.message || "Moderation action applied!");
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      setModerationModal({ isOpen: false, user: null, action: "", reason: "", reportId: null });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to execute moderation action");
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: resolveAdminReport,
    onSuccess: (data) => {
      toast.success(data.message || "Report updated");
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to resolve report");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: (data) => {
      toast.success(data.message || "User permanently deleted");
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      setDeleteConfirmUser(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete user");
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: broadcastAdminAnnouncement,
    onSuccess: (data) => {
      toast.success(data.message || "Announcement broadcast successfully!");
      setBroadcastMsg("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send broadcast");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: updateAdminUserRole,
    onSuccess: (data) => {
      toast.success(data.message || "Staff role updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update staff role");
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: deleteAdminRoom,
    onSuccess: (data, variables) => {
      const deletedRoomId = variables || deleteConfirmRoom?.id;
      toast.success(data.message || "Room deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminRooms"] });

      // Clean from localStorage immediately so Admin's GlobalChat doesn't hold onto it
      try {
        const saved = localStorage.getItem("streamlearn_active_language_rooms");
        if (saved) {
          const parsed = JSON.parse(saved);
          const cleaned = parsed.filter(
            (r) => r.id !== deletedRoomId && r.id !== deleteConfirmRoom?.id
          );
          localStorage.setItem("streamlearn_active_language_rooms", JSON.stringify(cleaned));
        }
      } catch {
        // Ignore localStorage parse or access error
      }

      // Dispatch event to inform other open tabs/windows
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("streamlearn_room_removed", {
            detail: { roomId: deletedRoomId || deleteConfirmRoom?.id },
          })
        );
      }

      setDeleteConfirmRoom(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to delete room");
    },
  });

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  // Quick Trigger for Moderation Modal
  const openModerationModal = (user, action, defaultReason = "", reportId = null) => {
    setModerationModal({
      isOpen: true,
      user,
      action,
      reason: defaultReason,
      reportId,
    });
  };

  const handleExecuteModeration = () => {
    if (!moderationModal.user || !moderationModal.action) return;
    moderateMutation.mutate({
      userId: moderationModal.user._id,
      action: moderationModal.action,
      reason: moderationModal.reason,
      reportId: moderationModal.reportId,
    });
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchReports();
    refetchUsers();
    refetchRooms();
    toast.success("Admin data refreshed!");
  };

  const stats = statsData?.stats || {};
  const services = statsData?.services || {};
  const reportsList = reportsData?.reports || [];
  const usersList = usersData?.users || [];
  const roomsList = roomsData?.rooms || [];
  const pendingReportsCount = stats.pendingReportsCount || reportsList.filter((r) => r.status === "pending").length;

  const filteredRooms = useMemo(() => {
    return roomsList.filter((r) => {
      const q = roomSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q));
      const matchesStatus =
        roomFilterStatus === "all" ||
        (roomFilterStatus === "active" && !r.isInactive) ||
        (roomFilterStatus === "inactive" && r.isInactive);
      return matchesSearch && matchesStatus;
    });
  }, [roomsList, roomSearch, roomFilterStatus]);

  const activeRoomsCount = roomsList.filter((r) => !r.isInactive).length;
  const inactiveRoomsCount = roomsList.filter((r) => r.isInactive).length;

  return (
    <div className="min-h-screen w-full flex-1 flex flex-col bg-base-100 text-base-content pb-16">
      {/* ── TOP COMMAND HEADER ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-base-200/90 backdrop-blur-md border-b border-base-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-primary to-secondary text-primary-content shadow-lg ring-4 ring-primary/10 shrink-0">
              <ShieldAlertIcon className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-black tracking-tight flex items-center gap-1.5 min-w-0">
                  <span className="whitespace-nowrap font-black">LangBridge</span>
                  <span className="text-base-content/80 font-bold truncate">Command Center</span>
                  <span
                    className={`badge badge-xs sm:badge-sm font-bold uppercase tracking-wider text-[9px] sm:text-[10px] flex items-center gap-1 shrink-0 ${
                      isAdmin
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-sm border-none"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm border-none"
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <CrownIcon className="size-2.5 sm:size-3 fill-current" />
                        <span>Creator</span>
                      </>
                    ) : (
                      <ShieldCheckIcon className="size-3 sm:size-3.5 fill-current" />
                    )}
                  </span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs text-base-content/60 flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">
                  {isAdmin
                    ? "Platform Creator"
                    : "Shield Staff"}
                  : {authUser?.email || "umeshalla73@gmail.com"}
                </span>
                <span>•</span>
                <span className="font-mono text-primary font-semibold shrink-0">{currentTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeSelector />

            <button
              onClick={handleRefreshAll}
              disabled={isRefetchingStats || isRefetchingReports || isRefetchingUsers || isRefetchingRooms}
              className="btn btn-xs sm:btn-sm bg-base-100 hover:bg-base-200 border border-base-300 text-base-content font-bold gap-1 sm:gap-1.5 text-xs px-2.5 sm:px-3 shadow-2xs transition-all"
              title="Refresh all metrics"
            >
              <RefreshCwIcon
                className={`size-3 sm:size-3.5 ${
                  isRefetchingStats || isRefetchingReports || isRefetchingUsers || isRefetchingRooms ? "animate-spin text-primary" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => navigate("/")}
              className="btn btn-xs sm:btn-sm bg-base-100 hover:bg-base-200 border border-base-300 hover:border-primary text-base-content hover:text-primary gap-1 sm:gap-1.5 text-xs font-bold px-2.5 sm:px-3 shadow-2xs transition-all"
            >
              <ArrowLeftIcon className="size-3 sm:size-3.5" />
              <span>Back to App</span>
            </button>
          </div>
        </div>

        {/* ── TABS NAVIGATION ────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 border-t border-base-300/50">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {/* Overview Tab (Sub-Admins and Admins) */}
            {(isAdmin || isSubAdmin) && (
              <button
                onClick={() => setActiveTab("overview")}
                className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all ${
                  activeTab === "overview"
                    ? "btn-primary text-primary-content shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <ActivityIcon className="size-4" />
                <span>Overview</span>
              </button>
            )}

            {/* Reports Queue Tab (All Staff: Monitors, Sub-Admins, Admins) */}
            <button
              onClick={() => setActiveTab("reports")}
              className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all relative ${
                activeTab === "reports"
                  ? "btn-primary text-primary-content shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <FlagIcon className="size-4" />
              <span>Reports Queue</span>
              {pendingReportsCount > 0 && (
                <span className="badge badge-error text-error-content badge-xs font-bold px-1.5 py-0.5">
                  {pendingReportsCount}
                </span>
              )}
            </button>

            {/* User Directory Tab (Sub-Admins and Admins) */}
            {(isAdmin || isSubAdmin) && (
              <button
                onClick={() => setActiveTab("users")}
                className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all ${
                  activeTab === "users"
                    ? "btn-primary text-primary-content shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <UsersIcon className="size-4" />
                <span>User Directory</span>
                {stats.totalUsers > 0 && (
                  <span className="badge badge-ghost badge-xs font-medium opacity-70">
                    {stats.totalUsers}
                  </span>
                )}
              </button>
            )}

            {/* Monitor Rooms Tab (Sub-Admins and Admins) */}
            {(isAdmin || isSubAdmin) && (
              <button
                onClick={() => setActiveTab("rooms")}
                className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all relative ${
                  activeTab === "rooms"
                    ? "btn-primary text-primary-content shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <GlobeIcon className="size-4" />
                <span>Monitor Rooms</span>
                {inactiveRoomsCount > 0 ? (
                  <span
                    className="badge badge-warning text-warning-content badge-xs font-bold px-1.5 py-0.5"
                    title={`${inactiveRoomsCount} inactive rooms (>30m)`}
                  >
                    {inactiveRoomsCount}
                  </span>
                ) : roomsList.length > 0 ? (
                  <span className="badge badge-ghost badge-xs font-medium opacity-70">
                    {roomsList.length}
                  </span>
                ) : null}
              </button>
            )}

            {/* Broadcast Tab (Head Admin strictly) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("broadcast")}
                className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all ${
                  activeTab === "broadcast"
                    ? "btn-primary text-primary-content shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <RadioIcon className="size-4" />
                <span>Broadcast</span>
              </button>
            )}

            {/* System Infra Tab (Head Admin strictly) */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab("system")}
                className={`btn btn-sm text-xs font-bold rounded-xl gap-2 transition-all ${
                  activeTab === "system"
                    ? "btn-primary text-primary-content shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <ServerIcon className="size-4" />
                <span>AI & Infra</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW METRICS                                      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick System Alert Banner if Pending Reports */}
            {pendingReportsCount > 0 && (
              <div className="alert alert-warning shadow-md rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangleIcon className="size-6 text-warning-content shrink-0" />
                  <div>
                    <h3 className="font-black text-sm">Action Required: Pending Reports</h3>
                    <p className="text-xs opacity-90">
                      There are {pendingReportsCount} learner reports waiting in the moderation queue.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("reports")}
                  className="btn btn-sm bg-base-100 text-base-content hover:bg-base-200 border-none font-bold shrink-0"
                >
                  Inspect Queue
                </button>
              </div>
            )}

            {/* Platform Primary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
              <div className="bg-base-200 border border-base-300 rounded-2xl p-3 sm:p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Total Users</span>
                  <UsersIcon className="size-3.5 sm:size-4 text-primary" />
                </div>
                <div className="text-xl sm:text-3xl font-black text-base-content">
                  {stats.totalUsers ?? "—"}
                </div>
                <div className="text-[11px] text-success font-semibold flex items-center gap-1">
                  <span>+{stats.newUsersToday ?? 0} today</span>
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
                  <UserCheckIcon className="size-4 text-success" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-base-content">
                  {stats.verifiedUsers ?? "—"}
                </div>
                <div className="text-[11px] text-base-content/50 font-medium">
                  {stats.totalUsers ? Math.round(((stats.verifiedUsers || 0) / stats.totalUsers) * 100) : 0}% of platform
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Today</span>
                  <ActivityIcon className="size-4 text-info" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-base-content">
                  {stats.newUsersToday ?? 0}
                </div>
                <div className="text-[11px] text-base-content/50 font-medium">New signups</div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-xs font-bold uppercase tracking-wider">In Cooldown</span>
                  <ClockIcon className="size-4 text-warning" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-base-content">
                  {stats.suspendedUsers ?? 0}
                </div>
                <div className="text-[11px] text-base-content/50 font-medium">5m / 10m timeouts</div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-xs font-bold uppercase tracking-wider">Banned</span>
                  <BanIcon className="size-4 text-error" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-error">
                  {stats.bannedUsers ?? 0}
                </div>
                <div className="text-[11px] text-base-content/50 font-medium">Strike 3 terminated</div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-2xl p-4 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-base-content/60">
                  <span className="text-xs font-bold uppercase tracking-wider">Reports</span>
                  <FlagIcon className="size-4 text-secondary" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-secondary">
                  {pendingReportsCount}
                </div>
                <div className="text-[11px] text-base-content/50 font-medium">Pending action</div>
              </div>
            </div>

            {/* Infrastructure Health Bar */}
            <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-base-content/70 flex items-center gap-2">
                  <ServerIcon className="size-4 text-primary" />
                  Live Platform Health & Failover Architecture
                </h3>
                <span className="badge badge-success badge-sm font-bold text-[10px]">All Operational</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-base-100 border border-base-300/80 rounded-2xl p-3 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/15 text-success">
                    <DatabaseIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content">MongoDB Atlas</p>
                    <p className="text-[11px] text-success font-semibold capitalize flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success animate-pulse" />
                      {services.mongo || "Connected"}
                    </p>
                  </div>
                </div>

                <div className="bg-base-100 border border-base-300/80 rounded-2xl p-3 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-info/15 text-info">
                    <KeyIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content">Groq AI Failover Pool</p>
                    <p className="text-[11px] text-info font-semibold">
                      {services.groqKeysCount ?? 2} Rotational Keys Active
                    </p>
                  </div>
                </div>

                <div className="bg-base-100 border border-base-300/80 rounded-2xl p-3 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                    <ActivityIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content">Redis TTS Cache</p>
                    <p className="text-[11px] text-success font-semibold capitalize flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success animate-pulse" />
                      {services.redis || "Ready"}
                    </p>
                  </div>
                </div>

                <div className="bg-base-100 border border-base-300/80 rounded-2xl p-3 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-secondary/15 text-secondary">
                    <RadioIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-base-content">Stream Video & Chat</p>
                    <p className="text-[11px] text-success font-semibold capitalize flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-success animate-pulse" />
                      {services.stream || "Configured"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Learning Languages */}
              <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black tracking-wide text-base-content flex items-center justify-between">
                  <span>Top Learning Languages</span>
                  <span className="text-xs text-base-content/50 font-normal">Active learner count</span>
                </h3>
                <div className="space-y-2.5">
                  {stats.learningLanguages && stats.learningLanguages.length > 0 ? (
                    stats.learningLanguages.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-base-content flex items-center gap-2">
                          <span className="size-2 rounded-full bg-primary" />
                          {item.language}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base-content/80">{item.count} learners</span>
                          <span className="badge badge-ghost badge-sm text-[10px]">#{idx + 1}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-base-content/50 py-4 text-center">No language data recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Top Native Languages */}
              <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-black tracking-wide text-base-content flex items-center justify-between">
                  <span>Top Native Languages</span>
                  <span className="text-xs text-base-content/50 font-normal">Native speaker pool</span>
                </h3>
                <div className="space-y-2.5">
                  {stats.nativeLanguages && stats.nativeLanguages.length > 0 ? (
                    stats.nativeLanguages.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-base-content flex items-center gap-2">
                          <span className="size-2 rounded-full bg-secondary" />
                          {item.language}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base-content/80">{item.count} speakers</span>
                          <span className="badge badge-ghost badge-sm text-[10px]">#{idx + 1}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-base-content/50 py-4 text-center">No language data recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Moderation Rules & Discipline Flowchart reference */}
            <div className="bg-base-200 border border-base-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-base-content/80">
                Disciplinary Enforcement Structure
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 shadow-xs transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-base-content">
                      <ClockIcon className="size-4 text-warning shrink-0" />
                      <span>Strike 1: 5-Min Cooldown</span>
                    </div>
                    <span className="badge badge-warning text-warning-content badge-xs font-bold px-2 py-1 shrink-0">
                      Timeout
                    </span>
                  </div>
                  <p className="text-base-content/75 text-xs leading-relaxed">
                    User screen is blanked with the suspension lockout countdown. Access automatically restores after 5 minutes.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 shadow-xs transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-base-content">
                      <AlertTriangleIcon className="size-4 text-orange-500 shrink-0" />
                      <span>Strike 2: 10-Min Cooldown</span>
                    </div>
                    <span className="badge bg-orange-500 text-white border-none badge-xs font-bold px-2 py-1 shrink-0">
                      Warning
                    </span>
                  </div>
                  <p className="text-base-content/75 text-xs leading-relaxed">
                    Final warning overlay with a 10-minute timer. Clearly informs the user that a 3rd strike results in permanent ban.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-base-100 border border-base-300 space-y-2 shadow-xs transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-base-content">
                      <BanIcon className="size-4 text-error shrink-0" />
                      <span>Strike 3: Permanent Ban</span>
                    </div>
                    <span className="badge badge-error text-error-content badge-xs font-bold px-2 py-1 shrink-0">
                      Terminated
                    </span>
                  </div>
                  <p className="text-base-content/75 text-xs leading-relaxed">
                    Account is terminated permanently. User is locked out of all rooms and cannot interact with the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: REPORTS & MODERATION QUEUE                            */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-base-200 p-4 rounded-2xl border border-base-300">
              <div className="flex items-center gap-2">
                <FlagIcon className="size-5 text-error" />
                <div>
                  <h2 className="text-base font-black">Learner Moderation Queue</h2>
                  <p className="text-xs text-base-content/60">
                    Review community flags and apply warnings, timeouts, or permanent bans.
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-base-100 p-1 rounded-xl border border-base-300 shadow-2xs">
                {["all", "pending", "resolved", "dismissed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setReportFilterStatus(s)}
                    className={`btn btn-xs rounded-lg font-bold capitalize transition-all ${
                      reportFilterStatus === s
                        ? "btn-primary text-primary-content shadow-xs"
                        : "bg-base-200 hover:bg-base-300 border border-base-300/80 text-base-content hover:text-base-content"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Reports List */}
            {isLoadingReports ? (
              <div className="text-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
                <p className="text-xs text-base-content/60 mt-2 font-medium">Loading reports queue...</p>
              </div>
            ) : reportsList.length === 0 ? (
              <div className="bg-base-200 border border-base-300 rounded-3xl p-12 text-center space-y-3">
                <div className="size-16 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2Icon className="size-8" />
                </div>
                <h3 className="text-lg font-bold">Queue Clean! No Reports Found</h3>
                <p className="text-xs text-base-content/60 max-w-sm mx-auto">
                  There are currently no reports matching this filter. Community members are behaving nicely.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportsList.map((rep) => {
                  const reported = rep.reportedUser || {};
                  const reporter = rep.reporter || {};
                  const isPending = rep.status === "pending";

                  return (
                    <div
                      key={rep._id}
                      className={`bg-base-200 border rounded-3xl p-5 transition-all space-y-4 ${
                        isPending ? "border-warning/40 shadow-sm" : "border-base-300/80 opacity-80"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        {/* Violator Info */}
                        <div className="flex items-start gap-3">
                          <div className="avatar">
                            <div className="size-12 rounded-2xl ring-2 ring-base-300 overflow-hidden bg-base-300">
                              <img
                                src={reported.profilePic || "https://avatar.iran.liara.run/public"}
                                alt={reported.fullName || "User"}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-base-content">
                                {reported.fullName || "Deleted / Unknown User"}
                              </h4>
                              <span className="text-xs text-base-content/50 font-mono">
                                ({reported.email || "No email"})
                              </span>

                              {/* Strike Badge */}
                              <span
                                className={`badge badge-sm font-bold text-[10px] ${
                                  (reported.strikeCount || 0) >= 3
                                    ? "badge-error"
                                    : (reported.strikeCount || 0) === 2
                                    ? "badge-warning"
                                    : (reported.strikeCount || 0) === 1
                                    ? "badge-info"
                                    : "badge-ghost"
                                }`}
                              >
                                {reported.strikeCount || 0} / 3 Strikes
                              </span>

                              {reported.isBanned && (
                                <span className="badge badge-error badge-sm font-black uppercase text-[9px]">
                                  Banned
                                </span>
                              )}
                              {reported.suspendedUntil && new Date(reported.suspendedUntil) > new Date() && (
                                <span className="badge badge-warning badge-sm font-bold text-[9px]">
                                  In Timeout
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-base-content/60 mt-0.5">
                              Reported by{" "}
                              <span className="font-semibold text-base-content">
                                {reporter.fullName || "Community Member"}
                              </span>{" "}
                              ({reporter.email || "learner"}) •{" "}
                              <span className="font-mono text-[11px]">
                                {new Date(rep.createdAt).toLocaleString()}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span
                            className={`badge font-bold uppercase text-xs px-3 py-2 ${
                              rep.status === "pending"
                                ? "badge-warning animate-pulse"
                                : rep.status === "resolved"
                                ? "badge-success text-success-content"
                                : "badge-neutral"
                            }`}
                          >
                            {rep.status}
                          </span>
                        </div>
                      </div>

                      {/* Violation Details */}
                      <div className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-error uppercase tracking-wider text-[11px]">
                            Violation Category:
                          </span>
                          <span className="badge badge-outline badge-error badge-sm font-bold">
                            {rep.reason}
                          </span>
                          <span className="badge badge-ghost badge-sm text-[10px]">
                            Context: {rep.context || "General"}
                          </span>
                        </div>
                        {rep.details && (
                          <div className="pt-1">
                            <span className="font-semibold text-base-content/60">Reporter Comment: </span>
                            <span className="text-base-content font-medium italic">"{rep.details}"</span>
                          </div>
                        )}
                        {rep.actionTaken && (
                          <div className="pt-1 text-success font-semibold text-[11px]">
                            Action Taken: {rep.actionTaken}{" "}
                            {rep.resolvedBy && `(by ${rep.resolvedBy.fullName || "Admin"})`}
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      {isPending && reported._id && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-base-300/60">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-base-content/60 mr-1">
                              Apply Progressive Discipline:
                            </span>

                            {/* 5m Timeout */}
                            <button
                              onClick={() =>
                                openModerationModal(
                                  reported,
                                  "timeout_5",
                                  `Violation: ${rep.reason}. Warning 1 issued. 5-minute timeout.`,
                                  rep._id
                                )
                              }
                              className="btn btn-xs btn-warning text-warning-content font-bold gap-1 shadow-sm"
                            >
                              <ClockIcon className="size-3" />
                              <span>5m Timeout (Strike 1)</span>
                            </button>

                            {/* 10m Timeout (Sub-Admins and Admins) */}
                            {(isAdmin || isSubAdmin) && (
                              <button
                                onClick={() =>
                                  openModerationModal(
                                    reported,
                                    "timeout_10",
                                    `Repeated Violation: ${rep.reason}. Warning 2 issued. 10-minute timeout.`,
                                    rep._id
                                  )
                                }
                                className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1 shadow-xs border border-amber-600/30"
                              >
                                <AlertTriangleIcon className="size-3" />
                                <span>10m Timeout (Strike 2)</span>
                              </button>
                            )}

                            {/* Permanent Ban (Head Admin strictly) */}
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  openModerationModal(
                                    reported,
                                    "ban",
                                    `Severe violation: ${rep.reason}. Permanent ban.`,
                                    rep._id
                                  )
                                }
                                className="btn btn-xs btn-error text-error-content font-bold gap-1 shadow-sm"
                              >
                                <BanIcon className="size-3" />
                                <span>Permanent Ban (Strike 3)</span>
                              </button>
                            )}
                          </div>

                          {/* Dismiss Button */}
                          <button
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: rep._id,
                                status: "dismissed",
                                actionTaken: "Dismissed by admin - No violation found",
                              })
                            }
                            className="btn btn-xs bg-base-100 hover:bg-base-300 border border-base-300 text-base-content font-bold gap-1 shadow-2xs transition-all"
                          >
                            <XCircleIcon className="size-3.5" />
                            <span>Dismiss Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 3: USER DIRECTORY & MANAGEMENT                           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Filter Header */}
            <div className="bg-base-200 border border-base-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <label className="input input-bordered input-sm sm:input-md bg-base-100 border-base-300 rounded-2xl flex items-center gap-2.5 w-full sm:w-96 focus-within:border-primary">
                  <SearchIcon className="size-4 text-base-content/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or language..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    className="grow bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:text-base-content/40"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch("")}
                      className="text-xs opacity-50 hover:opacity-100 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </label>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                  {[
                    { id: "all", label: "All Users" },
                    { id: "strikes", label: "With Strikes" },
                    { id: "suspended", label: "Timed Out" },
                    { id: "banned", label: "Banned" },
                    { id: "unverified", label: "Unverified" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setUserFilterStatus(f.id);
                        setUserPage(1);
                      }}
                      className={`btn btn-xs rounded-xl font-bold whitespace-nowrap transition-all ${
                        userFilterStatus === f.id
                          ? "btn-primary text-primary-content shadow-xs"
                          : "bg-base-100 hover:bg-base-300 border border-base-300 text-base-content hover:text-base-content"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-base-content/60 pt-1">
                <span>
                  Showing {usersList.length} of {usersData?.totalCount ?? 0} registered learners
                </span>
                {userSearch && (
                  <span className="font-semibold text-primary">Filtering by: "{userSearch}"</span>
                )}
              </div>
            </div>

            {/* Users Table / Cards */}
            {isLoadingUsers ? (
              <div className="text-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
                <p className="text-xs text-base-content/60 mt-2 font-medium">Fetching learners directory...</p>
              </div>
            ) : usersList.length === 0 ? (
              <div className="bg-base-200 border border-base-300 rounded-3xl p-12 text-center space-y-3">
                <div className="size-16 rounded-full bg-base-300 flex items-center justify-center mx-auto text-base-content/50">
                  <UserXIcon className="size-8" />
                </div>
                <h3 className="text-lg font-bold">No Users Found</h3>
                <p className="text-xs text-base-content/60 max-w-sm mx-auto">
                  Try adjusting your search keywords or clearing the active status filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {usersList.map((u) => {
                  const CREATOR_EMAIL = "umeshalla73@gmail.com";
                  const isCreatorAccount = (u.email || "").toLowerCase() === CREATOR_EMAIL.toLowerCase();
                  const isSelfAccount = (u._id || u.id)?.toString() === (authUser?._id || authUser?.id)?.toString();
                  const isTargetAdmin = isCreatorAccount || u.role === "admin";
                  const isTargetStaff = isTargetAdmin || u.role === "subadmin";
                  const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();

                  return (
                    <div
                      key={u._id}
                      className="bg-base-200 border border-base-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* User identity info */}
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="size-12 rounded-2xl ring-2 ring-base-300 overflow-hidden bg-base-300">
                              <img
                                src={u.profilePic || "https://avatar.iran.liara.run/public"}
                                alt={u.fullName || "User"}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-base-content">
                                {u.fullName || "Unnamed Learner"}
                              </h4>
                              {isCreatorAccount || u.role === "admin" ? (
                                <span className="badge bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-none shadow-sm badge-sm font-black uppercase text-[9px] gap-1">
                                  <CrownIcon className="size-2.5 fill-current" />
                                  Creator
                                </span>
                              ) : u.role === "subadmin" ? (
                                <span title="Sub-Admin" className="badge bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-sm badge-sm font-bold uppercase text-[9px] px-1.5 py-0.5 inline-flex items-center justify-center">
                                  <ShieldCheckIcon className="size-2.5 fill-current" />
                                </span>
                              ) : u.subadminInvitation?.status === "pending" ? (
                                <span className="badge badge-warning text-warning-content badge-sm font-bold uppercase text-[9px] gap-1 animate-pulse">
                                  <ClockIcon className="size-2.5" />
                                  Invited (Pending)
                                </span>
                              ) : (
                                <span className="badge badge-ghost badge-sm font-medium text-[9px]">
                                  Learner
                                </span>
                              )}
                              {u.isVerified ? (
                                <span className="badge badge-success badge-sm text-success-content font-bold text-[9px]">
                                  Verified
                                </span>
                              ) : (
                                <span className="badge badge-neutral badge-sm font-medium text-[9px]">
                                  Unverified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-content/60 font-mono mt-0.5">{u.email}</p>
                            <p className="text-xs text-base-content/70 mt-1">
                              Learning: <span className="font-semibold text-primary">{u.learningLanguage || "None"}</span> •
                              Native: <span className="font-semibold text-secondary">{u.nativeLanguage || "None"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Disciplinary status indicators */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Strike indicator */}
                          <div className="flex items-center gap-1.5 bg-base-100 border border-base-300 px-3 py-1.5 rounded-2xl">
                            <span className="text-[11px] font-bold text-base-content/60">Strikes:</span>
                            <span
                              className={`badge badge-sm font-black ${
                                (u.strikeCount || 0) >= 3
                                  ? "badge-error"
                                  : (u.strikeCount || 0) === 2
                                  ? "badge-warning text-warning-content"
                                  : (u.strikeCount || 0) === 1
                                  ? "badge-info text-info-content"
                                  : "badge-ghost"
                              }`}
                            >
                              {u.strikeCount || 0} / 3
                            </span>
                          </div>

                          {/* Banned / Suspended tags */}
                          {u.isBanned && (
                            <span className="badge badge-error font-black uppercase text-xs px-3 py-2">
                              Banned
                            </span>
                          )}
                          {isSuspended && (
                            <div className="badge badge-warning font-bold text-xs px-3 py-2 gap-1.5">
                              <ClockIcon className="size-3" />
                              <span>Timeout Active</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons or Protection notices */}
                      {isCreatorAccount ? (
                        <div className="pt-2 border-t border-base-300/70 text-xs text-primary font-bold flex items-center gap-1.5">
                          <CrownIcon className="size-3.5" />
                          <span>✨ Protected Creator Account • Immune to moderation actions</span>
                        </div>
                      ) : isSelfAccount ? (
                        <div className="pt-2 border-t border-base-300/70 text-xs text-base-content/60 font-semibold flex items-center gap-1.5">
                          <UserIcon className="size-3.5" />
                          <span>👤 Your Account</span>
                        </div>
                      ) : isSubAdmin && isTargetStaff ? (
                        <div className="pt-2 border-t border-base-300/70 text-xs text-info font-semibold flex items-center gap-1.5">
                          <ShieldCheckIcon className="size-3.5" />
                          <span>🛡️ Staff Account • Immune to Sub-Admin moderation</span>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-base-300/70 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Staff Role Assignment Dropdown (Head Admin only) */}
                            {isAdmin && (
                              <div className="flex items-center gap-1.5 bg-base-100 border border-base-300 rounded-xl px-2 py-0.5 shadow-2xs mr-1">
                                <span className="text-[10px] font-bold text-base-content/60 uppercase">Role:</span>
                                <select
                                  value={
                                    u.subadminInvitation?.status === "pending" && u.role !== "subadmin"
                                      ? "subadmin_pending"
                                      : u.role || "user"
                                  }
                                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                  disabled={updateRoleMutation.isPending}
                                  className="select select-ghost select-xs text-xs font-bold focus:outline-none cursor-pointer py-0 h-6 min-h-6"
                                  title="Change staff role for user"
                                >
                                  <option value="user">Learner</option>
                                  {u.subadminInvitation?.status === "pending" && u.role !== "subadmin" ? (
                                    <option value="subadmin_pending" disabled>
                                      ⏳ Sub-Admin (Pending Acceptance)
                                    </option>
                                  ) : (
                                    <option value="subadmin">⚡ Sub-Admin (Send Invite)</option>
                                  )}
                                  <option value="admin">👑 Admin</option>
                                </select>
                              </div>
                            )}

                            {/* 5m Timeout */}
                            <button
                              onClick={() =>
                                openModerationModal(
                                  u,
                                  "timeout_5",
                                  "First warning for disruptive behavior. 5-minute timeout."
                                )
                              }
                              className="btn btn-xs bg-amber-400 hover:bg-amber-500 text-slate-950 border border-amber-500/50 font-bold gap-1 shadow-2xs transition-all"
                              title="Trigger 5-minute blank lockout overlay"
                            >
                              <ClockIcon className="size-3" />
                              <span>5m Timeout</span>
                            </button>

                            {/* 10m Timeout */}
                            <button
                              onClick={() =>
                                openModerationModal(
                                  u,
                                  "timeout_10",
                                  "Second warning for repeated misconduct. 10-minute timeout."
                                )
                              }
                              className="btn btn-xs bg-orange-500 hover:bg-orange-600 text-white border border-orange-600/50 font-bold gap-1 shadow-2xs transition-all"
                              title="Trigger 10-minute blank lockout overlay"
                            >
                              <AlertTriangleIcon className="size-3" />
                              <span>10m Timeout</span>
                            </button>

                            {/* Ban / Unban */}
                            {u.isBanned ? (
                              <button
                                onClick={() => openModerationModal(u, "unban", "Restored access by admin")}
                                className="btn btn-xs btn-success font-bold gap-1 text-success-content shadow-2xs"
                              >
                                <UnlockIcon className="size-3" />
                                <span>Unban User</span>
                              </button>
                            ) : (
                              isAdmin && (
                                <button
                                  onClick={() =>
                                    openModerationModal(
                                      u,
                                      "ban",
                                      "Permanent suspension for egregious rules violation"
                                    )
                                  }
                                  className="btn btn-xs btn-error text-error-content font-bold gap-1 shadow-2xs hover:brightness-110"
                                >
                                  <BanIcon className="size-3" />
                                  <span>Ban User</span>
                                </button>
                              )
                            )}

                            {/* Clear Strikes if user has any */}
                            {u.strikeCount > 0 && (
                              <button
                                onClick={() => openModerationModal(u, "clear_strikes", "Strikes forgiven by admin")}
                                className="btn btn-xs bg-base-100 hover:bg-success/15 border border-base-300 hover:border-success/50 text-base-content hover:text-success font-bold gap-1 shadow-2xs transition-all"
                              >
                                <SparklesIcon className="size-3" />
                                <span>Clear Strikes</span>
                              </button>
                            )}

                            {/* Force Verify */}
                            {!u.isVerified && (
                              <button
                                onClick={() =>
                                  openModerationModal(u, "force_verify", "Verified manually by admin")
                                }
                                className="btn btn-xs bg-base-100 hover:bg-primary/15 border border-base-300 hover:border-primary/50 text-base-content hover:text-primary font-bold gap-1 shadow-2xs transition-all"
                              >
                                <CheckCircle2Icon className="size-3" />
                                <span>Force Verify</span>
                              </button>
                            )}

                            {/* Clear Inappropriate Bio */}
                            {Boolean(u.bio || u.profilePic) && (
                              <button
                                onClick={() =>
                                  openModerationModal(u, "clear_profile", "Inappropriate profile content cleared")
                                }
                                className="btn btn-xs bg-base-100 hover:bg-warning/15 border border-base-300 hover:border-warning/50 text-base-content hover:text-warning font-bold gap-1 shadow-2xs transition-all"
                              >
                                <EyeOffIcon className="size-3" />
                                <span>Wipe Bio/Pic</span>
                              </button>
                            )}
                          </div>

                          {/* Delete Account (Head Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              className="btn btn-xs bg-error/10 hover:bg-error text-error hover:text-error-content border border-error/30 font-bold gap-1 shadow-2xs transition-all"
                              title="Permanently remove account from database"
                            >
                              <Trash2Icon className="size-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Pagination */}
                {usersData?.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="btn btn-sm bg-base-100 hover:bg-base-200 border border-base-300 text-base-content font-bold shadow-2xs disabled:bg-base-200 disabled:text-base-content/30 disabled:border-base-300/40"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-bold px-3">
                      Page {userPage} of {usersData.totalPages}
                    </span>
                    <button
                      disabled={userPage >= usersData.totalPages}
                      onClick={() => setUserPage((p) => p + 1)}
                      className="btn btn-sm bg-base-100 hover:bg-base-200 border border-base-300 text-base-content font-bold shadow-2xs disabled:bg-base-200 disabled:text-base-content/30 disabled:border-base-300/40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB: MONITOR ROOMS (ACTIVE & INACTIVE LOUNGES)               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "rooms" && (
          <div className="space-y-6">
            {/* Header & Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-primary/15 text-primary">
                  <GlobeIcon className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Total Lounges
                  </p>
                  <h3 className="text-2xl font-black text-base-content mt-0.5">{roomsList.length}</h3>
                  <p className="text-[11px] text-base-content/60">Stream livestream channels</p>
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-success/15 text-success">
                  <ActivityIcon className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Active Lounges
                  </p>
                  <h3 className="text-2xl font-black text-success mt-0.5 flex items-center gap-2">
                    {activeRoomsCount}
                    <span className="size-2.5 rounded-full bg-success animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-base-content/60">Active chatting within 30m</p>
                </div>
              </div>

              <div className="bg-base-200 border border-base-300 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-warning/15 text-warning">
                  <ClockIcon className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Inactive Lounges
                  </p>
                  <h3 className="text-2xl font-black text-warning mt-0.5">{inactiveRoomsCount}</h3>
                  <p className="text-[11px] text-base-content/60">&gt;30 mins with no messages</p>
                </div>
              </div>
            </div>

            {/* Inactive Notice Banner if Inactive Rooms Exist */}
            {inactiveRoomsCount > 0 && (
              <div className="alert alert-warning shadow-md rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangleIcon className="size-5 text-warning-content shrink-0" />
                  <p className="text-xs font-semibold text-warning-content">
                    <strong>{inactiveRoomsCount} room(s)</strong> have been inactive for more than 30 minutes. You can delete inactive rooms below to keep chat clean.
                  </p>
                </div>
                <button
                  onClick={() => setRoomFilterStatus("inactive")}
                  className="btn btn-xs btn-warning text-warning-content font-bold border-none"
                >
                  View Inactive
                </button>
              </div>
            )}

            {/* Search, Filter & Action Bar */}
            <div className="bg-base-200 border border-base-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <label className="input input-bordered input-sm sm:input-md bg-base-100 border-base-300 rounded-2xl flex items-center gap-2.5 w-full sm:w-96 focus-within:border-primary">
                  <SearchIcon className="size-4 text-base-content/40 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by lounge name, id, or language..."
                    value={roomSearch}
                    onChange={(e) => setRoomSearch(e.target.value)}
                    className="grow bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:text-base-content/40"
                  />
                  {roomSearch && (
                    <button
                      type="button"
                      onClick={() => setRoomSearch("")}
                      className="text-xs opacity-50 hover:opacity-100 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </label>

                {/* Filter Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                  {[
                    { id: "all", label: `All Lounges (${roomsList.length})` },
                    { id: "active", label: `Active (${activeRoomsCount})` },
                    { id: "inactive", label: `Inactive >30m (${inactiveRoomsCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRoomFilterStatus(f.id)}
                      className={`btn btn-xs rounded-xl font-bold whitespace-nowrap transition-all ${
                        roomFilterStatus === f.id
                          ? "btn-primary text-primary-content shadow-xs"
                          : "bg-base-100 hover:bg-base-300 border border-base-300 text-base-content hover:text-base-content"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    onClick={() => refetchRooms()}
                    disabled={isRefetchingRooms}
                    className="btn btn-xs bg-base-100 hover:bg-base-200 border border-base-300 hover:border-primary text-base-content hover:text-primary font-bold gap-1 ml-1 shadow-2xs transition-all"
                    title="Refresh rooms list"
                  >
                    <RefreshCwIcon className={`size-3 ${isRefetchingRooms ? "animate-spin text-primary" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-base-content/60 pt-1">
                <span>
                  Showing {filteredRooms.length} of {roomsList.length} monitored lounges
                </span>
                {roomSearch && (
                  <span className="font-semibold text-primary">Filtering by: "{roomSearch}"</span>
                )}
              </div>
            </div>

            {/* Lounges Table */}
            {isLoadingRooms ? (
              <div className="text-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
                <p className="text-xs text-base-content/60 mt-2 font-medium">Fetching monitored rooms...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="bg-base-200 border border-base-300 rounded-3xl p-12 text-center space-y-3">
                <div className="size-16 rounded-full bg-base-300 flex items-center justify-center mx-auto text-base-content/50">
                  <GlobeIcon className="size-8" />
                </div>
                <h3 className="text-lg font-bold">No Lounges Match</h3>
                <p className="text-xs text-base-content/60 max-w-sm mx-auto">
                  {roomSearch
                    ? `No lounges found matching "${roomSearch}". Try clearing your search.`
                    : "There are currently no rooms in this category."}
                </p>
                {roomSearch && (
                  <button
                    onClick={() => setRoomSearch("")}
                    className="btn btn-sm btn-ghost font-bold text-primary"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRooms.map((room) => {
                  const isProtected = room.isDefault || room.id === "global-community";
                  const lastActiveDate = room.lastMessageAt ? new Date(room.lastMessageAt) : null;
                  const createdDate = room.createdAt ? new Date(room.createdAt) : null;
                  const minutesAgo = room.lastMessageAt
                    ? Math.floor((Date.now() - room.lastMessageAt) / 60000)
                    : null;

                  return (
                    <div
                      key={room.id}
                      className={`bg-base-200 border rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 transition-colors ${
                        room.isInactive
                          ? "border-warning/40 hover:border-warning"
                          : "border-base-300 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Lounge Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`size-12 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-xs ${
                              isProtected
                                ? "bg-primary/20 text-primary"
                                : room.isInactive
                                ? "bg-warning/15 text-warning"
                                : "bg-success/15 text-success"
                            }`}
                          >
                            {isProtected ? "🌐" : "💬"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-base-content truncate">
                                {room.name || room.id}
                              </h4>
                              {isProtected ? (
                                <span className="badge badge-primary badge-sm font-black uppercase text-[9px] gap-1">
                                  <LockIcon className="size-2.5" />
                                  Default Lounge
                                </span>
                              ) : (
                                <span className="badge badge-ghost badge-sm font-semibold text-[9px]">
                                  {room.language || "Language Room"}
                                </span>
                              )}
                              {room.isInactive ? (
                                <span className="badge badge-warning text-warning-content badge-sm font-bold gap-1 text-[9px]">
                                  <ClockIcon className="size-2.5" />
                                  Inactive ({minutesAgo !== null ? `${minutesAgo}m idle` : ">30m"})
                                </span>
                              ) : (
                                <span className="badge badge-success text-success-content badge-sm font-bold gap-1 text-[9px]">
                                  <span className="size-1.5 rounded-full bg-current animate-ping" />
                                  Active ({minutesAgo !== null ? `${minutesAgo}m ago` : "Live"})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-base-content/60 font-mono mt-0.5">
                              Channel CID: {room.cid || `livestream:${room.id}`}
                            </p>
                            <p className="text-[11px] text-base-content/50 mt-0.5">
                              Created: {createdDate ? createdDate.toLocaleString() : "Unknown"} • Last active:{" "}
                              {lastActiveDate ? lastActiveDate.toLocaleString() : "No messages yet"}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isProtected ? (
                            <span className="badge badge-neutral text-xs font-bold gap-1 px-3 py-2">
                              <ShieldCheckIcon className="size-3.5" />
                              Protected from Deletion
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmRoom(room)}
                              className="btn btn-xs sm:btn-sm btn-error text-error-content font-bold gap-1.5 shadow-2xs hover:brightness-110 transition-all"
                              title="Delete and close room immediately"
                            >
                              <Trash2Icon className="size-3.5" />
                              <span>Delete Lounge</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 4: BROADCAST ANNOUNCEMENTS                               */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "broadcast" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-base-200 border border-base-300 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-secondary/15 text-secondary">
                  <RadioIcon className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Creator Broadcast System</h2>
                  <p className="text-xs text-base-content/60">
                    Send real-time system notices directly into global community chat lounges.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="label text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Target Channel / Lounge
                  </label>
                  <select
                    value={broadcastRoom}
                    onChange={(e) => setBroadcastRoom(e.target.value)}
                    className="select select-bordered w-full rounded-2xl bg-base-100 text-base-content text-sm font-semibold"
                  >
                    <option value="global-community">Global Community Lounge (All Learners)</option>
                    <option value="spanish-room">Spanish Practice Lounge</option>
                    <option value="french-room">French Practice Lounge</option>
                    <option value="japanese-room">Japanese Practice Lounge</option>
                    <option value="german-room">German Practice Lounge</option>
                  </select>
                </div>

                <div>
                  <label className="label text-xs font-bold uppercase tracking-wider text-base-content/60">
                    Announcement Message
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="e.g., 👋 Welcome learners! Voice Assistant 2.0 with instant neural TTS is now live! Practice pronunciation in the AI Tutor tab."
                    className="textarea textarea-bordered w-full rounded-2xl bg-base-100 text-sm focus:outline-none focus:border-secondary"
                  />
                  <span className="text-[11px] text-base-content/50">
                    The broadcast will appear highlighted with the official Creator badge in chat.
                  </span>
                </div>

                {/* Message Live Preview */}
                {broadcastMsg.trim() && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-base-content/50 uppercase tracking-wide">
                      Live Chat Preview
                    </span>
                    <div className="bg-base-100 border border-secondary/30 rounded-2xl p-4 space-y-1 shadow-inner">
                      <div className="flex items-center gap-2 text-secondary text-xs font-bold">
                        <RadioIcon className="size-3.5 animate-pulse" />
                        <span>[ANNOUNCEMENT FROM CREATOR]</span>
                      </div>
                      <p className="text-sm font-medium text-base-content">{broadcastMsg.trim()}</p>
                    </div>
                  </div>
                )}

                <button
                  disabled={!broadcastMsg.trim() || broadcastMutation.isPending}
                  onClick={() =>
                    broadcastMutation.mutate({
                      message: broadcastMsg.trim(),
                      targetRoom: broadcastRoom,
                    })
                  }
                  className={`btn btn-block font-bold gap-2 rounded-2xl transition-all ${
                    !broadcastMsg.trim() || broadcastMutation.isPending
                      ? "bg-base-300 text-base-content/40 cursor-not-allowed border-base-300 shadow-none hover:bg-base-300"
                      : "btn-secondary text-secondary-content shadow-lg cursor-pointer"
                  }`}
                >
                  <SendIcon className="size-4" />
                  {broadcastMutation.isPending ? "Broadcasting..." : "Broadcast Announcement to Lounge"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 5: AI & INFRASTRUCTURE MONITOR                           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Groq High-Availability Failover */}
              <div className="bg-base-200 border border-base-300 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-primary/15 text-primary">
                    <KeyIcon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Groq AI API Failover Pool</h3>
                    <p className="text-xs text-base-content/60">Rotational multi-key resilience engine</p>
                  </div>
                </div>

                <div className="bg-base-100 rounded-2xl p-4 border border-base-300 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Active Failover Keys:</span>
                    <span className="badge badge-primary font-bold">{services.groqKeysCount ?? 2} Keys Loaded</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Candidate Models:</span>
                    <span className="font-mono text-base-content">gpt-oss-120b, qwen3.6-27b</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Speech Engine:</span>
                    <span className="font-mono text-base-content">Whisper Large v3 Turbo</span>
                  </div>
                  <p className="text-[11px] text-base-content/50 pt-2 border-t border-base-300">
                    If key 1 encounters a 429 rate limit or network glitch, the service automatically switches to key 2
                    without interrupting learner conversations.
                  </p>
                </div>
              </div>

              {/* Redis Voice Cache */}
              <div className="bg-base-200 border border-base-300 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-success/15 text-success">
                    <DatabaseIcon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Redis Neural Audio Cache</h3>
                    <p className="text-xs text-base-content/60">High-speed sub-millisecond audio streaming</p>
                  </div>
                </div>

                <div className="bg-base-100 rounded-2xl p-4 border border-base-300 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Connection Status:</span>
                    <span className="badge badge-success font-bold text-success-content capitalize">
                      {services.redis || "Connected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Cache TTL:</span>
                    <span className="font-mono text-base-content">7 Days (Auto-eviction)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base-content/70">Neural Voices:</span>
                    <span className="font-mono text-base-content">es-ES, fr-FR, ja-JP, de-DE...</span>
                  </div>
                  <p className="text-[11px] text-base-content/50 pt-2 border-t border-base-300">
                    Practice sentences and vocabulary audio files are cached in Redis to eliminate latency on repeat listens.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Rules & Guidelines Admin Guide */}
            <div className="bg-base-200 border border-base-300 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-base-content flex items-center gap-2">
                <FileTextIcon className="size-4 text-primary" />
                Community Standards & Safety Reference
              </h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                LangBridge is an inclusive global learning community. Enforce progressive discipline:
              </p>
              <ul className="text-xs text-base-content/70 space-y-1 list-disc list-inside">
                <li>
                  <strong>Minor vulgarity or spam:</strong> Issue Strike 1 (5-minute timeout).
                </li>
                <li>
                  <strong>Targeted harassment or repeated disruption:</strong> Issue Strike 2 (10-minute timeout with final warning).
                </li>
                <li>
                  <strong>Hate speech, threats, or severe abuse:</strong> Issue Strike 3 (Permanent termination).
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* MODAL: APPLY MODERATION ACTION                               */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {moderationModal.isOpen && moderationModal.user && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-base-100 border border-base-300 rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-warning/15 text-warning">
                  <ShieldAlertIcon className="size-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-base-content">Execute Moderation</h3>
                  <p className="text-xs text-base-content/60">
                    Target: <span className="font-bold text-base-content">{moderationModal.user.fullName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setModerationModal({ isOpen: false, user: null, action: "", reason: "", reportId: null })
                }
                className="btn btn-ghost btn-xs btn-circle"
              >
                ✕
              </button>
            </div>

            <div className="bg-base-200 rounded-2xl p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-base-content/60">Selected Action:</span>
                <span className="font-bold uppercase text-primary">
                  {moderationModal.action.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Current Strikes:</span>
                <span className="font-bold">{moderationModal.user.strikeCount || 0} / 3</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-base-content/70">
                Reason (Displayed on user's lockout screen)
              </label>
              <textarea
                rows={3}
                value={moderationModal.reason}
                onChange={(e) => setModerationModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Specify the reason for this action..."
                className="textarea textarea-bordered w-full rounded-2xl bg-base-200 text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setModerationModal({ isOpen: false, user: null, action: "", reason: "", reportId: null })
                }
                className="btn btn-sm btn-ghost border border-base-300 hover:bg-base-200 text-base-content font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={moderateMutation.isPending}
                onClick={handleExecuteModeration}
                className="btn btn-sm btn-primary text-primary-content font-bold shadow-md gap-1.5"
              >
                {moderateMutation.isPending ? "Executing..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRM PERMANENT USER DELETION                       */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-base-100 border border-error/40 rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="size-14 sm:size-16 rounded-full bg-error/15 text-error flex items-center justify-center mx-auto ring-8 ring-error/10">
              <Trash2Icon className="size-7 sm:size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base sm:text-lg text-base-content">Permanently Delete User?</h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-base-content">{deleteConfirmUser.fullName}</strong> (
                {deleteConfirmUser.email})? This removes all account records, reports, and friend data permanently.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="btn btn-sm btn-ghost border border-base-300 hover:bg-base-200 text-base-content font-bold flex-1"
              >
                Cancel
              </button>
              <button
                disabled={deleteUserMutation.isPending}
                onClick={() => deleteUserMutation.mutate(deleteConfirmUser._id)}
                className="btn btn-sm btn-error font-bold text-error-content flex-1 shadow-lg"
              >
                {deleteUserMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRM ROOM DELETION                                  */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {deleteConfirmRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-base-100 border border-error/40 rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="size-14 sm:size-16 rounded-full bg-error/15 text-error flex items-center justify-center mx-auto ring-8 ring-error/10">
              <Trash2Icon className="size-7 sm:size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base sm:text-lg text-base-content">Delete Chat Lounge?</h3>
              <p className="text-xs text-base-content/70 leading-relaxed">
                Are you sure you want to delete and close{" "}
                <strong className="text-base-content">{deleteConfirmRoom.name}</strong> (
                <span className="font-mono">{deleteConfirmRoom.id}</span>)?
              </p>
              <p className="text-[11px] text-error/90 font-medium pt-1">
                This removes the room from Stream Chat and instantly disconnects all users chatting in this room back to the Global Community Lounge.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmRoom(null)}
                className="btn btn-sm btn-ghost border border-base-300 hover:bg-base-200 text-base-content font-bold flex-1"
              >
                Cancel
              </button>
              <button
                disabled={deleteRoomMutation.isPending}
                onClick={() => deleteRoomMutation.mutate(deleteConfirmRoom.id)}
                className="btn btn-sm btn-error font-bold text-error-content flex-1 shadow-lg"
              >
                {deleteRoomMutation.isPending ? "Closing Room..." : "Delete & Close Room"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
