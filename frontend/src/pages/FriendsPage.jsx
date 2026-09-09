import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  getAllGlobalUsers,
  getOutgoingFriendReqs,
  getUserFriends,
  sendFriendRequest,
  unfriendUser,
} from "../lib/api";
import {
  CheckCircleIcon,
  GlobeIcon,
  MapPinIcon,
  MessageSquareIcon,
  SearchIcon,
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
  EyeIcon,
  UserCheckIcon,
  RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { capitialize, getNameStyle, getNameClass } from "../lib/utils";
import { getLanguageFlag } from "../components/FriendCard";
import NoFriendsFound from "../components/NoFriendsFound";
import UserProfileModal from "../components/UserProfileModal";
import { useStreamChatContext } from "../context/StreamChatContext";
import useNotificationCount from "../hooks/useNotificationCount";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const { unreadCounts } = useStreamChatContext();
  const { unreadCount } = useNotificationCount();

  const [activeTab, setActiveTab] = useState("friends"); // "friends" | "global"
  const [searchTerm, setSearchTerm] = useState("");
  const [outgoingRequestsIds, setOutgoingRequestsIds] = useState(new Set());
  const [friendIdsSet, setFriendIdsSet] = useState(new Set());
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [pendingSendIds, setPendingSendIds] = useState(new Set());
  const [pendingUnfriendIds, setPendingUnfriendIds] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    staleTime: 1000 * 30, // 30s cache for instant tab responsiveness
  });

  const { data: globalUsers = [], isLoading: loadingGlobalUsers } = useQuery({
    queryKey: ["globalUsers"],
    queryFn: getAllGlobalUsers,
    staleTime: 1000 * 30, // 30s cache for instant tab responsiveness
  });

  const { data: outgoingFriendReqs } = useQuery({
    queryKey: ["outgoingFriendReqs"],
    queryFn: getOutgoingFriendReqs,
    staleTime: 1000 * 30,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: ["globalUsers"] }),
        queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] }),
      ]);
      toast.success("Updated friends & global learners!");
    } catch {
      toast.error("Failed to refresh data.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    const userIdStr = userId?.toString();
    if (!userIdStr || pendingSendIds.has(userIdStr) || outgoingRequestsIds.has(userIdStr)) return;

    // Optimistically mark this specific user as requested & pending
    setPendingSendIds((prev) => new Set(prev).add(userIdStr));
    setOutgoingRequestsIds((prev) => new Set(prev).add(userIdStr));

    try {
      await sendFriendRequest(userId);
      toast.success("Friend request sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
    } catch (error) {
      // Revert optimistic update for this specific user
      setOutgoingRequestsIds((prev) => {
        const next = new Set(prev);
        next.delete(userIdStr);
        return next;
      });
      toast.error(error.response?.data?.message || "Failed to send friend request");
    } finally {
      setPendingSendIds((prev) => {
        const next = new Set(prev);
        next.delete(userIdStr);
        return next;
      });
    }
  };

  const handleUnfriendUser = async (userId) => {
    const userIdStr = userId?.toString();
    if (!userIdStr || pendingUnfriendIds.has(userIdStr)) return;

    setPendingUnfriendIds((prev) => new Set(prev).add(userIdStr));

    try {
      await unfriendUser(userId);
      toast.success("Unfriended successfully!");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unfriend user");
    } finally {
      setPendingUnfriendIds((prev) => {
        const next = new Set(prev);
        next.delete(userIdStr);
        return next;
      });
    }
  };

  useEffect(() => {
    const outgoingIds = new Set();
    if (outgoingFriendReqs && Array.isArray(outgoingFriendReqs)) {
      outgoingFriendReqs.forEach((req) => {
        const rId = req.recipient?._id || req.recipient;
        if (rId) {
          outgoingIds.add(rId.toString());
        }
      });
      setOutgoingRequestsIds(outgoingIds);
    } else {
      setOutgoingRequestsIds(new Set());
    }
  }, [outgoingFriendReqs]);

  useEffect(() => {
    const fIds = new Set();
    if (friends && Array.isArray(friends)) {
      friends.forEach((f) => {
        if (f._id) fIds.add(f._id.toString());
      });
    }
    setFriendIdsSet(fIds);
  }, [friends]);

  // Filter accepted friends by search term
  const filteredFriends = friends.filter((friend) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      friend.fullName?.toLowerCase().includes(term) ||
      friend.nativeLanguage?.toLowerCase().includes(term) ||
      friend.learningLanguage?.toLowerCase().includes(term) ||
      friend.location?.toLowerCase().includes(term)
    );
  });

  // Global users excluding users who are ALREADY friends
  const nonFriendGlobalUsers = globalUsers.filter(
    (user) => user._id && !friendIdsSet.has(user._id.toString())
  );

  // Filter global non-friend users by search term
  const filteredGlobalUsers = nonFriendGlobalUsers.filter((user) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.fullName?.toLowerCase().includes(term) ||
      user.nativeLanguage?.toLowerCase().includes(term) ||
      user.learningLanguage?.toLowerCase().includes(term) ||
      user.location?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-5 sm:space-y-8 max-w-6xl">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-base-200 p-4 sm:p-6 rounded-2xl border border-base-300">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-2.5">
              <UsersIcon className="size-6 sm:size-7 text-primary shrink-0" />
              <span>Friends & Global Community</span>
            </h1>
            <p className="text-xs sm:text-sm opacity-70 mt-1">
              Manage your accepted friends or connect with new global learners worldwide
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* IN-PAGE REFRESH BUTTON */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-ghost border border-base-300 hover:bg-base-300 text-base-content btn-sm sm:btn-md gap-1.5 font-bold transition-all active:scale-95 cursor-pointer shrink-0"
              title="Refresh friends and community data"
            >
              <RefreshCwIcon className={`size-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/notifications"
              className="btn btn-primary text-primary-content btn-sm sm:btn-md gap-2 flex-1 sm:flex-none justify-center active:scale-95 transition-all cursor-pointer"
            >
              <UserCheckIcon className="size-4" />
              <span>Friend Requests</span>
              {unreadCount > 0 && (
                <span className="badge badge-sm font-bold bg-primary-content text-primary">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* SEARCH BAR & TABS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-200 p-1 w-full sm:w-auto flex">
            <button
              onClick={() => setActiveTab("friends")}
              className={`tab tab-sm sm:tab-md flex-1 sm:flex-none gap-1.5 sm:gap-2 font-medium ${
                activeTab === "friends" ? "tab-active bg-primary text-primary-content font-bold" : "text-base-content"
              }`}
            >
              <UsersIcon className="size-3.5 sm:size-4" />
              <span>Your Friends</span>
              <span
                className={`badge badge-xs sm:badge-sm font-bold ${
                  activeTab === "friends"
                    ? "bg-primary-content text-primary border-transparent"
                    : "bg-base-300 text-base-content border-base-300"
                }`}
              >
                {friends.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`tab tab-sm sm:tab-md flex-1 sm:flex-none gap-1.5 sm:gap-2 font-medium ${
                activeTab === "global" ? "tab-active bg-primary text-primary-content font-bold" : "text-base-content"
              }`}
            >
              <GlobeIcon className="size-3.5 sm:size-4" />
              <span>Global Users</span>
              <span
                className={`badge badge-xs sm:badge-sm font-bold ${
                  activeTab === "global"
                    ? "bg-primary-content text-primary border-transparent"
                    : "bg-base-300 text-base-content border-base-300"
                }`}
              >
                {nonFriendGlobalUsers.length}
              </span>
            </button>
          </div>

          {/* Search Input with Guaranteed Icon Spacing */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base-content/50 z-10">
              <SearchIcon className="size-4" />
            </div>
            <input
              type="text"
              placeholder="Search by name, language, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full !pl-10 focus:outline-none focus:ring-1 focus:ring-primary text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* TAB 1 CONTENT: YOUR FRIENDS (ONLY ACCEPTED FRIENDS) */}
        {activeTab === "friends" && (
          <section className="space-y-6">
            {loadingFriends ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : filteredFriends.length === 0 ? (
              searchTerm ? (
                <div className="card bg-base-200 p-8 text-center space-y-2">
                  <p className="font-semibold text-lg">No friends matched "{searchTerm}"</p>
                  <p className="text-xs opacity-60">Try searching for a different name or language.</p>
                </div>
              ) : (
                <NoFriendsFound />
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFriends.map((friend) => {
                  const isThisUnfriending = pendingUnfriendIds.has(friend._id?.toString());
                  const friendUnreadCount = unreadCounts[friend._id] || 0;

                  return (
                    <div
                      key={friend._id}
                      className="card bg-base-200 hover:shadow-xl transition-all duration-300 border border-base-300 overflow-hidden group relative"
                    >
                      {/* Unread Message Badge on Card */}
                      {friendUnreadCount > 0 && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="badge badge-secondary badge-sm font-bold animate-pulse shadow-md">
                            {friendUnreadCount} new message{friendUnreadCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      <div className="card-body p-5 space-y-4">
                        {/* Avatar & User info */}
                        <div
                          className="flex items-center gap-3.5 cursor-pointer"
                          onClick={() => setSelectedUserId(friend._id)}
                        >
                          <div className="avatar size-14 rounded-full ring-2 ring-primary/30 group-hover:ring-primary transition-all overflow-hidden relative">
                            {friend.profilePic ? (
                              <img src={friend.profilePic} alt={friend.fullName} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold text-lg">
                                {friend.fullName?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-bold text-base truncate flex items-center gap-1.5 ${
                                friend.nameColor ? getNameClass(friend.nameColor) : "text-base-content group-hover:text-primary"
                              }`}
                              style={friend.nameColor ? getNameStyle(friend.nameColor) : {}}
                            >
                              {friend.fullName}
                              <EyeIcon className="size-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                            </h3>
                            {friend.location && (
                              <div className="flex items-center text-xs text-base-content/80 mt-0.5 truncate font-medium">
                                <MapPinIcon className="size-3 mr-1 shrink-0 text-primary" />
                                {friend.location}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Language Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge badge-secondary text-secondary-content font-bold text-xs py-2">
                            {getLanguageFlag(friend.nativeLanguage)}
                            Native: {capitialize(friend.nativeLanguage)}
                          </span>
                          <span className="badge badge-outline border-base-300 font-bold text-xs py-2 text-base-content">
                            {getLanguageFlag(friend.learningLanguage)}
                            Learning: {capitialize(friend.learningLanguage)}
                          </span>
                        </div>

                        {friend.bio && (
                          <p className="text-xs text-base-content/85 line-clamp-2 italic bg-base-100/70 p-2 rounded-lg border border-base-300/50">
                            "{friend.bio}"
                          </p>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 pt-1">
                          <Link
                            to={`/chat/${friend._id}`}
                            className="btn btn-primary text-primary-content font-bold btn-sm flex-1 gap-1 min-w-0"
                          >
                            <MessageSquareIcon className="size-4 shrink-0" />
                            <span className="truncate">Message</span>
                            {friendUnreadCount > 0 && (
                              <span className="badge badge-xs badge-secondary font-black ml-1 shrink-0">
                                {friendUnreadCount}
                              </span>
                            )}
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnfriendUser(friend._id);
                            }}
                            disabled={isThisUnfriending}
                            className="btn btn-outline btn-error font-bold btn-sm gap-1 shrink-0"
                            title="Unfriend this user"
                          >
                            {isThisUnfriending ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <UserMinusIcon className="size-4 shrink-0" />
                            )}
                            <span>Unfriend</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2 CONTENT: GLOBAL USERS (EXCLUDING EXISTING FRIENDS) */}
        {activeTab === "global" && (
          <section className="space-y-6">
            {loadingGlobalUsers ? (
              <div className="flex justify-center py-16">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : filteredGlobalUsers.length === 0 ? (
              <div className="card bg-base-200 p-8 text-center space-y-2">
                <h3 className="font-semibold text-lg">No global users found</h3>
                <p className="text-sm opacity-70">
                  {searchTerm
                    ? `No users matching "${searchTerm}"`
                    : "All registered users are already your friends!"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredGlobalUsers.map((user) => {
                  const userIdStr = user._id?.toString();
                  const hasRequestBeenSent = outgoingRequestsIds.has(userIdStr);
                  const isThisUserPending = pendingSendIds.has(userIdStr);

                  return (
                    <div
                      key={user._id}
                      className="card bg-base-200 hover:shadow-xl transition-all duration-300 border border-base-300 overflow-hidden group"
                    >
                      <div className="card-body p-5 space-y-4">
                        {/* Avatar & Info */}
                        <div
                          className="flex items-center gap-3.5 cursor-pointer"
                          onClick={() => setSelectedUserId(user._id)}
                        >
                          <div className="avatar size-14 rounded-full group-hover:ring-2 ring-primary transition-all overflow-hidden">
                            {user.profilePic ? (
                              <img src={user.profilePic} alt={user.fullName} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-content font-bold text-lg">
                                {user.fullName?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-bold text-base truncate flex items-center gap-1.5 ${
                                user.nameColor ? getNameClass(user.nameColor) : "text-base-content group-hover:text-primary"
                              }`}
                              style={user.nameColor ? getNameStyle(user.nameColor) : {}}
                            >
                              {user.fullName}
                              <EyeIcon className="size-3.5 opacity-0 group-hover:opacity-70 transition-opacity" />
                            </h3>
                            {user.location && (
                              <div className="flex items-center text-xs text-base-content/80 mt-0.5 truncate font-medium">
                                <MapPinIcon className="size-3 mr-1 shrink-0 text-primary" />
                                {user.location}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Languages */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="badge badge-secondary text-secondary-content font-bold text-xs py-2">
                            {getLanguageFlag(user.nativeLanguage)}
                            Native: {capitialize(user.nativeLanguage)}
                          </span>
                          <span className="badge badge-outline border-base-300 font-bold text-xs py-2 text-base-content">
                            {getLanguageFlag(user.learningLanguage)}
                            Learning: {capitialize(user.learningLanguage)}
                          </span>
                        </div>

                        {user.bio && (
                          <p className="text-xs text-base-content/85 line-clamp-2 italic bg-base-100/70 p-2 rounded-lg border border-base-300/50">
                            "{user.bio}"
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 pt-1">
                          <button
                            className="btn btn-ghost border border-base-300 text-base-content hover:bg-base-200 font-bold btn-sm flex-1 min-w-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(user._id);
                            }}
                          >
                            <span className="truncate">View Profile</span>
                          </button>

                          <button
                            className={`btn btn-sm flex-1 font-bold min-w-0 ${
                              hasRequestBeenSent
                                ? "bg-base-300 text-base-content border border-base-300 cursor-not-allowed opacity-90"
                                : "btn-primary text-primary-content shadow-xs"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendFriendRequest(user._id);
                            }}
                            disabled={hasRequestBeenSent || isThisUserPending}
                          >
                            {isThisUserPending ? (
                              <span className="flex items-center justify-center gap-1">
                                <span className="loading loading-spinner loading-xs" />
                                <span>Sending...</span>
                              </span>
                            ) : hasRequestBeenSent ? (
                              <span className="flex items-center justify-center gap-1 font-bold">
                                <CheckCircleIcon className="size-4 shrink-0 text-success" />
                                <span className="truncate">Request Sent</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1">
                                <UserPlusIcon className="size-4 shrink-0" />
                                <span className="truncate">Add Friend</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
};

export default FriendsPage;
