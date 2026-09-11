import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  acceptFriendRequest,
  getUserProfile,
  sendFriendRequest,
  unfriendUser,
  updateMyProfile,
} from "../lib/api";
import {
  CheckCircleIcon,
  MapPinIcon,
  MessageSquareIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  XIcon,
  CalendarIcon,
  Edit2Icon,
  ShuffleIcon,
  PaletteIcon,
  SparklesIcon,
  SaveIcon,
  LayersIcon,
  SlidersIcon,
  GlobeIcon,
  UserIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { getLanguageFlag } from "./FriendCard";
import { capitialize, getNameStyle, getNameClass } from "../lib/utils";
import { LANGUAGES, THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import useAuthUser from "../hooks/useAuthUser";
import ReportUserModal from "./ReportUserModal";

// Popular 2-Color Gradient Presets for Quick Inspiration
const GRADIENT_PRESETS = [
  { name: "Cyber Neon", c1: "#00f2fe", c2: "#4facfe", angle: 135 },
  { name: "Sunset Flame", c1: "#ff416c", c2: "#ff4b2b", angle: 135 },
  { name: "Royal Violet", c1: "#b224ef", c2: "#7579ff", angle: 135 },
  { name: "Emerald Aurora", c1: "#11998e", c2: "#38ef7d", angle: 135 },
  { name: "Electric Gold", c1: "#f7971e", c2: "#ffd200", angle: 135 },
  { name: "Candy Prism", c1: "#fc00ff", c2: "#00dbde", angle: 135 },
  { name: "Rose Quartz", c1: "#f857a6", c2: "#ff5858", angle: 135 },
  { name: "Laser Blue", c1: "#6a11cb", c2: "#2575fc", angle: 135 },
];

// Quick Solid Color Presets
const SOLID_PRESETS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Crimson", hex: "#ef4444" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "White", hex: "#ffffff" },
];

const UserProfileModal = ({ userId, onClose, initialEditMode = false }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [showReportModal, setShowReportModal] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const { authUser } = useAuthUser();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Instant modal response if profile was recently fetched
  });

  const profile = data?.user;
  const { isSelf, isFriend, hasSentRequest, hasReceivedRequest, incomingRequestId } =
    data || {};

  const isCreator = Boolean(
    (profile?.email && profile.email.toLowerCase() === "umeshalla73@gmail.com") ||
    (isSelf && authUser?.email?.toLowerCase() === "umeshalla73@gmail.com") ||
    (profile?._id?.toString() === "6a9c34fb0c1697ab23476030") ||
    (profile?.fullName?.trim().toLowerCase() === "admin")
  );
  const isAdmin = Boolean(
    isCreator ||
    profile?.role === "admin" ||
    (isSelf && authUser?.role === "admin")
  );
  const isSubAdmin = Boolean(
    !isAdmin && (
      profile?.role === "subadmin" ||
      (isSelf && authUser?.role === "subadmin") ||
      (profile?.email && profile.email.toLowerCase() === "umeshalla1@gmail.com") ||
      (profile?._id?.toString() === "6a9bac6fd61a0fe57c965057")
    )
  );

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: "",
    nameColor: "",
    bio: "",
    nativeLanguage: "",
    learningLanguage: "",
    location: "",
    age: "",
    profilePic: "",
  });

  // RGB Customizer state
  const [colorMode, setColorMode] = useState("gradient"); // "single" | "gradient"
  const [singleHex, setSingleHex] = useState("#3b82f6");

  const [gradHex1, setGradHex1] = useState("#ff007f");
  const [gradHex2, setGradHex2] = useState("#00f0ff");
  const [gradAngle, setGradAngle] = useState(135);

  // Parse existing nameColor when loading profile
  useEffect(() => {
    if (profile && isSelf) {
      const existingColor = profile.nameColor || "linear-gradient(135deg, #ff007f, #00f0ff)";
      setEditForm({
        fullName: profile.fullName || "",
        nameColor: existingColor,
        bio: profile.bio || "",
        nativeLanguage: profile.nativeLanguage || "",
        learningLanguage: profile.learningLanguage || "",
        location: profile.location || "",
        age: profile.age || "",
        profilePic: profile.profilePic || "",
      });

      if (existingColor.startsWith("linear-gradient")) {
        setColorMode("gradient");
        const match = existingColor.match(/linear-gradient\((\d+)deg,\s*([^,]+),\s*([^)]+)\)/);
        if (match) {
          setGradAngle(Number(match[1]) || 135);
          const c1 = match[2].trim();
          const c2 = match[3].trim();
          setGradHex1(c1.startsWith("#") ? c1 : "#ff007f");
          setGradHex2(c2.startsWith("#") ? c2 : "#00f0ff");
        }
      } else if (existingColor.startsWith("#") || existingColor.startsWith("rgb")) {
        setColorMode("single");
        const hex = existingColor.startsWith("#") ? existingColor : "#3b82f6";
        setSingleHex(hex);
      }
    }
  }, [profile, isSelf]);

  // Sync color changes to editForm.nameColor
  const updateSingleFromHex = (hex) => {
    setSingleHex(hex);
    setEditForm((prev) => ({ ...prev, nameColor: hex }));
  };

  const updateGrad1FromHex = (hex) => {
    setGradHex1(hex);
    const newColor = `linear-gradient(${gradAngle}deg, ${hex}, ${gradHex2})`;
    setEditForm((prev) => ({ ...prev, nameColor: newColor }));
  };

  const updateGrad2FromHex = (hex) => {
    setGradHex2(hex);
    const newColor = `linear-gradient(${gradAngle}deg, ${gradHex1}, ${hex})`;
    setEditForm((prev) => ({ ...prev, nameColor: newColor }));
  };

  const updateGradAngle = (angle) => {
    setGradAngle(angle);
    const newColor = `linear-gradient(${angle}deg, ${gradHex1}, ${gradHex2})`;
    setEditForm((prev) => ({ ...prev, nameColor: newColor }));
  };

  const applyPreset = (preset) => {
    setColorMode("gradient");
    setGradHex1(preset.c1);
    setGradHex2(preset.c2);
    setGradAngle(preset.angle);
    const newColor = `linear-gradient(${preset.angle}deg, ${preset.c1}, ${preset.c2})`;
    setEditForm((prev) => ({ ...prev, nameColor: newColor }));
  };

  // Word count for bio (minimum 20 words)
  const bioWordsCount = editForm.bio ? editForm.bio.trim().split(/\s+/).filter(Boolean).length : 0;
  const isBioValid = bioWordsCount >= 20;

  // Update Profile Mutation with synchronous optimistic cache updating
  const { mutate: updateProfileMutation, isPending: isUpdating } = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (res) => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);

      if (res?.user) {
        queryClient.setQueryData(["authUser"], (old) => {
          if (!old) return old;
          return { ...old, user: { ...old.user, ...res.user } };
        });
        queryClient.setQueryData(["userProfile", userId], (old) => {
          if (!old) return old;
          return { ...old, user: { ...old.user, ...res.user } };
        });
      }

      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      const ageNum = Number(editForm.age);
      if (editForm.age && (isNaN(ageNum) || ageNum < 14)) {
        toast.error("You must be at least 14 years old.");
        return;
      }
    }
    if (editForm.bio && bioWordsCount < 20) {
      toast.error(
        `Bio must be at least 20 words (${bioWordsCount}/20). Tell other learners more about yourself!`
      );
      return;
    }

    const payload = { ...editForm };
    if (isAdmin) {
      payload.age = null;
      payload.location = "";
      payload.nativeLanguage = "";
      payload.learningLanguage = "";
    }
    updateProfileMutation(payload);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatars.rentcircle.ph/public/${idx}.png`;
    setEditForm((prev) => ({ ...prev, profilePic: randomAvatar }));
  };

  const { mutate: sendRequestMutation, isPending: isSending } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      toast.success("Friend request sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendReqs"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to send friend request");
    },
  });

  const { mutate: acceptRequestMutation, isPending: isAccepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      toast.success("Friend request accepted!");
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to accept friend request");
    },
  });

  const { mutate: unfriendMutation, isPending: isUnfriending } = useMutation({
    mutationFn: () => unfriendUser(userId),
    onSuccess: () => {
      toast.success("Unfriended successfully!");
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["globalUsers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to unfriend user");
    },
  });

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-base-100 text-base-content border border-base-300 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative max-h-[92dvh] sm:max-h-[88vh] flex flex-col">
        {/* Top Header / Close Button */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 sm:gap-2">
          {isSelf && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-xs btn-primary text-primary-content gap-1.5 font-bold shadow-sm"
              title="Edit Profile"
            >
              <Edit2Icon className="size-3.5" />
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-base-content hover:bg-base-300 hover:text-error transition-colors"
            aria-label="Close profile"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm font-bold text-base-content">Loading profile...</p>
          </div>
        ) : isError || !profile ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-error font-bold">Could not load user profile.</p>
            <button onClick={onClose} className="btn btn-sm btn-ghost border border-base-300 hover:bg-base-200 text-base-content font-bold">
              Close
            </button>
          </div>
        ) : isEditing ? (
          /* ============================================================ */
          /* EDIT PROFILE FORM MODE                                       */
          /* ============================================================ */
          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-base-300 pb-3 pr-14">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <SparklesIcon className="size-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-base-content leading-tight">Edit Profile</h3>
                  <p className="text-xs text-base-content/70">Personalize your identity and preferences</p>
                </div>
              </div>
            </div>

            {/* Avatar & Username Card */}
            <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300 space-y-4">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="w-16 h-16 rounded-full ring-2 ring-primary bg-base-300 overflow-hidden shadow-sm">
                    {editForm.profilePic ? (
                      <img src={editForm.profilePic} alt="Avatar" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-extrabold text-xl">
                        {editForm.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-base-content mb-1.5">Profile Avatar</p>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="btn btn-xs btn-ghost border border-base-300 bg-base-100 hover:bg-base-200 text-base-content gap-1.5 font-bold"
                  >
                    <ShuffleIcon className="size-3.5 text-primary" />
                    <span>Generate Avatar</span>
                  </button>
                </div>
              </div>

              {/* Full Name / Display Name */}
              <div>
                <label className="label py-1">
                  <span className="label-text font-bold text-xs text-base-content flex items-center gap-1.5">
                    <UserIcon className="size-3.5 text-primary" />
                    Username / Display Name
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="input input-sm sm:input-md input-bordered w-full bg-base-100 text-base-content font-bold border-base-300 focus:border-primary placeholder:text-base-content/40"
                  placeholder="Enter unique username"
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* APP THEME SELECTOR                                            */}
            {/* ============================================================ */}
            <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="label-text font-bold text-xs text-base-content flex items-center gap-1.5">
                  <PaletteIcon className="size-4 text-primary" />
                  <span>App Theme</span>
                </label>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-primary text-primary-content capitalize shadow-2xs">
                  Active: {theme}
                </span>
              </div>
              <div className="relative">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="select select-sm sm:select-md select-bordered w-full bg-base-100 text-base-content font-bold border-base-300 focus:border-primary focus:outline-hidden"
                >
                  {THEMES.map((th) => (
                    <option
                      key={`theme-opt-${th.name}`}
                      value={th.name}
                      className="bg-base-100 text-base-content font-semibold py-1.5"
                    >
                      {th.label} Theme
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-base-content/70">
                Choose any DaisyUI theme to change the colors across the entire application.
              </p>
            </div>

            {/* ============================================================ */}
            {/* NAME COLOR / STYLE CUSTOMIZER                                */}
            {/* ============================================================ */}
            <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="label-text font-bold text-xs flex items-center gap-1.5 text-base-content">
                  <SparklesIcon className="size-4 text-primary" />
                  <span>Name Color & Styling</span>
                </label>

                {/* Mode Switcher */}
                <div className="join join-horizontal bg-base-300 p-0.5 rounded-lg border border-base-300">
                  <button
                    type="button"
                    onClick={() => {
                      setColorMode("single");
                      updateSingleFromHex(singleHex);
                    }}
                    className={`join-item btn btn-xs ${
                      colorMode === "single"
                        ? "btn-primary text-primary-content font-bold shadow-xs"
                        : "btn-ghost text-base-content font-bold"
                    }`}
                  >
                    <SlidersIcon className="size-3 mr-1" /> Solid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setColorMode("gradient");
                      const newColor = `linear-gradient(${gradAngle}deg, ${gradHex1}, ${gradHex2})`;
                      setEditForm((prev) => ({ ...prev, nameColor: newColor }));
                    }}
                    className={`join-item btn btn-xs ${
                      colorMode === "gradient"
                        ? "btn-primary text-primary-content font-bold shadow-xs"
                        : "btn-ghost text-base-content font-bold"
                    }`}
                  >
                    <LayersIcon className="size-3 mr-1" /> Gradient
                  </button>
                </div>
              </div>

              {colorMode === "single" ? (
                /* SINGLE COLOR CONTROLS */
                <div className="space-y-3 bg-base-100 p-3.5 rounded-xl border border-base-300">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={singleHex}
                      onChange={(e) => updateSingleFromHex(e.target.value)}
                      className="w-11 h-9 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-200"
                      title="Pick custom color"
                    />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-base-content">Color Hex</p>
                      <input
                        type="text"
                        value={singleHex}
                        onChange={(e) => updateSingleFromHex(e.target.value)}
                        className="input input-xs input-bordered w-full font-mono text-xs mt-0.5 bg-base-100 text-base-content font-bold border-base-300"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  {/* Solid Presets */}
                  <div className="pt-2 border-t border-base-300">
                    <p className="text-[11px] font-bold text-base-content uppercase tracking-wider mb-2">
                      Quick Solid Colors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SOLID_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => updateSingleFromHex(p.hex)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                            singleHex.toLowerCase() === p.hex.toLowerCase()
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-base-300 bg-base-200/60 hover:bg-base-300 text-base-content"
                          }`}
                        >
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: p.hex }} />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* DUAL-COLOR GRADIENT CONTROLS */
                <div className="space-y-3 bg-base-100 p-3.5 rounded-xl border border-base-300">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Color 1 */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-base-content flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: gradHex1 }} />
                        <span>Color 1</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradHex1}
                          onChange={(e) => updateGrad1FromHex(e.target.value)}
                          className="w-9 h-8 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-200 shrink-0"
                        />
                        <input
                          type="text"
                          value={gradHex1}
                          onChange={(e) => updateGrad1FromHex(e.target.value)}
                          className="input input-xs input-bordered w-full font-mono text-[11px] bg-base-100 text-base-content font-bold border-base-300"
                        />
                      </div>
                    </div>

                    {/* Color 2 */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-base-content flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: gradHex2 }} />
                        <span>Color 2</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={gradHex2}
                          onChange={(e) => updateGrad2FromHex(e.target.value)}
                          className="w-9 h-8 rounded-lg cursor-pointer border border-base-300 p-0.5 bg-base-200 shrink-0"
                        />
                        <input
                          type="text"
                          value={gradHex2}
                          onChange={(e) => updateGrad2FromHex(e.target.value)}
                          className="input input-xs input-bordered w-full font-mono text-[11px] bg-base-100 text-base-content font-bold border-base-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Gradient Angle Direction */}
                  <div className="pt-2 border-t border-base-300 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-base-content">
                      <span>Gradient Direction</span>
                      <span className="font-mono text-primary font-extrabold">{gradAngle}°</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { label: "45° Diagonal", angle: 45 },
                        { label: "90° Horizontal", angle: 90 },
                        { label: "135° Standard", angle: 135 },
                        { label: "180° Vertical", angle: 180 },
                      ].map((btn) => (
                        <button
                          key={btn.angle}
                          type="button"
                          onClick={() => updateGradAngle(btn.angle)}
                          className={`btn btn-xs ${
                            gradAngle === btn.angle
                              ? "btn-primary text-primary-content font-bold"
                              : "btn-ghost border border-base-300 bg-base-200/50 hover:bg-base-300 text-base-content font-semibold"
                          }`}
                        >
                          {btn.angle}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Gradient Presets */}
                  <div className="pt-2 border-t border-base-300">
                    <p className="text-[11px] font-bold text-base-content uppercase tracking-wider mb-2">
                      Popular Gradient Presets
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GRADIENT_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-base-300 bg-base-200/60 hover:bg-base-300 text-base-content hover:text-primary transition-all text-xs font-bold"
                        >
                          <span
                            className="size-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}
                          />
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Live Name Preview */}
              <div className="p-3.5 rounded-xl bg-base-100 border border-base-300 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-base-content">
                    Live Chat Name Preview
                  </p>
                  <span className="badge badge-xs badge-success text-success-content font-bold">Live</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/70 border border-base-300/80">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-black text-xs text-primary-content shrink-0 shadow-xs">
                    {editForm.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span
                    className={`font-black text-sm truncate ${
                      editForm.nameColor ? getNameClass(editForm.nameColor) : "text-base-content"
                    }`}
                    style={editForm.nameColor ? getNameStyle(editForm.nameColor) : {}}
                  >
                    {editForm.fullName || "Your Display Name"}
                  </span>
                  <span className="text-[11px] text-base-content/60 font-semibold ml-auto shrink-0">Just now</span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* LANGUAGES & LOCATION & AGE (Hidden for Admin)                */}
            {/* ============================================================ */}
            {!isAdmin && (
              <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-base-content flex items-center gap-1.5">
                  <GlobeIcon className="size-4 text-primary" />
                  <span>Languages & Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Native Language Dropdown */}
                  <div>
                    <label className="label py-1">
                      <span className="label-text font-bold text-xs text-base-content">Native Language</span>
                    </label>
                    <select
                      value={editForm.nativeLanguage?.toLowerCase() || ""}
                      onChange={(e) => setEditForm({ ...editForm, nativeLanguage: e.target.value })}
                      className="select select-sm select-bordered w-full bg-base-100 text-base-content font-bold border-base-300 focus:border-primary focus:outline-hidden"
                    >
                      <option value="" disabled className="bg-base-100 text-base-content font-medium">
                        Select your native language
                      </option>
                      {LANGUAGES.map((lang) => (
                        <option
                          key={`native-${lang}`}
                          value={lang.toLowerCase()}
                          className="bg-base-100 text-base-content font-medium py-1"
                        >
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Learning Language Dropdown */}
                  <div>
                    <label className="label py-1">
                      <span className="label-text font-bold text-xs text-base-content">Learning Language</span>
                    </label>
                    <select
                      value={editForm.learningLanguage?.toLowerCase() || ""}
                      onChange={(e) => setEditForm({ ...editForm, learningLanguage: e.target.value })}
                      className="select select-sm select-bordered w-full bg-base-100 text-base-content font-bold border-base-300 focus:border-primary focus:outline-hidden"
                    >
                      <option value="" disabled className="bg-base-100 text-base-content font-medium">
                        Select learning language
                      </option>
                      {LANGUAGES.map((lang) => (
                        <option
                          key={`learn-${lang}`}
                          value={lang.toLowerCase()}
                          className="bg-base-100 text-base-content font-medium py-1"
                        >
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Location */}
                  <div>
                    <label className="label py-1">
                      <span className="label-text font-bold text-xs text-base-content">Location</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="input input-sm input-bordered w-full bg-base-100 text-base-content font-semibold border-base-300 focus:border-primary placeholder:text-base-content/40"
                      placeholder="e.g. Tokyo, Japan"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="label py-1">
                      <span className="label-text font-bold text-xs text-base-content">Age (14+)</span>
                    </label>
                    <input
                      type="number"
                      min="14"
                      max="120"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="input input-sm input-bordered w-full bg-base-100 text-base-content font-semibold border-base-300 focus:border-primary placeholder:text-base-content/40"
                      placeholder="e.g. 22"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* BIO / ABOUT SECTION WITH 20-WORD MINIMUM COUNTER             */}
            {/* ============================================================ */}
            <div className="bg-base-200/80 p-4 rounded-2xl border border-base-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="label-text font-bold text-xs text-base-content">
                  About You / Bio
                </label>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full transition-colors ${
                    isBioValid
                      ? "bg-success/20 text-success"
                      : editForm.bio
                      ? "bg-warning/20 text-warning"
                      : "bg-base-300 text-base-content/70"
                  }`}
                >
                  {bioWordsCount} / 20 words {isBioValid ? "✓" : `(${20 - bioWordsCount} more)`}
                </span>
              </div>
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="textarea textarea-bordered w-full bg-base-100 text-base-content text-sm font-medium border-base-300 focus:border-primary leading-relaxed placeholder:text-base-content/40"
                placeholder="Share a bit about yourself, your learning hobbies, and conversation goals (at least 20 words)..."
              />
              <p className="text-[11px] text-base-content/70">
                A rich bio helps potential language partners find you easily.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-base-300 sticky bottom-0 bg-base-100/95 backdrop-blur-sm py-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-sm btn-ghost border border-base-300 text-base-content hover:bg-base-300 flex-1 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="btn btn-sm btn-primary text-primary-content flex-1 gap-2 font-bold shadow-md"
              >
                {isUpdating ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          /* ============================================================ */
          /* VIEW PROFILE MODE                                            */
          /* ============================================================ */
          <div className="flex-1 overflow-y-auto">
            {/* Header / Banner area */}
            <div className="h-24 sm:h-28 bg-gradient-to-r from-primary/25 via-secondary/25 to-accent/25 relative" />

            <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-0 space-y-4 sm:space-y-5 -mt-10 sm:-mt-12 relative">
              {/* Profile Avatar & Names */}
              <div className="flex items-end justify-between">
                <div className="avatar">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-4 ring-base-100 bg-base-300 shadow-lg overflow-hidden">
                    {profile.profilePic ? (
                      <img src={profile.profilePic} alt={profile.fullName} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-black text-3xl">
                        {profile.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {isSelf && (
                    <span className="badge bg-primary/15 text-primary border border-primary/30 font-bold py-3 px-3 shadow-xs">
                      Your Profile
                    </span>
                  )}
                  {isFriend && (
                    <span className="badge badge-success text-success-content font-bold gap-1 py-3 px-3 shadow-xs">
                      <UserCheckIcon className="size-3.5" /> Friends
                    </span>
                  )}
                </div>
              </div>

              {/* Name & Meta */}
              <div>
                <h2
                  className={`text-2xl font-black tracking-tight flex items-center gap-2 flex-wrap ${getNameClass(profile.nameColor, "text-base-content")}`}
                  style={getNameStyle(profile.nameColor)}
                >
                  <span>{profile.fullName}</span>
                  {isSubAdmin && (
                    <span title="Sub-Admin" className="badge badge-accent badge-sm font-black px-1.5 py-0.5 shrink-0 inline-flex items-center justify-center">
                      <ShieldCheckIcon className="size-3.5 fill-current" />
                    </span>
                  )}
                </h2>
                {isCreator || isAdmin ? (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="badge badge-primary font-bold text-xs uppercase tracking-wider gap-1.5 shadow-sm">
                      👑 Creator
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-base-content/80 mt-1">
                    {profile.location && (
                      <span className="flex items-center">
                        <MapPinIcon className="size-4 mr-1 text-primary shrink-0" />
                        {profile.location}
                      </span>
                    )}
                    {profile.age && (
                      <span className="badge badge-sm bg-base-200 border border-base-300 text-base-content font-bold">
                        {profile.age} yrs old
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Languages (Hidden for Admin) */}
              {!isAdmin && (profile.nativeLanguage || profile.learningLanguage) && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-base-content">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.nativeLanguage && (
                      <span className="badge badge-secondary text-secondary-content font-bold py-3 px-3 shadow-2xs">
                        {getLanguageFlag(profile.nativeLanguage)}
                        Native: {capitialize(profile.nativeLanguage)}
                      </span>
                    )}
                    {profile.learningLanguage && (
                      <span className="badge badge-outline border-base-300 font-bold py-3 px-3 text-base-content shadow-2xs">
                        {getLanguageFlag(profile.learningLanguage)}
                        Learning: {capitialize(profile.learningLanguage)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div className="space-y-1.5">
                  <p className="text-xs font-black uppercase tracking-wider text-base-content">About</p>
                  <p className="text-sm bg-base-200/90 p-3.5 rounded-xl text-base-content font-medium leading-relaxed border border-base-300">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Joined Date */}
              {profile.createdAt && (
                <div className="flex items-center text-xs text-base-content/80 font-bold">
                  <CalendarIcon className="size-3.5 mr-1.5 text-primary" />
                  Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </div>
              )}

              {/* Pending Staff Nomination Callout for Self */}
              {isSelf && authUser?.subadminInvitation?.status === "pending" && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                      <ZapIcon className="size-4" />
                      Pending Sub-Admin Nomination
                    </p>
                    <p className="text-[11px] text-base-content/70">
                      You have an active invitation to join the staff moderation team.
                    </p>
                  </div>
                  <Link
                    to="/notifications"
                    onClick={onClose}
                    className="btn btn-xs btn-warning text-warning-content font-bold shrink-0 shadow-xs"
                  >
                    View Invitation
                  </Link>
                </div>
              )}

              {/* Staff Privileges Callout for Self */}
              {isSelf && (isAdmin || isSubAdmin) && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheckIcon className="size-4" />
                      {isCreator ? "Platform Creator Access" : isAdmin ? "Platform Administrator Privileges" : "Sub-Admin Moderation Privileges"}
                    </p>
                    <p className="text-[11px] text-base-content/70">
                      You have active staff access to the moderation command center and reports queue.
                    </p>
                  </div>
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className="btn btn-xs btn-primary text-primary-content font-bold shrink-0 shadow-xs"
                  >
                    Staff Portal
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                {isSelf ? (
                  <div className="flex gap-2 sm:gap-2.5">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary text-primary-content flex-1 gap-2 font-bold shadow-md btn-sm sm:btn-md"
                    >
                      <Edit2Icon className="size-4" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="btn btn-ghost border border-base-300 text-base-content hover:bg-base-200 font-bold flex-1 btn-sm sm:btn-md"
                    >
                      Close
                    </button>
                  </div>
                ) : isFriend ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                    <Link
                      to={`/chat/${profile._id}`}
                      className="btn btn-primary text-primary-content flex-1 gap-2 font-bold shadow-md btn-sm sm:btn-md"
                      onClick={onClose}
                    >
                      <MessageSquareIcon className="size-4" />
                      Message
                    </Link>

                    <button
                      onClick={() => unfriendMutation()}
                      disabled={isUnfriending}
                      className="btn btn-outline btn-error hover:bg-error hover:text-error-content flex-1 gap-1.5 font-bold btn-sm sm:btn-md transition-colors shadow-2xs"
                    >
                      {isUnfriending ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <UserMinusIcon className="size-4" />
                      )}
                      Unfriend
                    </button>
                  </div>
                ) : hasReceivedRequest ? (
                  <button
                    onClick={() => acceptRequestMutation(incomingRequestId)}
                    disabled={isAccepting}
                    className="btn btn-primary text-primary-content w-full font-bold shadow-md btn-sm sm:btn-md"
                  >
                    {isAccepting ? (
                      <span className="loading loading-spinner loading-xs mr-2" />
                    ) : (
                      <UserCheckIcon className="size-4 mr-1.5" />
                    )}
                    Accept Friend Request
                  </button>
                ) : hasSentRequest ? (
                  <button className="btn bg-base-300 text-base-content border border-base-300 font-bold w-full cursor-not-allowed btn-sm sm:btn-md">
                    <CheckCircleIcon className="size-4 mr-1.5 text-success" />
                    Request Sent
                  </button>
                ) : (
                  <button
                    onClick={() => sendRequestMutation(profile._id)}
                    disabled={isSending}
                    className="btn btn-primary text-primary-content w-full font-bold shadow-md btn-sm sm:btn-md"
                  >
                    {isSending ? (
                      <span className="loading loading-spinner loading-xs mr-2" />
                    ) : (
                      <UserPlusIcon className="size-4 mr-1.5" />
                    )}
                    Send Friend Request
                  </button>
                )}

                {!isSelf && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      className="btn btn-ghost btn-xs text-base-content/40 hover:text-error gap-1.5 transition-colors"
                    >
                      <ShieldAlertIcon className="size-3.5" />
                      <span>Report User</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showReportModal && profile && (
          <ReportUserModal
            targetUser={profile}
            context="User Profile"
            onClose={() => setShowReportModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
