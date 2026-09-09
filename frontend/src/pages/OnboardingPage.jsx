import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import { CameraIcon, LoaderIcon, MapPinIcon, ShipWheelIcon, ShuffleIcon } from "lucide-react";
import { LANGUAGES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import ThemeSelector from "../components/ThemeSelector";

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const { theme } = useThemeStore();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    nativeLanguage: authUser?.nativeLanguage || "",
    learningLanguage: authUser?.learningLanguage || "",
    location: authUser?.location || "",
    age: authUser?.age || "",
    profilePic: authUser?.profilePic || "",
  });

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },

    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to complete onboarding");
    },
  });

  const bioWordsCount = (formState.bio || "").trim().split(/\s+/).filter(Boolean).length;
  const isBioValid = bioWordsCount >= 20;

  const handleSubmit = (e) => {
    e.preventDefault();

    const ageNum = Number(formState.age);
    if (!formState.age || isNaN(ageNum) || ageNum < 14) {
      toast.error("You must be at least 14 years old to join Streamify.");
      return;
    }

    if (bioWordsCount < 20) {
      toast.error(`Please write at least 20 words in your bio (currently ${bioWordsCount} words) to complete your profile.`);
      return;
    }

    onboardingMutation(formState);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1; // 1-100 included
    const randomAvatar = `https://avatars.rentcircle.ph/public/${idx}.png`;

    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("Random profile picture generated!");
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 relative" data-theme={theme}>
      <div className="absolute top-3 right-3 sm:top-5 sm:right-6 z-20">
        <ThemeSelector />
      </div>

      <div className="card bg-base-200 w-full max-w-3xl shadow-xl">
        <div className="card-body p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6">Complete Your Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PROFILE PIC CONTAINER */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* IMAGE PREVIEW */}
              <div className="size-32 rounded-full bg-base-300 overflow-hidden">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CameraIcon className="size-12 text-base-content opacity-40" />
                  </div>
                )}
              </div>

              {/* Generate Random Avatar BTN */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleRandomAvatar} className="btn btn-accent text-accent-content font-bold">
                  <ShuffleIcon className="size-4 mr-2" />
                  Generate Random Avatar
                </button>
              </div>
            </div>

            {/* FULL NAME */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Full Name</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formState.fullName}
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Enter your full name"
              />
            </div>

            {/* BIO WITH MINIMUM WORD COUNT */}
            <div className="form-control">
              <div className="flex items-center justify-between pb-1.5">
                <label className="label-text font-semibold text-xs flex items-center gap-1.5">
                  <span>Bio / About Yourself</span>
                  <span className="badge badge-primary badge-xs font-bold">Min 20 words</span>
                </label>
                <span
                  className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full transition-colors ${
                    isBioValid
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {bioWordsCount} / 20 words {isBioValid ? "✓" : `(${20 - bioWordsCount} more)`}
                </span>
              </div>
              <textarea
                name="bio"
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className={`textarea textarea-bordered h-28 leading-relaxed text-sm ${
                  formState.bio && !isBioValid ? "border-warning focus:border-warning" : ""
                }`}
                placeholder="Introduce yourself properly! E.g. Hi everyone! I am passionate about learning Spanish and English. I enjoy traveling, exploring different cultures, reading books, and I am looking for friendly conversation partners to practice speaking together."
                required
              />
              <span className="text-[11px] text-base-content/50 mt-1">
                Writing a detailed bio helps other learners and native speakers get to know you better.
              </span>
            </div>

            {/* LANGUAGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NATIVE LANGUAGE */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Native Language</span>
                </label>
                <select
                  name="nativeLanguage"
                  value={formState.nativeLanguage}
                  onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                  className="select select-bordered w-full"
                >
                  <option value="" className="bg-base-100 text-base-content font-medium">Select your native language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`native-${lang}`} value={lang.toLowerCase()} className="bg-base-100 text-base-content font-medium py-1">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* LEARNING LANGUAGE */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Learning Language</span>
                </label>
                <select
                  name="learningLanguage"
                  value={formState.learningLanguage}
                  onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
                  className="select select-bordered w-full bg-base-100 text-base-content"
                >
                  <option value="" className="bg-base-100 text-base-content font-medium">Select language you're learning</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`learning-${lang}`} value={lang.toLowerCase()} className="bg-base-100 text-base-content font-medium py-1">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LOCATION & AGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* LOCATION */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-10"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* AGE (14+ ONLY) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-1.5 font-medium">
                    <span>Age</span>
                    <span className="badge badge-primary badge-xs font-bold">14+ Only</span>
                  </span>
                </label>
                <input
                  type="number"
                  name="age"
                  min="14"
                  max="120"
                  value={formState.age}
                  onChange={(e) => setFormState({ ...formState, age: e.target.value })}
                  className="input input-bordered w-full font-medium"
                  placeholder="Enter your age (14+)"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}

            <button className="btn btn-primary text-primary-content font-bold w-full" disabled={isPending} type="submit">
              {!isPending ? (
                <>
                  <ShipWheelIcon className="size-5 mr-2" />
                  Complete Onboarding
                </>
              ) : (
                <>
                  <LoaderIcon className="animate-spin size-5 mr-2" />
                  Onboarding...
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default OnboardingPage;
