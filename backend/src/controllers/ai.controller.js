import https from "https";
import crypto from "crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  generateGroqChat,
  evaluateSpeechPronunciation,
  generatePracticeSentence,
  translateText,
  transcribeAudioWithGroq,
  getGroqKeys,
  containsUnparliamentaryLanguage,
  getSafetyRefusalResponse,
  containsDatingOrLoveAdviceRequest,
  getDatingRefusalResponse,
} from "../services/groqService.js";

import { getCache, setCache } from "../lib/redis.js";

export const transcribeAudio = async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language, nativeLanguage } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ success: false, message: "audioBase64 is required" });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
    const audioBuffer = Buffer.from(cleanBase64, "base64");

    const langCodeMap = {
      telugu: "te",
      hindi: "hi",
      tamil: "ta",
      kannada: "kn",
      malayalam: "ml",
      bengali: "bn",
      gujarati: "gu",
      punjabi: "pa",
      marathi: "mr",
      urdu: "ur",
      japanese: "ja",
      spanish: "es",
      french: "fr",
      german: "de",
      english: "en",
      korean: "ko",
      russian: "ru",
      chinese: "zh",
      italian: "it",
      portuguese: "pt",
      arabic: "ar",
    };

    let targetLang = "";
    const requestedLang = (language || nativeLanguage || "").toLowerCase().trim();
    if (requestedLang && requestedLang !== "auto" && !requestedLang.includes("auto")) {
      targetLang = langCodeMap[requestedLang] || requestedLang.split("-")[0];
    }

    const whisperRes = await transcribeAudioWithGroq(audioBuffer, mimeType, targetLang);
    const transcript =
      typeof whisperRes === "string"
        ? whisperRes
        : whisperRes.transcript || whisperRes.text || "";
    const detectedLanguage =
      typeof whisperRes === "object" ? whisperRes.detectedLanguage || "" : "";

    return res.status(200).json({
      success: true,
      transcript,
      detectedLanguage,
    });
  } catch (err) {
    console.error("[AIController] Error in transcribeAudio:", err.message || err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to transcribe audio with Whisper.",
    });
  }
};

export const chatWithAi = async (req, res) => {
  try {
    const userName = req.body.userName || req.user?.fullName || req.user?.username || "Friend";
    const message = req.body.message;
    const history = req.body.history || [];
    const nativeLanguage = req.body.nativeLanguage || req.body.native || req.user?.nativeLanguage || "auto";
    const learningLanguage = req.body.learningLanguage || req.body.targetLanguage || req.body.target || req.user?.learningLanguage || "Spanish";
    const userSpeakingMode = req.body.userSpeakingMode || "auto";

    // Instant Safety Guard: intercept unparliamentary language, profanity, or abuse
    if (containsUnparliamentaryLanguage(message)) {
      const refusal = getSafetyRefusalResponse(learningLanguage, nativeLanguage);
      return res.status(200).json({
        success: true,
        data: refusal,
        provider: "SafetyGuard",
      });
    }

    // Instant Educational Guard: intercept dating advice, love advice, pickup lines, or romance
    if (containsDatingOrLoveAdviceRequest(message)) {
      const refusal = getDatingRefusalResponse(learningLanguage, nativeLanguage);
      return res.status(200).json({
        success: true,
        data: refusal,
        provider: "EducationalPolicyGuard",
      });
    }

    // For standalone queries without conversation history, check Redis cache

    const isStandalone = !history || history.length === 0;
    const cacheKey = isStandalone && message
      ? `chat:cache:${crypto.createHash("md5").update(`${nativeLanguage}:${learningLanguage}:${userSpeakingMode}:${message.trim().toLowerCase()}`).digest("hex")}`
      : null;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          data: cached,
          provider: "Groq (Cached)",
        });
      }
    }

    const result = await generateGroqChat({
      userName,
      message,
      learningLanguage,
      nativeLanguage,
      userSpeakingMode,
      history,
    });

    if (cacheKey && result) {
      await setCache(cacheKey, result, 43200); // 12 hours TTL
    }

    return res.status(200).json({
      success: true,
      data: result,
      provider: "Groq",
    });
  } catch (error) {
    console.error("[AIController] Error in chatWithAi:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process AI request with Groq.",
    });
  }
};

export const checkPronunciation = async (req, res) => {
  try {
    const {
      targetSentence,
      audioBase64,
      mimeType = "audio/webm",
      learningLanguage = "Spanish",
      nativeLanguage = "English",
    } = req.body;

    if (!targetSentence || !targetSentence.trim()) {
      return res.status(400).json({ success: false, message: "targetSentence is required." });
    }

    if (containsUnparliamentaryLanguage(targetSentence)) {
      return res.status(200).json({
        success: true,
        data: {
          score: 0,
          pronunciationScore: 0,
          accuracyScore: 0,
          fluencyScore: 0,
          completenessScore: 0,
          feedback: "Unparliamentary or offensive language is not permitted for pronunciation practice. Please practice clean, everyday conversation sentences.",
          feedbackInNative: "అసభ్యకరమైన లేదా అనుచితమైన పదాలు ఉచ్చారణ సాధనకు అనుమతించబడవు. దయచేసి గౌరవప్రదమైన వాక్యాలను అభ్యసించండి.",
          detailedWords: [],
          isSafetyRefusal: true,
        },
      });
    }

    if (containsDatingOrLoveAdviceRequest(targetSentence)) {
      return res.status(200).json({
        success: true,
        data: {
          score: 0,
          pronunciationScore: 0,
          accuracyScore: 0,
          fluencyScore: 0,
          completenessScore: 0,
          feedback: "Dating advice, pickup lines, and romantic propositions are not permitted for practice. Please practice practical language, vocabulary, and everyday conversation sentences.",
          feedbackInNative: "డేటింగ్ సలహాలు, పికప్ లైన్లు మరియు ప్రేమ ప్రతిపాదనలు సాధన కోసం అనుమతించబడవు. దయచేసి ఉపయోగకరమైన దైనందిన వాక్యాలను అభ్యసించండి.",
          detailedWords: [],
          isSafetyRefusal: true,
          isDatingRefusal: true,
        },
      });
    }

    let userTranscript = req.body.userTranscript || "";


    if (audioBase64) {
      try {
        const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
        const audioBuffer = Buffer.from(cleanBase64, "base64");
        const whisperResult = await transcribeAudioWithGroq(audioBuffer, mimeType, learningLanguage);
        const textResult =
          typeof whisperResult === "string"
            ? whisperResult
            : whisperResult?.transcript || whisperResult?.text || "";
        if (textResult && textResult.trim()) {
          userTranscript = textResult.trim();
        }
      } catch (transcribeErr) {
        console.warn("[AIController] Whisper error during checkPronunciation:", transcribeErr.message);
      }
    }

    const evaluation = await evaluateSpeechPronunciation({
      targetSentence,
      userTranscript,
      learningLanguage,
      nativeLanguage,
    });

    return res.status(200).json({
      success: true,
      data: evaluation,
      provider: "Groq",
    });
  } catch (error) {
    console.error("[AIController] Error in checkPronunciation:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to analyze pronunciation.",
    });
  }
};

export const getPracticeSentence = async (req, res) => {
  try {
    const {
      learningLanguage = "Spanish",
      nativeLanguage = "English",
      difficulty = "beginner",
      previousSentences = [],
    } = req.body;

    const result = await generatePracticeSentence({
      learningLanguage,
      nativeLanguage: nativeLanguage === "Auto-Detect" ? "English" : nativeLanguage,
      difficulty,
      previousSentences,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[AIController] Error in getPracticeSentence:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate practice sentence.",
    });
  }
};

export const translateSentence = async (req, res) => {
  try {
    const { text, targetLanguage = "English" } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text is required." });
    }

    const result = await translateText({
      text: text.trim(),
      targetLanguage,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[AIController] Error in translateSentence:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to translate text.",
    });
  }
};

const NEURAL_VOICE_MAP = {
  te: "te-IN-ShrutiNeural",
  "te-in": "te-IN-ShrutiNeural",
  telugu: "te-IN-ShrutiNeural",

  hi: "hi-IN-SwaraNeural",
  "hi-in": "hi-IN-SwaraNeural",
  hindi: "hi-IN-SwaraNeural",

  en: "en-US-JennyNeural",
  "en-us": "en-US-JennyNeural",
  "en-in": "en-IN-NeerjaNeural",
  english: "en-US-JennyNeural",

  ja: "ja-JP-NanamiNeural",
  "ja-jp": "ja-JP-NanamiNeural",
  japanese: "ja-JP-NanamiNeural",

  ta: "ta-IN-PallaviNeural",
  "ta-in": "ta-IN-PallaviNeural",
  tamil: "ta-IN-PallaviNeural",

  kn: "kn-IN-SapnaNeural",
  "kn-in": "kn-IN-SapnaNeural",
  kannada: "kn-IN-SapnaNeural",

  ml: "ml-IN-SobhanaNeural",
  "ml-in": "ml-IN-SobhanaNeural",
  malayalam: "ml-IN-SobhanaNeural",

  bn: "bn-IN-TanishaaNeural",
  "bn-in": "bn-IN-TanishaaNeural",
  bengali: "bn-IN-TanishaaNeural",

  gu: "gu-IN-DhwaniNeural",
  "gu-in": "gu-IN-DhwaniNeural",
  gujarati: "gu-IN-DhwaniNeural",

  mr: "mr-IN-AarohiNeural",
  "mr-in": "mr-IN-AarohiNeural",
  marathi: "mr-IN-AarohiNeural",

  pa: "pa-IN-GurpreetNeural",
  "pa-in": "pa-IN-GurpreetNeural",
  punjabi: "pa-IN-GurpreetNeural",

  ur: "ur-PK-UzmaNeural",
  "ur-pk": "ur-PK-UzmaNeural",
  urdu: "ur-PK-UzmaNeural",

  es: "es-ES-ElviraNeural",
  "es-es": "es-ES-ElviraNeural",
  spanish: "es-ES-ElviraNeural",

  fr: "fr-FR-DeniseNeural",
  "fr-fr": "fr-FR-DeniseNeural",
  french: "fr-FR-DeniseNeural",

  de: "de-DE-KatjaNeural",
  "de-de": "de-DE-KatjaNeural",
  german: "de-DE-KatjaNeural",

  ko: "ko-KR-SunHiNeural",
  "ko-kr": "ko-KR-SunHiNeural",
  korean: "ko-KR-SunHiNeural",

  zh: "zh-CN-XiaoxiaoNeural",
  "zh-cn": "zh-CN-XiaoxiaoNeural",
  chinese: "zh-CN-XiaoxiaoNeural",

  it: "it-IT-ElsaNeural",
  "it-it": "it-IT-ElsaNeural",
  italian: "it-IT-ElsaNeural",

  pt: "pt-BR-FranciscaNeural",
  "pt-br": "pt-BR-FranciscaNeural",
  portuguese: "pt-BR-FranciscaNeural",

  ru: "ru-RU-SvetlanaNeural",
  "ru-ru": "ru-RU-SvetlanaNeural",
  russian: "ru-RU-SvetlanaNeural",

  ar: "ar-SA-ZariyahNeural",
  "ar-sa": "ar-SA-ZariyahNeural",
  arabic: "ar-SA-ZariyahNeural",
};

function fetchGoogleTtsFallback(cleanText, shortLang) {
  return new Promise((resolve, reject) => {
    const cleanChunk = encodeURIComponent(cleanText.substring(0, 200));
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanChunk}&tl=${shortLang}&client=tw-ob`;
    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };

    https
      .get(googleTtsUrl, options, (stream) => {
        if (stream.statusCode !== 200) {
          return resolve(Buffer.alloc(0));
        }
        const chunks = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      })
      .on("error", reject);
  });
}

const SCRIPT_DETECTORS = [
  { code: "ta", test: /[\u0B80-\u0BFF]/, voice: "ta-IN-PallaviNeural" }, // Tamil
  { code: "te", test: /[\u0C00-\u0C7F]/, voice: "te-IN-ShrutiNeural" },  // Telugu
  { code: "kn", test: /[\u0C80-\u0CFF]/, voice: "kn-IN-SapnaNeural" },   // Kannada
  { code: "ml", test: /[\u0D00-\u0D7F]/, voice: "ml-IN-SobhanaNeural" }, // Malayalam
  { code: "hi", test: /[\u0900-\u097F]/, voice: "hi-IN-SwaraNeural" },   // Devanagari (Hindi, Marathi)
  { code: "bn", test: /[\u0980-\u09FF]/, voice: "bn-IN-TanishaaNeural" },// Bengali
  { code: "gu", test: /[\u0A80-\u0AFF]/, voice: "gu-IN-DhwaniNeural" },  // Gujarati
  { code: "pa", test: /[\u0A00-\u0A7F]/, voice: "pa-IN-GurpreetNeural" },// Punjabi (Gurmukhi)
  { code: "ur", test: /[\u0600-\u06FF]/, voice: "ur-PK-UzmaNeural" },    // Urdu / Arabic
  { code: "ja", test: /[\u3040-\u30FF\u4E00-\u9FFF]/, voice: "ja-JP-NanamiNeural" }, // Japanese
  { code: "ko", test: /[\uAC00-\uD7AF]/, voice: "ko-KR-SunHiNeural" },   // Korean
  { code: "ru", test: /[\u0400-\u04FF]/, voice: "ru-RU-SvetlanaNeural" }, // Russian
];

function segmentTextByScript(text, primaryLangKey, defaultVoice) {
  const hasForeignScript = SCRIPT_DETECTORS.some(
    (d) => d.code !== primaryLangKey && d.test.test(text)
  );

  if (!hasForeignScript) {
    return [{ text, voice: defaultVoice }];
  }

  const tokens = text.split(/(\s+)/);
  const segments = [];
  let currentText = "";
  let currentVoice = defaultVoice;

  for (const token of tokens) {
    if (!token) continue;
    let tokenVoice = defaultVoice;
    for (const d of SCRIPT_DETECTORS) {
      if (d.code !== primaryLangKey && d.test.test(token)) {
        tokenVoice = d.voice;
        break;
      }
    }

    if (/^\s+$/.test(token)) {
      currentText += token;
      continue;
    }

    if (tokenVoice !== currentVoice) {
      if (currentText.trim()) {
        segments.push({ text: currentText.trim(), voice: currentVoice });
      }
      currentText = token;
      currentVoice = tokenVoice;
    } else {
      currentText += token;
    }
  }

  if (currentText.trim()) {
    segments.push({ text: currentText.trim(), voice: currentVoice });
  }

  return segments.length > 0 ? segments : [{ text, voice: defaultVoice }];
}

export const getTtsAudioStream = async (req, res) => {
  try {
    const { text, lang = "en", slow } = req.query;
    if (!text) {
      return res.status(400).send("Text parameter is required");
    }

    const isSlow = slow === "true" || slow === "1";
    const shortLang = lang.toLowerCase().trim();
    const langKey = shortLang.split("-")[0];

    // Clean text of emojis, markdown, and formatting symbols without destroying foreign language phonemes
    let clean = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, "")
      .replace(/[*#`_~|/\\^+=<>「」『』【】]/g, " ")
      .replace(/["'“”‘’«»`]/g, "")
      .replace(/^\s*[\d•·\-\*]+\.?\s+/gm, " ")
      .replace(/\[.*?\]:?\s*/g, " ")
      .replace(/[—–:-]/g, " , ")
      .replace(/\n+/g, ". ... ")
      .replace(/\(\s*\)/g, " ")
      .replace(/[()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) {
      return res.status(400).send("Empty text after cleaning");
    }

    // Check Redis audio cache (24 hours TTL, v3 format for multi-script support)
    const ttsCacheKey = `tts:cache:v3:${crypto.createHash("md5").update(`${langKey}:${isSlow ? "slow:" : ""}${clean}`).digest("hex")}`;
    const cachedBase64 = await getCache(ttsCacheKey);
    if (cachedBase64) {
      const cachedBuffer = Buffer.from(cachedBase64, "base64");
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", cachedBuffer.length);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.end(cachedBuffer);
    }

    const selectedVoice = NEURAL_VOICE_MAP[shortLang] || NEURAL_VOICE_MAP[langKey] || "en-US-JennyNeural";

    try {
      const segments = segmentTextByScript(clean, langKey, selectedVoice);
      const audioChunks = [];

      for (let sIdx = 0; sIdx < segments.length; sIdx++) {
        const seg = segments[sIdx];
        const segClean = seg.text.replace(/[*#`_~|/\\^+=<>「」『』【】"'“”‘’«»`]/g, " ").trim();
        if (!segClean) continue;

        const segPadded = sIdx === 0 ? `... ${segClean}` : segClean;
        const tts = new MsEdgeTTS();
        await tts.setMetadata(seg.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        const prosodyOptions = {
          rate: isSlow ? "-28%" : "-4%", // -28% for slow practice, -4% for fluent natural pace
          pitch: "+0Hz",
        };
        const { audioStream } = tts.toStream(segPadded, prosodyOptions);

        const chunks = [];
        audioStream.on("data", (chunk) => chunks.push(chunk));

        await new Promise((resolve, reject) => {
          audioStream.on("end", resolve);
          audioStream.on("error", reject);
        });

        const segBuffer = Buffer.concat(chunks);
        if (segBuffer && segBuffer.length > 0) {
          audioChunks.push(segBuffer);
        }
      }

      const audioBuffer = Buffer.concat(audioChunks);
      if (audioBuffer && audioBuffer.length > 0) {
        // Cache audio buffer in Redis for 24 hours
        await setCache(ttsCacheKey, audioBuffer.toString("base64"), 86400);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", audioBuffer.length);
        res.setHeader("X-Cache", "MISS");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.end(audioBuffer);
      }
    } catch (edgeErr) {
      console.warn("[AIController] MsEdgeTTS error, using Google fallback:", edgeErr.message || edgeErr);
    }

    // Fallback to Google TTS
    const fallbackBuffer = await fetchGoogleTtsFallback(clean, langKey);
    if (fallbackBuffer && fallbackBuffer.length > 0) {
      await setCache(ttsCacheKey, fallbackBuffer.toString("base64"), 86400);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", fallbackBuffer.length);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.end(fallbackBuffer);
    }

    return res.status(500).send("TTS audio synthesis failed");
  } catch (err) {
    console.error("[AIController] TTS controller error:", err);
    res.status(500).send("Internal TTS error");
  }
};

export const getKeyStatus = async (req, res) => {
  try {
    const keys = getGroqKeys();
    res.status(200).json({
      success: true,
      stats: {
        engine: "Groq",
        validKeysCount: keys.length,
        status: keys.length > 0 ? "Configured" : "Missing valid GROQ_API_KEY in backend/.env",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
