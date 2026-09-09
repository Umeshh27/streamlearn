import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ShipWheelIcon,
  CheckCircle2,
  ArrowRightIcon,
  ShieldCheckIcon,
  Users,
  MessageSquareWarning,
  Video,
  Scale,
  Globe,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import ThemeSelector from "../components/ThemeSelector";

/* ─── Helper to highlight key words wrapped in **word** ─── */
const renderHighlightedText = (text) => {
  if (typeof text !== "string") return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const clean = part.slice(2, -2);
      return (
        <span
          key={index}
          className="bg-primary/15 text-primary font-bold px-1.5 py-0.5 rounded mx-0.5"
        >
          {clean}
        </span>
      );
    }
    return part;
  });
};

/* ─── Rule Data ─── */
const RULE_CATEGORIES = [
  {
    id: "eligibility",
    number: "01",
    title: "Eligibility & Access",
    subtitle: "Who can join and what you unlock",
    icon: Users,
    color: "primary",
    rules: [
      {
        text: "Users must be **at least 14 years old** before entering or registering on Streamify.",
      },
      {
        text: "This website is **100% free** and you are required to register in order to actively participate.",
      },
      {
        text: "Registering is free and will unlock all features including **global chat rooms**, **1-on-1 video calls**, and **AI voice tutoring**.",
      },
      {
        text: "Learners of **all skill levels (Beginner to Fluent)** are welcome to join as long as they meet the minimum 14 years of age requirement.",
      },
    ],
  },
  {
    id: "conduct",
    number: "02",
    title: "Community Conduct",
    subtitle: "Keeping our learning space respectful",
    icon: MessageSquareWarning,
    color: "secondary",
    rules: [
      {
        text: "This website is for educational language learning and cultural exchange. It is **strictly not meant to be a dating or matchmaking service**.",
      },
      {
        text: "**Do not flood or disrupt chat rooms** in any way. You will be banned from the lounge if you spam or disrupt other learners.",
      },
      {
        text: "**Do not post obscene, vulgar, or inappropriate messages** in text chat, in voice memos, or on webcam video calls.",
      },
      {
        text: "**Do not advertise** other websites, commercial products, or unrelated social media accounts.",
      },
    ],
  },
  {
    id: "safety",
    number: "03",
    title: "Safety & Privacy",
    subtitle: "Protecting yourself and others",
    icon: ShieldCheckIcon,
    color: "accent",
    rules: [
      {
        text: "**Do not share sensitive personal information** such as home address, phone numbers, financial details, passwords, or government IDs with other users.",
      },
      {
        text: "**Do not bully, harass, stalk, threaten, or intimidate** any other community member. Discrimination based on race, nationality, religion, gender, or orientation is strictly prohibited.",
      },
      {
        text: "**Report violations immediately** using the in-app reporting tools or by contacting a community moderator.",
      },
    ],
  },
  {
    id: "video",
    number: "04",
    title: "1-on-1 Video Etiquette",
    subtitle: "Standards for live peer calls",
    icon: Video,
    color: "info",
    rules: [
      {
        text: "**Appropriate attire is required at all times** during 1-on-1 video calls. Any nudity or suggestive conduct results in an instant permanent ban.",
      },
      {
        text: "**Respect boundaries and time limits**. Both participants must agree before extending or switching conversation topics.",
      },
      {
        text: "**Recording or screenshotting without mutual consent is strictly prohibited** and violates our community trust policy.",
      },
    ],
  },
  {
    id: "content",
    number: "05",
    title: "Content & Legal",
    subtitle: "Platform compliance and ownership",
    icon: Scale,
    color: "warning",
    rules: [
      {
        text: "Users retain ownership of content they create, but grant Streamify a **license to transmit and display** content within the service.",
      },
      {
        text: "**Do not post copyrighted materials**, unauthorized intellectual property, or content that infringes on third-party rights.",
      },
      {
        text: "Streamify reserves the right to **moderate, remove content, or suspend accounts** that violate these guidelines at its sole discretion.",
      },
    ],
  },
];

const FEATURES = [
  { icon: Globe, label: "Global Chat Rooms", desc: "Connect across cultures" },
  { icon: Video, label: "1-on-1 Video Calls", desc: "Face-to-face language practice" },
  { icon: Sparkles, label: "AI Voice Tutor", desc: "Interactive AI practice" },
  { icon: BookOpen, label: "All Skill Levels", desc: "Beginner to Fluent" },
];

const RulesPage = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);

  // Ensure scroll position is always reset to the very top upon entering/reloading the rules page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  let globalRuleNum = 0;

  return (
    <div
      className="min-h-screen bg-base-100 text-base-content flex flex-col overflow-x-hidden"
      data-theme={theme}
    >
      {/* ─── Navbar ─── */}
      <header className="border-b border-base-300 bg-base-100/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <ShipWheelIcon className="size-7 text-primary" />
            <span className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
              Streamify
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSelector />
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          HERO — Full-width visual with gradient overlay
         ═══════════════════════════════════════════════ */}
      <section
        id="hero-section"
        className="w-full shrink-0 relative overflow-hidden block min-h-[460px] md:min-h-[520px] z-10"
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-base-200/80 to-secondary/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative container mx-auto px-4 sm:px-6 max-w-6xl py-12 md:py-20 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <ShieldCheckIcon className="size-4" />
                <span>Safe & Free Community</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-base-content leading-[1.1]">
                Welcome to{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  Streamify
                </span>
              </h1>

              <p className="text-base sm:text-lg text-base-content/65 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Join a global community of language learners aged{" "}
                <strong className="text-base-content font-bold">14+</strong>. Practice speaking
                with native speakers through <strong className="text-base-content font-bold">1-on-1 video calls</strong>,
                join live chat rooms, and level up with AI-powered
                voice tutoring — all completely <strong className="text-base-content font-bold">free</strong>.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2.5 justify-center lg:justify-start pt-1">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.label}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-base-100/80 border border-base-300/70 shadow-sm text-xs font-semibold text-base-content/75 shrink-0"
                    >
                      <Icon className="size-3.5 text-primary shrink-0" />
                      <span>{f.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-center lg:justify-start w-full">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("rules-section")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="btn btn-primary text-primary-content btn-sm sm:btn-md shadow-lg font-bold px-5 sm:px-8 gap-2 hover:shadow-primary/25 transition-all duration-300 w-full sm:w-auto text-center cursor-pointer"
                >
                  <span>Read Community Rules</span>
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Glow behind image */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-base-300/60 bg-base-100 min-h-[200px]">
                  <img
                    src="/rules-community.jpg"
                    alt="Streamify Global Community"
                    className="w-full h-auto object-cover block"
                    loading="eager"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-3 left-2 sm:-bottom-5 sm:-left-5 bg-base-100 border border-base-300 rounded-2xl shadow-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2.5 sm:gap-3 z-20">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-base-content leading-tight">100% Free</div>
                    <div className="text-[11px] text-base-content/50">No credit card needed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          COMMUNITY STATS BAR
         ═══════════════════════════════════════════════ */}
      <section className="w-full shrink-0 border-y border-base-300 bg-base-200/50 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl py-6 sm:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "20+", label: "Languages Supported" },
              { value: "14+", label: "Minimum Age" },
              { value: "Free", label: "Forever Free" },
              { value: "24/7", label: "Moderated & Safe" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-base-content/50 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          RULES SECTION
         ═══════════════════════════════════════════════ */}
      <main id="rules-section" className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl py-14 sm:py-20">
          {/* Section Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              <BookOpen className="size-3.5" />
              Please read carefully
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-base-content">
              Rules & Regulations
            </h2>
            <p className="text-sm sm:text-base text-base-content/55 mt-3 max-w-2xl mx-auto leading-relaxed">
              These rules ensure everyone's safety and a positive learning experience
              across our chat rooms, video calls, and AI tutoring features.
            </p>
          </div>

          {/* Rules Grid */}
          <div className="space-y-6">
            {RULE_CATEGORIES.map((category) => {
              const IconComponent = category.icon;

              return (
                <div
                  key={category.id}
                  className="group rounded-2xl border border-base-300/80 bg-base-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-4 px-5 sm:px-7 py-5 bg-gradient-to-r from-base-200/80 to-base-200/30 border-b border-base-300/60">
                    <div className={`flex items-center justify-center size-11 rounded-xl bg-${category.color}/10 text-${category.color} shrink-0 shadow-sm`}>
                      <IconComponent className="size-5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-base-content">
                          {category.title}
                        </h3>
                        <span className="text-[10px] font-bold text-base-content/25 uppercase tracking-widest hidden sm:inline">
                          {category.number}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-base-content/45 font-medium mt-0.5">
                        {category.subtitle}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center justify-center size-8 rounded-lg bg-base-300/50 text-base-content/30 text-xs font-bold">
                      {category.rules.length}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="divide-y divide-base-200/80">
                    {category.rules.map((rule, ruleIdx) => {
                      globalRuleNum++;
                      const num = globalRuleNum;

                      return (
                        <div
                          key={ruleIdx}
                          className="flex items-start gap-4 px-5 sm:px-7 py-4 sm:py-5 hover:bg-base-200/30 transition-colors duration-200"
                        >
                          {/* Number + Check */}
                          <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                            <span className="text-xs font-bold tabular-nums w-5 text-right text-base-content/30">
                              {String(num).padStart(2, "0")}
                            </span>
                            <CheckCircle2 className="size-[18px] text-primary/70" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed text-base-content/80">
                              {renderHighlightedText(rule.text)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ═══════════════════════════════════════════════
              AGREEMENT SECTION
             ═══════════════════════════════════════════════ */}
          <div className="mt-14 sm:mt-16 relative">
            {/* Decorative glow */}
            <div className="absolute -inset-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl blur-xl" />

            <div className="relative rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/[0.03] via-base-100 to-base-200/50 shadow-lg overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />

              <div className="p-4 sm:p-8 md:p-10 space-y-5 sm:space-y-7">
                {/* Mini illustration */}
                <div className="flex justify-center">
                  <div className="w-48 sm:w-56 rounded-2xl overflow-hidden border border-base-300/50 shadow-md">
                    <img
                      src="/community-learners.jpg"
                      alt="Join the Streamify community"
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Heading */}
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-base-content">
                    Ready to join?
                  </h3>
                  <p className="text-xs sm:text-sm text-base-content/50 mt-1 max-w-md mx-auto">
                    Accept the community rules and create your free account to start learning with people worldwide.
                  </p>
                </div>

                {/* Checkbox */}
                <div className="flex items-start gap-3 sm:gap-4 bg-base-200/60 border border-base-300/60 rounded-xl p-3.5 sm:p-5 max-w-xl mx-auto">
                  <input
                    type="checkbox"
                    id="agree-rules"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="checkbox checkbox-primary checkbox-sm sm:checkbox-md mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor="agree-rules"
                    className="text-xs sm:text-sm font-semibold cursor-pointer select-none text-base-content leading-relaxed"
                  >
                    I have read, understood, and agree to all the community rules
                    above and confirm I am at least{" "}
                    <span className="text-primary font-bold">14 years old</span>.
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1 w-full">
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    disabled={!agreed}
                    className={`btn btn-md sm:btn-lg font-bold px-4 sm:px-8 gap-2 w-full sm:w-auto transition-all duration-300 ${
                      agreed
                        ? "btn-primary text-primary-content shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        : "bg-base-200 text-base-content/85 border-2 border-base-content/30 cursor-not-allowed hover:bg-base-200 shadow-none opacity-90"
                    }`}
                  >
                    <Sparkles className={`size-4 sm:size-5 shrink-0 ${agreed ? "text-primary-content" : "text-base-content/60"}`} />
                    <span className={agreed ? "text-primary-content font-extrabold text-sm sm:text-base truncate" : "text-base-content/85 font-bold text-sm sm:text-base truncate"}>
                      Accept &amp; Enter Streamify
                    </span>
                    <ArrowRightIcon className={`size-4 sm:size-5 shrink-0 ${agreed ? "text-primary-content" : "text-base-content/60"}`} />
                  </button>

                  <Link
                    to="/login"
                    className="btn btn-ghost btn-md sm:btn-lg border-2 border-base-content/30 text-base-content hover:bg-base-300 hover:border-base-content hover:text-base-content font-bold px-4 sm:px-7 transition-all w-full sm:w-auto text-center text-sm sm:text-base"
                  >
                    Already a member? Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-base-300 py-8 bg-base-200/80 mt-auto">
        <div className="container mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShipWheelIcon className="size-5 text-primary/60" />
            <span className="text-sm font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary/60 to-secondary/60 tracking-wider">
              Streamify
            </span>
          </div>
          <p className="text-xs text-base-content/45">
            © {new Date().getFullYear()} Streamify. Dedicated to Global Language
            Exchange & Safe Peer Learning.
          </p>
          <p className="text-[11px] text-base-content/30">
            Strictly for users aged 14 and older. Zero tolerance for
            inappropriate content.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default RulesPage;
