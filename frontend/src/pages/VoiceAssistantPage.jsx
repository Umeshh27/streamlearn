import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import useAuthUser from "../hooks/useAuthUser";
import { axiosInstance } from "../lib/axios";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  RotateCcw,
  Sparkles,
  Globe,
  Loader2,
  Square,
  CheckCircle2,
  Volume1,
  Award,
  MessageCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

/* ─── Constants ─── */
const ALL_SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
];

const POPULAR_LANGUAGES = ALL_SUPPORTED_LANGUAGES;

const NATIVE_LANGUAGES = [
  { code: "auto", name: "Auto-Detect", flag: "✨" },
  ...ALL_SUPPORTED_LANGUAGES,
];

const BROWSER_LOCALE_MAP = {
  English: "en-US",
  Spanish: "es-ES",
  Hindi: "hi-IN",
  Telugu: "te-IN",
  Tamil: "ta-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Gujarati: "gu-IN",
  Punjabi: "pa-IN",
  Urdu: "ur-PK",
  French: "fr-FR",
  German: "de-DE",
  Japanese: "ja-JP",
  Italian: "it-IT",
  Korean: "ko-KR",
  Chinese: "zh-CN",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
  Arabic: "ar-SA",
};

const UNPARLIAMENTARY_CLIENT_REGEX =
  /\b(fuck|shit|bitch|asshole|bastard|dick|pussy|cunt|slut|whore|motherfucker|cock|chutiya|chutiye|bhenchod|behenchod|madarchod|bsdk|bhosdike|harami|randi|dengu|lanja|munda|puku|modda|puta|mierda|pendejo)\b|bad\s*words?|curse\s*words?|swear\s*words?|boothulu|bhoothulu|gaali/i;

const DATING_ADVICE_CLIENT_REGEX =
  /\bhow\s+to\s+(date|ask\s+out|go\s+out\s+with|get|impress|attract|charm|flirt\s+with)\s+(a\s+)?(girls?|wom[ae]n|females?|crush|her|boys?|m[ae]n|dates?|girlfriend|gf|boyfriend|bf)\b|\b(dating|date)\s+(advice|advises?|tips?|coach|guide|rules?)\b|\b(date|dating)\s+(a\s+)?(girls?|wom[ae]n|boys?|crush)\b|\b(get|find|want|need)\s+(a\s+)?(girlfriend|boyfriend|gf|bf)\b|\b(love|romance|romantic|relationship)\s+(advice|advises?|tips?)\b|\b(pick\s*[-]?\s*up\s*lines?|flirt\s*lines?|how\s*to\s*flirt|flirting\s*tips?|how\s*to\s*rizz)\b|\bhow\s+to\s+(talk|chat)\s+(to|with)\s+(girls?|wom[ae]n|crush)\b|\b(how\s+to\s+)?(propose|confess\s+love)\s+(to\s+)?(a\s+)?(girls?|crush|her)\b|\b(ladki|bandi)\s+(ko\s+)?(kaise\s+)?(pataye|patana|impress|baat)\b|\b(girlfriend|gf)\s+kaise\s+banaye\b|\bpropose\s+kaise\s+kare\b|\bammayi(ni)?\s+(ela\s+)?(impress|padeseyali|matladali)\b|\b(c[oó]mo\s+conquistar|c[oó]mo\s+ligar|consejos\s+de\s+amor|piropos)\b/i;

const NATIVE_WELCOME_TRANSLATIONS = {

  English: (target) => `Hello! What would you like to learn or discuss today in ${target}?`,
  Spanish: (target) => `¡Hola! ¿De qué te gustaría hablar o aprender hoy en ${target}?`,
  Hindi: (target) => `नमस्ते! आज आप ${target} में क्या सीखना या बात करना चाहेंगे?`,
  Telugu: (target) => `నమస్కారం! ఈరోజు మీరు ${target} లో ఏమి నేర్చుకోవాలనుకుంటున్నారు?`,
  Tamil: (target) => `வணக்கம்! இன்று நீங்கள் ${target} மொழியில் என்ன கற்றுக்கொள்ள விரும்புகிறீர்கள்?`,
  Kannada: (target) => `ನಮಸ್ಕಾರ! ಇಂದು ನೀವು ${target} ನಲ್ಲಿ ಏನನ್ನು ಕಲಿಯಲು ಬಯಸುತ್ತೀರಿ?`,
  Malayalam: (target) => `നമസ്കാരം! ഇന്ന് നിങ്ങൾ ${target} ഭാഷയിൽ എന്താണ് പഠിക്കാൻ ആഗ്രഹിക്കുന്നത്?`,
  Bengali: (target) => `নমস্কার! আজ আপনি ${target} এ কী শিখতে চান?`,
  Marathi: (target) => `नमस्कार! आज तुम्हाला ${target} मध्ये काय शिकायचे आहे?`,
  Gujarati: (target) => `નમસ્તે! આજે તમે ${target} માં શું શીખવા માંગો છો?`,
  Punjabi: (target) => `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਅੱਜ ਤੁਸੀਂ ${target} ਵਿੱਚ ਕੀ ਸਿੱਖਣਾ ਚਾਹੋਗੇ?`,
  Urdu: (target) => `آداب! آج آپ ${target} میں کیا سیکھنا چاہیں گے؟`,
  French: (target) => `Bonjour ! Que souhaiteriez-vous apprendre ou pratiquer en ${target} aujourd'hui ?`,
  German: (target) => `Hallo! Was möchtest du heute auf ${target} lernen oder besprechen?`,
  Japanese: (target) => `こんにちは！今日は${target}で何を練習しましょうか？`,
  Italian: (target) => `Ciao! Cosa vorresti imparare o praticare oggi in ${target}?`,
  Korean: (target) => `안녕하세요! 오늘 ${target}로 무엇을 연습하거나 배우고 싶으신가요?`,
  Chinese: (target) => `你好！今天想用${target}学习或聊些什么呢？`,
  Portuguese: (target) => `Olá! O que você gostaria de praticar em ${target} hoje?`,
  Russian: (target) => `Здравствуйте! О чём бы вы хотели поговорить сегодня на ${target}?`,
  Arabic: (target) => `مرحبًا! ماذا تود أن تتعلم أو تمارس اليوم في ${target}؟`,
};

const getWelcomeExplanation = (targetLang, nativeLang) => {
  const chosenNative = (!nativeLang || nativeLang === "Auto-Detect" || nativeLang === "auto") ? "English" : nativeLang;
  const fn = NATIVE_WELCOME_TRANSLATIONS[chosenNative];
  if (fn) return fn(targetLang);
  return `Hello! What would you like to practice today in ${targetLang}?`;
};

const GREETINGS = {
  Hindi: { target: (n) => `नमस्ते ${n}! आज आप क्या सीखना चाहेंगे?` },
  Spanish: { target: (n) => `¡Hola ${n}! ¿De qué te gustaría hablar hoy?` },
  English: { target: (n) => `Hello ${n}! What would you like to practice today?` },
  Telugu: { target: (n) => `నమస్కారం ${n}! ఈరోజు మనం దేని గురించి మాట్లాడదాం?` },
  Tamil: { target: (n) => `வணக்கம் ${n}! இன்று நாம் எதைப் பற்றி பேசலாம்?` },
  Kannada: { target: (n) => `ನಮಸ್ಕಾರ ${n}! ಇಂದು ನೀವು ಏನನ್ನು ಕಲಿಯಲು ಬಯಸುತ್ತೀರಿ?` },
  Malayalam: { target: (n) => `നമസ്കാരം ${n}! ഇന്ന് എന്താണ് പഠിക്കാൻ ആഗ്രഹിക്കുന്നത്?` },
  Bengali: { target: (n) => `নমস্কার ${n}! আজ আপনি কী শিখতে চান?` },
  Marathi: { target: (n) => `नमस्कार ${n}! आज तुम्हाला काय शिकायचे आहे?` },
  Gujarati: { target: (n) => `નમસ્તે ${n}! આજે તમે શું શીખવા માંગો છો?` },
  Punjabi: { target: (n) => `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${n}! ਅੱਜ ਤੁਸੀਂ ਕੀ ਸਿੱਖਣਾ ਚਾਹੋਗੇ?` },
  Urdu: { target: (n) => `آداب ${n}! آج آپ کیا سیکھنا چاہیں گے؟` },
  French: { target: (n) => `Bonjour ${n} ! De quoi aimerais-tu parler ?` },
  German: { target: (n) => `Hallo ${n}! Worüber möchtest du sprechen?` },
  Japanese: { target: (n) => `こんにちは${n}さん！今日は何を話しましょうか？` },
  Italian: { target: (n) => `Ciao ${n}! Di cosa vorresti parlare oggi?` },
  Korean: { target: (n) => `안녕하세요 ${n}님! 오늘 무엇을 연습할까요?` },
  Chinese: { target: (n) => `你好${n}！今天想聊什么？` },
  Portuguese: { target: (n) => `Olá ${n}! Sobre o que gostaria de conversar?` },
  Russian: { target: (n) => `Привет ${n}! О чём поговорим сегодня?` },
  Arabic: { target: (n) => `مرحبًا ${n}! ماذا تحب أن نتحدث عنه؟` },
};

const getWelcomeMessage = (targetLang, nativeLang, name = "Learner") => {
  const cfg = GREETINGS[targetLang];
  const targetText = cfg ? cfg.target(name) : `Hello ${name}! Welcome to practicing ${targetLang}.`;
  const nativeExplanation = getWelcomeExplanation(targetLang, nativeLang);
  return {
    id: `msg-welcome-${targetLang}`,
    sender: "ai",
    targetText,
    nativeExplanation,
    spokenAudioText: targetText,
    nativeAudioText: nativeExplanation,
    learningLanguage: targetLang,
    nativeLanguage: nativeLang,
  };
};

const syncWelcomeGreeting = (msg, targetLang, nativeLang, name = "Learner") => {
  if (!msg || !msg.id || !msg.id.startsWith("msg-welcome")) return msg;
  const fresh = getWelcomeMessage(targetLang, nativeLang, name);
  return {
    ...msg,
    targetText: fresh.targetText,
    spokenAudioText: fresh.spokenAudioText,
    nativeExplanation: fresh.nativeExplanation,
    nativeAudioText: fresh.nativeAudioText,
  };
};

const sanitizeChatMessage = (msg, targetLang = "Spanish") => {
  if (!msg || msg.sender === "user") return msg;
  let targetText = msg.targetText || "";
  let nativeExplanation = msg.nativeExplanation || "";
  let romanization = msg.romanization || "";

  // Check if targetText accidentally contains raw unparsed JSON
  if (
    typeof targetText === "string" &&
    (targetText.trim().startsWith("{") ||
      targetText.includes('"targetText"') ||
      targetText.includes('"nativeExplanation"'))
  ) {
    try {
      let clean = targetText.trim();
      const firstBrace = clean.indexOf("{");
      const lastBrace = clean.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);
      if (parsed.targetText) targetText = parsed.targetText;
      if (parsed.nativeExplanation && !nativeExplanation) nativeExplanation = parsed.nativeExplanation;
      if (parsed.romanization && !romanization) romanization = parsed.romanization;
    } catch (e) {
      const tMatch =
        targetText.match(/"targetText"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        targetText.match(/"targetText"\s*:\s*"([^"\n\r}]+)/i);
      const nMatch =
        targetText.match(/"nativeExplanation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        targetText.match(/"nativeExplanation"\s*:\s*"([^"\n\r}]+)/i);
      const rMatch =
        targetText.match(/"romanization"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        targetText.match(/"romanization"\s*:\s*"([^"\n\r}]+)/i);

      if (tMatch && tMatch[1]) targetText = tMatch[1].replace(/\\"/g, '"');
      if (nMatch && nMatch[1] && !nativeExplanation) nativeExplanation = nMatch[1].replace(/\\"/g, '"');
      if (rMatch && rMatch[1] && !romanization) romanization = rMatch[1].replace(/\\"/g, '"');
    }
  }

  // Clean any lingering JSON syntax artifacts from strings
  targetText = String(targetText)
    .replace(/^[{"\s]+/, "")
    .replace(/["}\s]+$/, "")
    .replace(/^targetText"\s*:\s*"?/i, "")
    .trim();
  nativeExplanation = String(nativeExplanation)
    .replace(/^[{"\s]+/, "")
    .replace(/["}\s]+$/, "")
    .replace(/^nativeExplanation"\s*:\s*"?/i, "")
    .trim();
  romanization = String(romanization)
    .replace(/^[{"\s]+/, "")
    .replace(/["}\s]+$/, "")
    .replace(/^romanization"\s*:\s*"?/i, "")
    .trim();

  // If target language is Latin script, suppress duplicate/redundant romanization
  const LATIN_LANGUAGES = ["Spanish", "French", "German", "Italian", "Portuguese", "English"];
  const lang = msg.learningLanguage || targetLang;
  if (
    LATIN_LANGUAGES.includes(lang) ||
    romanization.toLowerCase() === targetText.toLowerCase()
  ) {
    romanization = "";
  }

  return {
    ...msg,
    targetText,
    nativeExplanation,
    romanization,
    spokenAudioText: targetText,
    nativeAudioText: nativeExplanation,
  };
};

/* ─── Main Component ─── */
export default function VoiceAssistantPage() {
  const { authUser, isLoading: isAuthLoading } = useAuthUser();
  const userName = authUser?.fullName || authUser?.username || "Learner";

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState("communication"); // "communication" | "pronunciation"
  const [learningLanguage, setLearningLanguage] = useState(() => localStorage.getItem("streamlearn_ai_target_lang") || "Spanish");
  const [nativeLanguage, setNativeLanguage] = useState(() => localStorage.getItem("streamlearn_ai_native_lang") || "Auto-Detect");
  const [activePlayingId, setActivePlayingId] = useState(null);
  const currentAudioRef = useRef(null);

  // ── Communication Coach state ──
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [chatHistory, setChatHistory] = useState(() => {
    const t = localStorage.getItem("streamlearn_ai_target_lang") || "Spanish";
    const n = localStorage.getItem("streamlearn_ai_native_lang") || "Auto-Detect";
    try {
      const s = localStorage.getItem(`streamlearn_chat_${authUser?._id || "guest"}_${t}`);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p) && p.length > 0) {
          return p.map((m) => syncWelcomeGreeting(sanitizeChatMessage(m, t), t, n, userName));
        }
      }
    } catch (e) {}
    return [getWelcomeMessage(t, n, userName)];
  });
  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const liveTranscriptRef = useRef("");
  const silenceTimerRef = useRef(null);
  const isSendingRef = useRef(false);

  // ── Pronunciation Coach state ──
  const [practiceSentence, setPracticeSentence] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPracticeRecording, setIsPracticeRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);
  const [difficulty, setDifficulty] = useState("beginner");
  const [practiceHistory, setPracticeHistory] = useState([]);
  const practiceRecognitionRef = useRef(null);
  const practiceMediaRecorderRef = useRef(null);
  const practiceChunksRef = useRef([]);
  const practiceLiveRef = useRef("");
  const practiceSilenceRef = useRef(null);
  const [practiceTranscript, setPracticeTranscript] = useState("");
  const pronunciationContainerRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  // ── State Hydration & Storage Refs ──
  const hydratedKeyRef = useRef(null);

  // ── Effects ──
  useEffect(() => { localStorage.setItem("streamlearn_ai_target_lang", learningLanguage); }, [learningLanguage]);
  useEffect(() => { localStorage.setItem("streamlearn_ai_native_lang", nativeLanguage); }, [nativeLanguage]);

  // Rehydrate chat history safely when authUser loads or target language changes
  useEffect(() => {
    if (isAuthLoading) return;

    const userId = authUser?._id;
    const currentKey = `streamlearn_chat_${userId || "guest"}_${learningLanguage}`;

    if (hydratedKeyRef.current !== currentKey) {
      try {
        const saved = localStorage.getItem(currentKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatHistory(
              parsed.map((m) =>
                syncWelcomeGreeting(sanitizeChatMessage(m, learningLanguage), learningLanguage, nativeLanguage, userName)
              )
            );
            hydratedKeyRef.current = currentKey;
            return;
          }
        }
      } catch (e) {}

      setChatHistory([getWelcomeMessage(learningLanguage, nativeLanguage, userName)]);
      hydratedKeyRef.current = currentKey;
    }
  }, [authUser?._id, learningLanguage, nativeLanguage, userName, isAuthLoading]);

  // Dynamically sync greeting message whenever userName updates (e.g. when authUser loads or user edits username/display name)
  useEffect(() => {
    if (!userName || userName === "Learner") return;

    setChatHistory((prev) => {
      let changed = false;
      const next = prev.map((msg) => {
        if (msg.id && msg.id.startsWith("msg-welcome")) {
          const synced = syncWelcomeGreeting(msg, learningLanguage, nativeLanguage, userName);
          if (synced.targetText !== msg.targetText) {
            changed = true;
            return synced;
          }
        }
        return msg;
      });
      return changed ? next : prev;
    });
  }, [userName, learningLanguage, nativeLanguage]);

  // Persist chat history to localStorage only after hydration has taken place for current key
  useEffect(() => {
    if (isAuthLoading) return;

    const userId = authUser?._id;
    const currentKey = `streamlearn_chat_${userId || "guest"}_${learningLanguage}`;

    if (hydratedKeyRef.current !== currentKey) return;

    try {
      localStorage.setItem(currentKey, JSON.stringify(chatHistory));
    } catch (e) {}
  }, [chatHistory, authUser?._id, learningLanguage, isAuthLoading]);
  useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatHistory, isLoading]);
  useEffect(() => {
    if (practiceResult && pronunciationContainerRef.current) {
      setTimeout(() => {
        pronunciationContainerRef.current?.scrollTo({
          top: pronunciationContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 150);
    }
  }, [practiceResult]);
  useEffect(() => {
    if (practiceSentence && pronunciationContainerRef.current) {
      pronunciationContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [practiceSentence?.sentence]);

  // ── Audio helpers ──
  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    setActivePlayingId(null);
  }, []);

  const playNeuralAudio = useCallback((text, lang, isSlow = false, playingId = null) => {
    if (!text?.trim()) return Promise.resolve();
    stopAllAudio();
    if (playingId) setActivePlayingId(playingId);
    return new Promise((resolve) => {
      const baseUrl = axiosInstance.defaults.baseURL || "/api";
      const url = `${baseUrl}/ai/tts?text=${encodeURIComponent(text.trim())}&lang=${encodeURIComponent(lang)}&slow=${isSlow}`;
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = audio.onerror = () => { currentAudioRef.current = null; setActivePlayingId(null); resolve(); };
      audio.play().catch(() => { currentAudioRef.current = null; setActivePlayingId(null); resolve(); });
    });
  }, [stopAllAudio]);

  const replayBilingualAudio = useCallback(async (msg) => {
    if (activePlayingId === msg.id) { stopAllAudio(); return; }
    stopAllAudio();
    setActivePlayingId(msg.id);
    if (msg.spokenAudioText || msg.targetText) await playNeuralAudio(msg.spokenAudioText || msg.targetText, msg.learningLanguage || learningLanguage, false, msg.id);
    await new Promise((r) => setTimeout(r, 400));
    if (msg.nativeAudioText || msg.nativeExplanation) await playNeuralAudio(msg.nativeAudioText || msg.nativeExplanation, msg.nativeLanguage || (nativeLanguage === "Auto-Detect" ? "en" : nativeLanguage), false, msg.id);
    setActivePlayingId(null);
  }, [activePlayingId, stopAllAudio, playNeuralAudio, learningLanguage, nativeLanguage]);

  // ── Language change handlers ──
  const handleTargetLanguageChange = (newTarget) => {
    stopAllAudio();
    setLearningLanguage(newTarget);
    localStorage.setItem("streamlearn_ai_target_lang", newTarget);
    const targetKey = `streamlearn_chat_${authUser?._id || "guest"}_${newTarget}`;
    hydratedKeyRef.current = targetKey;
    try {
      const s = localStorage.getItem(targetKey);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p) && p.length > 0) {
          setChatHistory(
            p.map((m) =>
              syncWelcomeGreeting(sanitizeChatMessage(m, newTarget), newTarget, nativeLanguage, userName)
            )
          );
          toast.success(`Switched to ${newTarget}!`);
          return;
        }
      }
    } catch (e) {}
    setChatHistory([getWelcomeMessage(newTarget, nativeLanguage, userName)]);
    setPracticeSentence(null); setPracticeResult(null);
    toast.success(`Switched to ${newTarget}!`);
  };

  const handleNativeLanguageChange = async (newNative) => {
    stopAllAudio();
    setNativeLanguage(newNative);
    localStorage.setItem("streamlearn_ai_native_lang", newNative);

    // 1. Immediately update welcome message native explanation in chatHistory
    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id?.startsWith("msg-welcome")
          ? {
              ...msg,
              nativeExplanation: getWelcomeExplanation(learningLanguage, newNative),
              nativeAudioText: getWelcomeExplanation(learningLanguage, newNative),
              nativeLanguage: newNative,
            }
          : msg
      )
    );

    // 2. If a practice sentence is active in Pronunciation Coach, dynamically translate its meaning to new native language
    if (practiceSentence?.sentence && newNative !== "Auto-Detect") {
      try {
        const res = await axiosInstance.post("/ai/translate", {
          text: practiceSentence.sentence,
          targetLanguage: newNative,
        });
        if (res.data?.success && res.data?.data?.translation) {
          setPracticeSentence((curr) =>
            curr
              ? {
                  ...curr,
                  meaning: res.data.data.translation,
                }
              : curr
          );
        }
      } catch (err) {
        console.warn("Failed to translate practice sentence meaning on language change:", err);
      }
    }

    toast.success(`Explanations set to ${newNative}!`);
  };

  // ══════════════════════════════════
  //  COMMUNICATION COACH
  // ══════════════════════════════════

  const startRecording = async () => {
    stopAllAudio();
    const locale = nativeLanguage !== "Auto-Detect" ? (BROWSER_LOCALE_MAP[nativeLanguage] || "en-US") : (BROWSER_LOCALE_MAP[learningLanguage] || "en-US");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.abort();
          } catch (e) {}
        }
        const r = new SR();
        recognitionRef.current = r;
        r.lang = locale;
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = 1;
        liveTranscriptRef.current = "";
        r.onstart = () => { setIsListening(true); toast.success(`🎙️ Listening... Speak now!`, { id: "mic" }); };
        r.onresult = (e) => {
          if (isSendingRef.current) return;
          let f = "", i = "";
          for (let j = 0; j < e.results.length; j++) {
            if (e.results[j].isFinal) f += e.results[j][0].transcript + " ";
            else i += e.results[j][0].transcript;
          }
          const c = (f + i).trim();
          if (c && !isSendingRef.current) {
            liveTranscriptRef.current = c;
            setTextInput(c);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              const spoken = liveTranscriptRef.current?.trim();
              if (spoken && !isSendingRef.current) {
                liveTranscriptRef.current = "";
                stopRecording();
                handleSend(spoken);
              }
            }, 1800);
          }
        };
        r.onerror = () => setIsListening(false);
        r.onend = () => setIsListening(false);
        r.start();
        return;
      } catch (e) { console.warn("SpeechRecognition fallback:", e); }
    }
    // MediaRecorder fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsListening(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 200 && !isSendingRef.current) {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            if (isSendingRef.current) return;
            try {
              toast.loading("Transcribing...", { id: "whisper" });
              const res = await axiosInstance.post("/ai/transcribe", {
                audioBase64: reader.result,
                mimeType: "audio/webm",
                language: nativeLanguage,
              });
              toast.dismiss("whisper");
              const t = res.data?.transcript;
              if (t?.trim() && !isSendingRef.current) {
                handleSend(t.trim());
              }
            } catch (err) {
              toast.dismiss("whisper");
              toast.error("Transcription failed.");
            }
          };
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsListening(true);
      toast.success("🎙️ Recording...");
    } catch (err) {
      toast.error("Microphone access denied.");
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    setIsListening(false);
  };

  const handleSend = async (messageText = null) => {
    if (isSendingRef.current || isLoading) return;

    const raw = typeof messageText === "string" ? messageText : textInput;
    const text = raw?.trim();
    if (!text) return;

    if (UNPARLIAMENTARY_CLIENT_REGEX.test(text)) {
      toast("⚠️ Please maintain clean and parliamentary communication.", { icon: "🛡️", duration: 4000 });
    } else if (DATING_ADVICE_CLIENT_REGEX.test(text)) {
      toast("ℹ️ LangBridge AI is an educational coach and does not provide dating or love advice.", { icon: "🎓", duration: 4500 });
    }

    isSendingRef.current = true;
    setIsLoading(true);

    setTextInput("");
    liveTranscriptRef.current = "";
    stopRecording();

    setChatHistory((prev) => [...prev, { id: `msg-${Date.now()}-u`, sender: "user", text }]);
    try {
      const hist = chatHistory
        .filter((m) => !m.learningLanguage || m.learningLanguage === learningLanguage)
        .slice(-8)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.targetText || m.text,
        }));
      const res = await axiosInstance.post("/ai/chat", {
        userName,
        message: text,
        learningLanguage,
        nativeLanguage: nativeLanguage === "Auto-Detect" ? "auto" : nativeLanguage,
        history: hist,
      });
      const d = res.data?.data;
      const aiMsg = sanitizeChatMessage(
        {
          id: `msg-${Date.now()}-ai`,
          sender: "ai",
          targetText: d?.targetText || "¡Hola!",
          nativeExplanation: d?.nativeExplanation || "",
          romanization: d?.romanization || "",
          spokenAudioText: d?.spokenAudioText || d?.targetText || "",
          nativeAudioText: d?.nativeAudioText || d?.nativeExplanation || "",
          learningLanguage,
          nativeLanguage: d?.nativeLanguage || nativeLanguage,
          isSafetyRefusal: Boolean(d?.isSafetyRefusal),
          isDatingRefusal: Boolean(d?.isDatingRefusal),
        },
        learningLanguage
      );
      setChatHistory((prev) => [...prev, aiMsg]);
      setTimeout(() => replayBilingualAudio(aiMsg), 200);

    } catch (err) {
      toast.error("Failed to reach AI Tutor.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isSendingRef.current = false;
      }, 350);
    }
  };

  const clearChat = () => {
    stopAllAudio();
    try { localStorage.removeItem(`streamlearn_chat_${authUser?._id || "guest"}_${learningLanguage}`); } catch (e) {}
    setChatHistory([getWelcomeMessage(learningLanguage, nativeLanguage, userName)]);
    toast.success("Chat cleared!");
  };

  // ══════════════════════════════════
  //  PRONUNCIATION COACH
  // ══════════════════════════════════

  const cleanDisplaySentence = (val) => {
    if (!val) return "";
    let s = String(val).trim();
    if (s.startsWith("{") || s.includes('"sentence"')) {
      const match =
        s.match(/"sentence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        s.match(/"sentence"\s*:\s*"([^"]+)/i);
      if (match && match[1]) {
        return match[1].replace(/\\"/g, '"').trim();
      }
      s = s.replace(/^[{"\s]+/, "").replace(/["}\s]+$/, "").trim();
    }
    return s;
  };

  const fetchPracticeSentence = async () => {
    setIsGenerating(true); setPracticeResult(null);
    try {
      const res = await axiosInstance.post("/ai/practice-sentence", {
        learningLanguage,
        nativeLanguage: nativeLanguage === "Auto-Detect" ? "English" : nativeLanguage,
        difficulty,
        previousSentences: practiceHistory.slice(-5),
      });
      if (res.data?.success && res.data?.data) {
        const s = res.data.data;
        const cleanedSentence = cleanDisplaySentence(s.sentence);
        const cleanedObj = {
          ...s,
          sentence: cleanedSentence,
          romanization: s.romanization?.trim() || "",
          meaning: s.meaning?.trim() || "",
        };
        setPracticeSentence(cleanedObj);
        setPracticeHistory((prev) => [...prev, cleanedSentence]);
      } else { toast.error("Failed to generate sentence."); }
    } catch (err) { toast.error("Could not generate practice sentence."); }
    finally { setIsGenerating(false); }
  };

  const startPracticeRecording = async () => {
    stopAllAudio(); setPracticeResult(null); setPracticeTranscript("");
    practiceLiveRef.current = "";
    if (practiceSilenceRef.current) { clearTimeout(practiceSilenceRef.current); practiceSilenceRef.current = null; }
    const locale = BROWSER_LOCALE_MAP[learningLanguage] || "es-ES";
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        if (practiceRecognitionRef.current) {
          try {
            practiceRecognitionRef.current.onresult = null;
            practiceRecognitionRef.current.onend = null;
            practiceRecognitionRef.current.onerror = null;
            practiceRecognitionRef.current.abort();
          } catch (e) {}
        }
        const r = new SR(); practiceRecognitionRef.current = r;
        r.lang = locale; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
        r.onstart = () => setIsPracticeRecording(true);
        r.onresult = (e) => {
          if (isAnalyzingRef.current) return;
          let final = "", interim = "";
          for (let j = 0; j < e.results.length; j++) {
            if (e.results[j].isFinal) final += e.results[j][0].transcript + " ";
            else interim += e.results[j][0].transcript;
          }
          const combined = (final + interim).trim();
          if (combined && !isAnalyzingRef.current) {
            practiceLiveRef.current = combined;
            setPracticeTranscript(combined);
            // Reset silence timer — wait 2.5s of silence before auto-submitting
            if (practiceSilenceRef.current) clearTimeout(practiceSilenceRef.current);
            practiceSilenceRef.current = setTimeout(() => {
              const spoken = practiceLiveRef.current?.trim();
              if (spoken && !isAnalyzingRef.current) {
                practiceLiveRef.current = "";
                stopPracticeRecording(false);
                analyzePractice(spoken, null);
              }
            }, 2500);
          }
        };
        r.onerror = () => setIsPracticeRecording(false);
        r.onend = () => { setIsPracticeRecording(false); };
        r.start(); return;
      } catch (e) { console.warn("Coach SR fallback:", e); }
    }
    // MediaRecorder fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      practiceChunksRef.current = []; const mr = new MediaRecorder(stream); practiceMediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data?.size > 0) practiceChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        setIsPracticeRecording(false);
        const blob = new Blob(practiceChunksRef.current, { type: "audio/webm" });
        if (blob.size > 200 && !isAnalyzingRef.current) {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            if (!isAnalyzingRef.current) {
              await analyzePractice("", reader.result);
            }
          };
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(); setIsPracticeRecording(true);
    } catch (err) { toast.error("Microphone access denied."); setIsPracticeRecording(false); }
  };

  const stopPracticeRecording = (shouldAutoAnalyze = true) => {
    if (practiceSilenceRef.current) { clearTimeout(practiceSilenceRef.current); practiceSilenceRef.current = null; }
    if (practiceRecognitionRef.current) {
      try {
        practiceRecognitionRef.current.onresult = null;
        practiceRecognitionRef.current.onend = null;
        practiceRecognitionRef.current.onerror = null;
        practiceRecognitionRef.current.stop();
      } catch (e) {}
      practiceRecognitionRef.current = null;
    }
    if (practiceMediaRecorderRef.current && practiceMediaRecorderRef.current.state !== "inactive") {
      try {
        practiceMediaRecorderRef.current.onstop = null;
        practiceMediaRecorderRef.current.stop();
      } catch (e) {}
      practiceMediaRecorderRef.current = null;
    }
    setIsPracticeRecording(false);

    if (shouldAutoAnalyze) {
      const pending = practiceLiveRef.current?.trim();
      if (pending && !isAnalyzingRef.current) {
        practiceLiveRef.current = "";
        analyzePractice(pending, null);
      }
    }
  };

  const analyzePractice = async (userTranscript, audioBase64) => {
    if (!practiceSentence?.sentence || isAnalyzingRef.current || isAnalyzing) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const res = await axiosInstance.post("/ai/pronounce-check", { targetSentence: practiceSentence.sentence, userTranscript, audioBase64, learningLanguage, nativeLanguage: nativeLanguage === "Auto-Detect" ? "English" : nativeLanguage });
      if (res.data?.success && res.data?.data) setPracticeResult(res.data.data);
      else toast.error("Could not analyze pronunciation.");
    } catch (err) { toast.error("Analysis failed."); }
    finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        isAnalyzingRef.current = false;
      }, 400);
    }
  };

  // ══════════════════════════════════
  //  RENDER
  // ══════════════════════════════════

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 max-w-4xl mx-auto p-2 sm:p-4 lg:p-5 overflow-hidden">
      {/* ── Header Bar ── */}
      <div className="p-2 sm:p-3 bg-base-200/80 backdrop-blur-md rounded-2xl border border-base-300 shadow-xs mb-2 space-y-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Sparkles className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-base-content flex items-center gap-1.5 truncate">
                LangBridge AI <span className="badge badge-primary badge-xs font-semibold text-[9px] sm:text-[10px] shrink-0">Language Coach</span>
              </h1>
              <p className="text-[9px] sm:text-xs text-base-content/60 truncate hidden xs:block">
                Speak • Learn • Master pronunciation
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-base-100 px-2 sm:px-2.5 py-1 sm:py-1 rounded-xl border border-base-300 min-w-0 shadow-2xs">
              <Globe className="size-3 sm:size-3.5 text-primary shrink-0" />
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-base-content/70 shrink-0">Learn:</span>
                <select
                  className="bg-transparent font-bold text-[11px] sm:text-xs text-base-content focus:outline-none cursor-pointer w-full min-w-0 py-0.5 truncate"
                  value={learningLanguage}
                  onChange={(e) => handleTargetLanguageChange(e.target.value)}
                >
                  {POPULAR_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.name} className="bg-base-100 text-base-content font-medium py-1">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-base-100 px-2 sm:px-2.5 py-1 sm:py-1 rounded-xl border border-base-300 min-w-0 shadow-2xs">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-base-content/70 shrink-0">Native:</span>
                <select
                  className="bg-transparent font-bold text-[11px] sm:text-xs text-base-content focus:outline-none cursor-pointer w-full min-w-0 py-0.5 truncate"
                  value={nativeLanguage}
                  onChange={(e) => handleNativeLanguageChange(e.target.value)}
                >
                  {NATIVE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.name} className="bg-base-100 text-base-content font-medium py-1">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 bg-base-100 p-1 rounded-xl border border-base-300">
          <button
            className={`flex-1 btn btn-xs sm:btn-sm gap-1.5 font-bold text-[11px] sm:text-xs rounded-lg transition-all ${
              activeTab === "communication"
                ? "btn-primary text-primary-content shadow-sm"
                : "btn-ghost text-base-content/70"
            }`}
            onClick={() => setActiveTab("communication")}
          >
            <MessageCircle className="size-3.5 sm:size-4 shrink-0" />
            <span className="truncate">Communication Coach</span>
          </button>
          <button
            className={`flex-1 btn btn-xs sm:btn-sm gap-1.5 font-bold text-[11px] sm:text-xs rounded-lg transition-all ${
              activeTab === "pronunciation"
                ? "btn-primary text-primary-content shadow-sm"
                : "btn-ghost text-base-content/70"
            }`}
            onClick={() => setActiveTab("pronunciation")}
          >
            <Award className="size-3.5 sm:size-4 shrink-0" />
            <span className="truncate">Pronunciation Coach</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════ */}
      {/*  TAB: COMMUNICATION COACH     */}
      {/* ══════════════════════════════ */}
      {activeTab === "communication" && (
        <>
          {/* Chat Messages */}
          <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 space-y-2.5 sm:space-y-4 bg-base-100 rounded-2xl border border-base-300 shadow-inner">
            {chatHistory.map((rawMsg) => {
              const msg = rawMsg.sender === "ai" ? sanitizeChatMessage(rawMsg, learningLanguage) : rawMsg;
              return (
                <div key={msg.id} className={`chat ${msg.sender === "user" ? "chat-end" : "chat-start"}`}>
                  <div className="chat-header text-[11px] sm:text-xs text-base-content/60 mb-1 font-semibold">
                    {msg.sender === "user" ? userName : `AI Tutor (${learningLanguage})`}
                  </div>
                  <div className={`chat-bubble shadow-xs leading-relaxed max-w-[92%] sm:max-w-2xl ${msg.sender === "user" ? "chat-bubble-primary font-medium" : "bg-base-200/95 text-base-content border border-base-300 p-2.5 sm:p-4"}`}>
                    {msg.sender === "user" ? (
                      <div className="text-xs sm:text-sm whitespace-pre-line break-words">{msg.text}</div>
                    ) : (
                      <div className="space-y-2">
                        {msg.isDatingRefusal ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-info/15 text-info text-[10px] sm:text-xs font-bold border border-info/30 mb-0.5 flex-wrap">
                            <span>🎓</span>
                            <span>Educational Policy (No Dating or Love Advice)</span>
                          </div>
                        ) : msg.isSafetyRefusal ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-warning/15 text-warning text-[10px] sm:text-xs font-bold border border-warning/30 mb-0.5 flex-wrap">
                            <span>🛡️</span>
                            <span>Respectful Communication Policy</span>
                          </div>
                        ) : null}
                        <div className="text-sm sm:text-base font-bold text-base-content leading-snug break-words">{msg.targetText}</div>

                        {msg.romanization && <div className="text-xs text-base-content/60 font-mono italic break-words">{msg.romanization}</div>}
                        {msg.nativeExplanation && <div className="text-xs sm:text-sm text-base-content/85 bg-base-100/70 p-2 sm:p-2.5 rounded-xl border border-base-300/60 leading-relaxed break-words">{msg.nativeExplanation}</div>}
                        <div className="pt-2 border-t border-base-300/60 flex items-center gap-1.5 flex-wrap">
                          <button className={`btn btn-xs gap-1 font-bold shrink-0 ${activePlayingId === msg.id ? "btn-error text-error-content animate-pulse" : "btn-primary text-primary-content shadow-2xs hover:scale-105"}`} onClick={() => replayBilingualAudio(msg)}>
                            {activePlayingId === msg.id ? <><Square className="size-3 fill-current" /> Stop</> : <><Volume2 className="size-3.5" /> Replay 🔄</>}
                          </button>
                          <button className="btn btn-ghost border border-base-300 btn-xs text-base-content hover:text-base-content hover:bg-base-200 gap-1 font-semibold shrink-0" onClick={() => playNeuralAudio(msg.spokenAudioText || msg.targetText, msg.learningLanguage || learningLanguage, true, msg.id)}>🐢 Slow</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && <div className="chat chat-start"><div className="chat-bubble bg-base-200 border border-base-300"><span className="loading loading-dots loading-md text-primary" /></div></div>}
          </div>

          {/* Active Listening Indicator */}
          {isListening && (
            <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-bold text-primary flex items-center justify-between animate-pulse shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                Listening... Speak in {nativeLanguage === "Auto-Detect" ? "your language" : nativeLanguage}
              </span>
              <span className="text-[10px] opacity-75">Tap mic to send</span>
            </div>
          )}

          {/* Input Bar */}
          <div className="mt-1.5 sm:mt-2.5 p-1 sm:p-2 bg-base-200/80 backdrop-blur-md rounded-2xl border border-base-300 flex items-center gap-1 sm:gap-2 shadow-sm shrink-0">
            <button
              className={`btn btn-circle btn-sm sm:btn-md ${isListening ? "btn-error text-error-content animate-pulse" : "btn-primary text-primary-content"} shadow-xs hover:scale-105 shrink-0`}
              onClick={
                isListening
                  ? () => {
                      const p = (liveTranscriptRef.current || textInput)?.trim();
                      stopRecording();
                      if (p && !isSendingRef.current && !isLoading) {
                        handleSend(p);
                      }
                    }
                  : startRecording
              }
              disabled={isLoading}
              title={isListening ? "Stop listening and send" : "Speak to coach"}
            >
              {isListening ? <MicOff className="size-4 sm:size-5" /> : <Mic className="size-4 sm:size-5" />}
            </button>
            <input
              type="text"
              className="input input-bordered input-sm sm:input-md flex-1 bg-base-100 text-base-content border-base-300 focus:outline-none placeholder:text-base-content/50 text-xs sm:text-sm font-medium min-w-0"
              placeholder={`Type or speak in your language...`}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!isSendingRef.current && !isLoading && textInput.trim()) {
                    handleSend();
                  }
                }
              }}
              disabled={isLoading}
            />
            <button
              className={`btn btn-circle btn-sm sm:btn-md shrink-0 transition-all ${
                !textInput.trim() || isLoading
                  ? "bg-base-300 text-base-content/40 cursor-not-allowed border-base-300 shadow-none hover:bg-base-300"
                  : "btn-primary text-primary-content shadow-xs hover:scale-105 cursor-pointer"
              }`}
              onClick={(e) => {
                e.preventDefault();
                if (!isSendingRef.current && !isLoading && textInput.trim()) {
                  handleSend();
                }
              }}
              disabled={!textInput.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="size-4 sm:size-5 animate-spin" /> : <Send className="size-4 sm:size-5" />}
            </button>
            <button className="btn btn-ghost btn-xs sm:btn-sm text-base-content/60 hover:text-error shrink-0 px-1 sm:px-2" onClick={clearChat} title="Clear"><RotateCcw className="size-3.5 sm:size-4" /></button>
          </div>
        </>
      )}

      {/* ══════════════════════════════ */}
      {/*  TAB: PRONUNCIATION COACH     */}
      {/* ══════════════════════════════ */}
      {activeTab === "pronunciation" && (
        <div
          ref={pronunciationContainerRef}
          className="flex-1 min-h-0 flex flex-col items-center bg-base-100 rounded-2xl border border-base-300 shadow-inner p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-5"
        >
          {/* Difficulty Selector */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            {["beginner", "intermediate", "advanced"].map((d) => (
              <button key={d} className={`btn btn-xs font-bold capitalize ${difficulty === d ? "btn-primary text-primary-content shadow-xs" : "btn-ghost border border-base-300 text-base-content hover:text-base-content hover:bg-base-200"}`} onClick={() => { setDifficulty(d); setPracticeSentence(null); setPracticeResult(null); }}>
                {d === "beginner" ? "🌱" : d === "intermediate" ? "🌿" : "🌳"} {d}
              </button>
            ))}
          </div>

          {/* No sentence yet — Generate button */}
          {!practiceSentence && !isGenerating && (
            <div className="my-auto text-center space-y-3 sm:space-y-4 py-4 sm:py-8 px-2">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 border border-primary/20 max-w-md mx-auto">
                <Award className="size-8 sm:size-10 text-primary mx-auto mb-2 sm:mb-3" />
                <h3 className="text-base sm:text-lg font-bold text-base-content">Pronunciation Coach</h3>
                <p className="text-xs sm:text-sm text-base-content/70 mt-1">Practice speaking {learningLanguage} sentences. AI will score your pronunciation word by word.</p>
              </div>
              <button className="btn btn-primary text-primary-content btn-sm sm:btn-lg gap-2 font-bold shadow-md hover:scale-105 transition-transform" onClick={fetchPracticeSentence}>
                <Sparkles className="size-4 sm:size-5" /> Generate Practice Sentence
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="my-auto text-center space-y-3 py-6 sm:py-8">
              <Loader2 className="size-8 sm:size-10 text-primary mx-auto animate-spin" />
              <p className="text-xs sm:text-sm font-semibold text-base-content/70">Generating a {difficulty} {learningLanguage} sentence...</p>
            </div>
          )}

          {/* Practice Sentence Card */}
          {practiceSentence && !isGenerating && (
            <div className="w-full max-w-lg space-y-4 sm:space-y-5 pb-6 sm:pb-8">
              {/* Sentence Display */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-base-200/90 border border-base-300 text-center space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-primary">
                  <span>Say this in {learningLanguage}</span>
                  {practiceSentence.category && <span className="badge badge-ghost badge-xs capitalize">{practiceSentence.category}</span>}
                </div>
                <div className="text-lg sm:text-2xl font-bold text-base-content leading-snug break-words">{cleanDisplaySentence(practiceSentence.sentence)}</div>
                {practiceSentence.romanization && practiceSentence.romanization.toLowerCase() !== practiceSentence.sentence.toLowerCase() && (
                  <div className="text-xs sm:text-sm text-base-content/60 font-mono italic break-words">🗣️ {practiceSentence.romanization}</div>
                )}
                {practiceSentence.meaning && <div className="text-xs sm:text-sm text-base-content/70 bg-base-100/70 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-base-300/50 break-words">💬 {practiceSentence.meaning}</div>}

                {/* Audio Controls */}
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button className="btn btn-xs btn-outline btn-primary gap-1 font-semibold" onClick={() => playNeuralAudio(practiceSentence.sentence, learningLanguage, false, "practice-normal")}>
                    <Volume2 className="size-3.5" /> Hear Normal
                  </button>
                  <button className="btn btn-xs btn-ghost border border-base-300 gap-1 font-semibold text-base-content hover:text-base-content hover:bg-base-200" onClick={() => playNeuralAudio(practiceSentence.sentence, learningLanguage, true, "practice-slow")}>
                    <Volume1 className="size-3.5" /> Hear Slow 🐢
                  </button>
                </div>
              </div>

              {/* Record Button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  className={`btn btn-circle btn-md sm:btn-lg shadow-md transition-transform hover:scale-105 ${isPracticeRecording ? "btn-error text-error-content animate-pulse" : "btn-primary text-primary-content"}`}
                  onClick={isPracticeRecording ? stopPracticeRecording : startPracticeRecording}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 className="size-6 animate-spin" /> : isPracticeRecording ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                </button>
                <span className="text-xs font-medium text-base-content/60">
                  {isAnalyzing ? "Analyzing your pronunciation..." : isPracticeRecording ? "🎙️ Listening... Say the full sentence!" : practiceResult ? "Tap to try again" : "Tap and speak the sentence out loud"}
                </span>
                {/* Live transcript while recording */}
                {isPracticeRecording && practiceTranscript && (
                  <div className="mt-2 px-4 py-2 rounded-xl bg-base-200/80 border border-primary/30 text-sm font-medium text-base-content/80 text-center min-w-48 animate-pulse">
                    "{practiceTranscript}"
                  </div>
                )}
              </div>

              {/* Results */}
              {practiceResult && (
                <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-3 animate-in fade-in duration-200">
                  {/* Score Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-base-content/70">Your Score:</span>
                    <div className={`badge badge-lg font-bold gap-1.5 ${practiceResult.score >= 85 ? "badge-success text-success-content" : practiceResult.score >= 70 ? "badge-warning text-warning-content" : "badge-error text-error-content"}`}>
                      <CheckCircle2 className="size-4" />
                      {practiceResult.score}% — {practiceResult.accuracy}
                    </div>
                  </div>

                  {/* Word-by-Word Color Chips */}
                  <div className="flex flex-wrap gap-1.5 justify-center py-2">
                    {practiceResult.words?.map((w, i) => (
                      <span key={i} className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${w.status === "green" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : w.status === "yellow" ? "bg-amber-500/15 text-amber-600 border-amber-500/30" : "bg-rose-500/15 text-rose-600 border-rose-500/30"}`}>
                        {w.word}
                      </span>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-base-content/50">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Perfect</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Close</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Needs Work</span>
                  </div>

                  {/* Tip */}
                  {practiceResult.tip && (
                    <div className="text-xs font-medium text-amber-600 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-1.5">
                      <span className="shrink-0 text-sm">💡</span>
                      <span>{practiceResult.tip}</span>
                    </div>
                  )}

                  {/* Detailed Mistake Breakdown & Suggestions */}
                  {practiceResult.mistakes && practiceResult.mistakes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-base-300/70 text-left">
                      <div className="text-xs font-bold text-base-content/85 flex items-center gap-1.5">
                        <Award className="size-3.5 text-primary" />
                        <span>Where to Improve (Pronunciation Guidance):</span>
                      </div>
                      <div className="space-y-2">
                        {practiceResult.mistakes.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-base-100/90 border border-base-300/80 text-xs space-y-1 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-error flex items-center gap-1">
                                ❌ <span>{m.word}</span>
                              </span>
                              {m.heard && m.heard !== "(omitted)" && (
                                <span className="text-base-content/60 italic font-mono text-[11px]">
                                  Heard: "{m.heard}"
                                </span>
                              )}
                            </div>
                            {m.issue && (
                              <div className="text-base-content/70 text-[11px]">
                                <span className="font-medium text-base-content/90">Issue:</span> {m.issue}
                              </div>
                            )}
                            {m.suggestion && (
                              <div className="text-primary font-medium bg-primary/5 p-2 rounded-lg text-[11px] leading-relaxed border border-primary/15">
                                <span className="font-bold">💡 How to fix:</span> {m.suggestion}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Next Sentence / Try Again */}
              <div className="flex items-center justify-center gap-3">
                <button className="btn btn-sm btn-ghost border border-base-300 gap-1.5 font-semibold text-base-content hover:text-base-content hover:bg-base-200" onClick={() => { setPracticeResult(null); }}>
                  <RefreshCw className="size-3.5" /> Try Again
                </button>
                <button className="btn btn-sm btn-primary text-primary-content gap-1.5 font-bold shadow-xs hover:scale-105" onClick={() => { setPracticeResult(null); fetchPracticeSentence(); }}>
                  <ChevronRight className="size-3.5" /> Next Sentence
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
