import OpenAI from "openai";

/**
 * Multi-Key Manager & Failover Handler for Groq API Keys
 */
export const getGroqKeys = () => {
  const keys = [];

  Object.keys(process.env).forEach((envKey) => {
    if (envKey.toUpperCase().includes("GROQ")) {
      const val = process.env[envKey];
      if (val && typeof val === "string") {
        const trimmed = val.trim();
        if (
          trimmed.length > 10 &&
          !trimmed.includes("YOUR_") &&
          !keys.includes(trimmed)
        ) {
          keys.push(trimmed);
        }
      }
    }
  });

  return keys;
};

let currentKeyIndex = 0;

export const executeWithGroqKeyFailover = async (apiCallFn) => {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Groq API key configured. Please paste a key starting with 'gsk_' into backend/.env under GROQ_API_KEY_1."
    );
  }

  let lastError = null;
  const startIndex = currentKeyIndex;

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length;
    const apiKey = keys[keyIndex];

    try {
      const groqClient = new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
      });

      const result = await apiCallFn(groqClient, apiKey);
      currentKeyIndex = (keyIndex + 1) % keys.length;
      return result;
    } catch (error) {
      console.warn(
        `[GroqService] Key ${keyIndex + 1}/${keys.length} error (${error.status || error.code}):`,
        error.message || error
      );
      lastError = error;
    }
  }

  if (
    lastError?.status === 401 ||
    lastError?.error?.code === "invalid_api_key" ||
    lastError?.message?.includes("Invalid API Key")
  ) {
    throw new Error(
      "Your Groq API key in backend/.env is invalid or revoked (HTTP 401). Please generate a new key at https://console.groq.com/keys and update GROQ_API_KEY_1 in backend/.env."
    );
  }

  throw lastError || new Error("All configured Groq API keys failed.");
};

/**
 * Instant script-based language detector for zero-latency neural voice selection
 */
export const detectLanguageFromText = (text, fallback = "en") => {
  if (!text || typeof text !== "string") return { code: fallback, name: "English" };
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: "te", name: "Telugu" };
  if (/[\u0900-\u097F]/.test(text)) return { code: "hi", name: "Hindi" };
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: "ta", name: "Tamil" };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: "kn", name: "Kannada" };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: "ml", name: "Malayalam" };
  if (/[\u0980-\u09FF]/.test(text)) return { code: "bn", name: "Bengali" };
  if (/[\u0A80-\u0AFF]/.test(text)) return { code: "gu", name: "Gujarati" };
  if (/[\u0A00-\u0A7F]/.test(text)) return { code: "pa", name: "Punjabi" };
  if (/[\u0600-\u06FF]/.test(text)) return { code: "ur", name: "Urdu" };
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return { code: "ja", name: "Japanese" };
  if (/[\uAC00-\uD7AF]/.test(text)) return { code: "ko", name: "Korean" };
  if (/[\u4E00-\u9FFF]/.test(text)) return { code: "zh", name: "Chinese" };
  if (/[\u0400-\u04FF]/.test(text)) return { code: "ru", name: "Russian" };
  return { code: "en", name: "English" };
};

/**
 * Multi-lingual Unparliamentary & Profanity Safety Filter
 * Covers English, Hindi, Telugu, Tamil, Kannada, Malayalam, Spanish, and generic abuse requests.
 */
export const UNPARLIAMENTARY_REGEX = new RegExp(
  [
    // English profanity and slurs
    "\\b(fuck|fucking|fucked|fucker|fck|f\\*ck|shit|bitch|bitchy|bitches|asshole|bastard|dick|pussy|cunt|slut|whore|motherfucker|cock|nigger|nigga|retard|idiot|moron|bullshit)\\b",
    // Requests/intent to learn, translate, or use bad/abusive/curse words
    "(bad\\s*words?|swear\\s*words?|curse\\s*words?|cuss\\s*words?|dirty\\s*words?|abusive\\s*words?|unparliamentary|profanit(y|ies)|vulgar\\s*words?|foul\\s*language)",
    "(how\\s*to\\s*abuse|teach\\s*(me\\s*)?(to\\s*)?abuse|translate\\s*(the\\s*)?abuse|teach\\s*(me\\s*)?(some\\s*)?(bad|curse|swear|dirty)\\s*words?)",
    // Hindi / Urdu abusive / unparliamentary words (Latin & Devanagari)
    "\\b(bhenchod|behenchod|bhadwa|madarchod|mc|bc|chutiya|chutiye|chutye|gaand|gand|lund|lauda|lavda|bsdk|bhosdike|bhosadi|bhosdika|harami|kutta|kutte|kutti|randi|saala|kamina|kaminey|gaali|galiyan|gaaliya)\\b",
    "[\\u0900-\\u097F]*(मादरचोद|बहनचोद|चूतिया|गांड|लंड|लौड़ा|भोसड़ी|हरामी|रंडी|गाली|कमीना)[\\u0900-\\u097F]*",
    "(गाली\\s*सिखा|गालियां|गाली\\s*देना|teach\\s*(me\\s*)?gaali)",
    // Telugu abusive / unparliamentary words (Latin & Telugu script)
    "\\b(dengu|dengutha|dengichuko|lanja|lanjakodaka|munda|mundamopi|puku|pooku|modda|madda|gudha|guda|bokka|vedhava|chetti|naayala|na\\s*kodaka|boothulu|bhoothulu|thittadam|tittadam|dobbey)\\b",
    "[\\u0C00-\\u0C7F]*(దెంగు|లంజ|ముండ|పూకు|మొడ్డ|గుద్ద|బూతులు|తిట్టడం|లంజకొడక|వెధవ)[\\u0C00-\\u0C7F]*",
    "(బూతులు\\s*నేర్పించు|బూతులు|teach\\s*(me\\s*)?boothulu|boothu\\s*matalu)",
    // Tamil / Kannada / Malayalam abusive words
    "\\b(thevidiya|thevdya|omala|sunni|punda|oombu|sule|sulemagane|bolimaga|poor|kunna|myre|patti)\\b",
    // Spanish and European vulgarities
    "\\b(puta|puto|mierda|coño|pendejo|pendeja|cabrón|cabron|chinga|chingar|hijo\\s*de\\s*puta|maricón|maricon|culero|verga)\\b",
  ].join("|"),
  "i"
);

export const containsUnparliamentaryLanguage = (text) => {
  if (!text || typeof text !== "string") return false;
  const normalized = text
    .replace(/[@]/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[!]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "i")
    .trim();
  return UNPARLIAMENTARY_REGEX.test(text) || UNPARLIAMENTARY_REGEX.test(normalized);
};

export const getSafetyRefusalResponse = (learningLanguage = "Spanish", nativeLanguage = "auto") => {
  const chosenTarget = learningLanguage || "Spanish";
  const targetLower = chosenTarget.toLowerCase();
  const nativeLower = (nativeLanguage || "English").toLowerCase();

  const targetRefusals = {
    spanish: {
      targetText: "Como entrenador de comunicación, mantengo conversaciones respetuosas y constructivas.",
      romanization: "",
    },
    french: {
      targetText: "En tant qu'entraîneur en communication, je maintiens des échanges respectueux et constructifs.",
      romanization: "",
    },
    german: {
      targetText: "Als dein Kommunikationstrainer führe ich stets respektvolle und konstruktive Gespräche.",
      romanization: "",
    },
    hindi: {
      targetText: "एक भाषा प्रशिक्षक के रूप में, मैं केवल सम्मानजनक और सकारात्मक भाषा का उपयोग करता हूँ।",
      romanization: "Ek bhasha prashikshak ke roop mein, main keval sammanjanak aur sakaratmak bhasha ka upayog karta hoon.",
    },
    telugu: {
      targetText: "కమ్యూనికేషన్ కోచ్‌గా, నేను ఎల్లప్పుడూ గౌరవప్రదమైన మరియు మంచి సంభాషణను మాత్రమే ప్రోత్సహిస్తాను.",
      romanization: "Communication coach ga, nenu ellappudu gouravapradamaina mariyu manchi sambhashananu maathrame protsahisthanu.",
    },
    tamil: {
      targetText: "தொடர்பு பயிற்சியாளராக, நான் எப்போதும் கண்ணியமான மற்றும் ஆக்கபூர்வமான உரையாடலை மட்டுமே ஊக்குவிக்கிறேன்.",
      romanization: "Thodharbu payirchiyaalaraaga, naan eppodhum kanniyamaana matrum aakkapoorvamaana uraiyaadalai mattume ookkuvikkiren.",
    },
    kannada: {
      targetText: "ಸಂವಹನ ತರಬೇತುದಾರನಾಗಿ, ನಾನು ಯಾವಾಗಲೂ ಗೌರವಾನ್ವಿತ ಮತ್ತು ಸಕಾರಾತ್ಮಕ ಸಂಭಾಷಣೆಯನ್ನು ಮಾತ್ರ ಬೆಂಬಲಿಸುತ್ತೇನೆ.",
      romanization: "Samvahana tarabayitudaranagi, naanu yaavagalu gouravanvita mattu sakaratmaka sambhashaneyannu matra bembalisuttene.",
    },
    japanese: {
      targetText: "コミュニケーションコーチとして、常に丁寧で敬意のある会話を大切にしています。",
      romanization: "Komyunikēshon kōchi toshite, tsuneni teinei de keii no aru kaiwa o taisetsu ni shiteimasu.",
    },
    italian: {
      targetText: "Come tuo coach di comunicazione, mantengo conversazioni sempre rispettose e costruttive.",
      romanization: "",
    },
    english: {
      targetText: "As your communication coach, I always uphold respectful, dignified, and constructive dialogue.",
      romanization: "",
    },
  };

  const targetEntry = targetRefusals[targetLower] || {
    targetText: "Let's keep our communication practice polite, respectful, and constructive.",
    romanization: "",
  };

  let nativeExplanation =
    "I cannot answer or assist with unparliamentary, profane, or abusive language. Let's keep our communication practice polite, respectful, and positive! 😊";

  if (nativeLower.includes("telugu") || nativeLower === "te") {
    nativeExplanation =
      "నేను అసభ్యకరమైన, అనుచితమైన లేదా దూషించే భాషకు సమాధానం ఇవ్వలేను. దయచేసి సంభాషణను గౌరవప్రదంగా మరియు నేర్చుకునే విధంగా కొనసాగిద్దాం! 😊";
  } else if (nativeLower.includes("hindi") || nativeLower === "hi") {
    nativeExplanation =
      "मैं किसी भी प्रकार की असंसदीय, अश्लील या अनुचित भाषा का उत्तर नहीं दे सकता। आइए अपनी बातचीत को हमेशा शालीन, सकारात्मक और सीखने योग्य रखें! 😊";
  } else if (nativeLower.includes("tamil") || nativeLower === "ta") {
    nativeExplanation =
      "அநாகரீகமான, ஆபாசமான அல்லது முறையற்ற வார்த்தைகளுக்கு என்னால் பதிலளிக்க முடியாது. கண்ணியமான மொழியில் நமது பயிற்சியைத் தொடர்வோம்! 😊";
  } else if (nativeLower.includes("kannada") || nativeLower === "kn") {
    nativeExplanation =
      "ಅಸಂಸದೀಯ, ಅಶ್ಲೀಲ ಅಥವಾ ಅವಾಚ್ಯ ಶಬ್ದಗಳಿಗೆ ನಾನು ಉತ್ತರಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ನಮ್ಮ ಸಂಭಾಷಣೆಯನ್ನು ಗೌರವಾನ್ವಿತವಾಗಿ ಮತ್ತು ಉಪಯುಕ್ತವಾಗಿ ಮುಂದುವರಿಸೋಣ! 😊";
  } else if (nativeLower.includes("spanish") || nativeLower === "es") {
    nativeExplanation =
      "No puedo responder ni asistir con lenguaje soez, vulgar o inapropiado. ¡Mantengamos siempre una práctica respetuosa y constructiva! 😊";
  } else if (nativeLower.includes("french") || nativeLower === "fr") {
    nativeExplanation =
      "Je ne peux pas répondre aux propos injurieux, vulgaires ou déplacés. Gardons notre échange courtois et enrichissant ! 😊";
  }

  let formattedReply = targetEntry.targetText;
  if (targetEntry.romanization) {
    formattedReply += `\n(${targetEntry.romanization})`;
  }
  formattedReply += `\n\n(${nativeExplanation})`;

  return {
    reply: formattedReply,
    targetText: targetEntry.targetText,
    nativeExplanation,
    romanization: targetEntry.romanization,
    tip: "Decorum Tip: Respectful, parliamentary language builds lasting confidence and positive relationships everywhere.",
    spokenAudioText: targetEntry.targetText,
    nativeAudioText: nativeExplanation,
    targetLanguage: chosenTarget,
    nativeLanguage: nativeLanguage || "English",
    detectedLanguage: "en",
    detectedLanguageName: "English",
    isSafetyRefusal: true,
  };
};

/**
 * Multi-lingual Dating, Love Advice, Romance & Pickup Lines Filter
 * Strictly prevents AI from answering how to date girls/boys, love advice, relationship coaching, pickup lines, etc.
 */
export const DATING_AND_LOVE_ADVICE_REGEX = new RegExp(
  [
    // 1. "how to date / ask out / go out with / meet / find / get" girls, women, boys, crush, girlfriend, boyfriend
    "\\bhow\\s+to\\s+(date|ask\\s+out|go\\s+out\\s+with|meet|find|get)\\s+(a\\s+)?(girls?|wom[ae]n|females?|boys?|m[ae]n|someone|crush|my\\s+crush|her|him|dates?|girlfriends?|gfs?|boyfriends?|bfs?)\\b",
    // 2. Dating advice / tips / coach / guide / secrets / rules / hacks
    "\\b(dating|date)\\s+(advice|advises?|tips?|guide|rules?|help|tricks?|secrets?|coach|coaching|ideas?|strategies|hacks?)\\b",
    // 3. "date girls", "dating girls", "date a girl", "dating a girl/woman/crush"
    "\\b(date|dating)\\s+(a\\s+)?(girls?|wom[ae]n|boys?|crush|females?)\\b",
    // 4. "how to get a girlfriend/boyfriend", "get a gf/bf", "need a girlfriend/boyfriend", "want a girlfriend"
    "\\b(how\\s+to\\s+)?(get|find|want|need|have)\\s+(a\\s+)?(girlfriend|boyfriend|gf|bf)\\b",
    // 5. "how to impress / attract / charm / woo / seduce / win" girls, women, crush, boys
    "\\bhow\\s+to\\s+(impress|attract|charm|woo|seduce|win|flirt\\s+with)\\s+(a\\s+)?(girls?|wom[ae]n|crush|my\\s+crush|boys?|m[ae]n|her|him|someone|anyone)\\b",
    // 6. "impress girls", "impress a girl", "impress my crush", "impressing girls"
    "\\b(impress|impressing|attract|attracting|seduce|seducing)\\s+(a\\s+)?(girls?|wom[ae]n|crush|my\\s+crush|boys?)\\b",
    // 7. "make a girl/her/someone fall in love with me", "make her like me"
    "\\bhow\\s+to\\s+make\\s+(a\\s+)?(girls?|wom[ae]n|crush|her|someone)\\s+(fall\\s+in\\s+love|love\\s+me|like\\s+me|obsessed\\s+with\\s+me|attracted\\s+to\\s+me)\\b",
    // 8. "how to talk to girls", "how to chat with girls" (common dating/pickup queries)
    "\\bhow\\s+to\\s+(talk|chat|speak)\\s+(to|with)\\s+(girls?|wom[ae]n|crush|my\\s+crush)\\b",
    // 9. Love advice / love advises / love tips / romance advice / relationship advice
    "\\b(love|romance|romantic|relationship)\\s+(advice|advises?|tips?|counseling|coach|guru|problems?|secrets?|hacks?)\\b",
    "\\b(give|tell|share|provide)\\s+(me\\s+)?(some\\s+)?(love|dating|relationship|romance)\\s+(advice|advises?|tips?)\\b",
    // 10. Propose / confess love to a girl / crush / someone
    "\\b(how\\s+to\\s+)?(propose|confess\\s+(my\\s+)?love)\\s+(to\\s+)?(a\\s+)?(girls?|wom[ae]n|crush|my\\s+crush|someone|her)\\b",
    "\\b(how\\s+to\\s+)?propose\\s+(love|to\\s+a\\s+girl|to\\s+my\\s+crush)\\b",
    // 11. Pickup lines / flirt lines / rizz / flirting tips / seduction
    "\\b(pick\\s*[-]?\\s*up\\s*lines?|flirt\\s*lines?|rizz\\s*(lines?|tips?|guide)|how\\s*to\\s*rizz)\\b",
    "\\b(flirting|flirt)\\s+(tips?|advice|techniques?|guide|hacks?)\\b",
    "\\b(how\\s+to\\s+flirt|how\\s+to\\s+seduce|seduction\\s+(tips?|advice|guide))\\b",
    "\\b(give|tell|teach)\\s+(me\\s+)?(some\\s+)?(pickup|flirt|romantic\\s*pickup)\\s*lines?\\b",
    // 12. Hindi / Hinglish dating & love advice patterns
    "\\b(ladki|ladkiyo[n]?|bandi)\\s+(ko\\s+)?(kaise\\s+)?(pataye|patana|patate|patao|impress\\s+kare|impress\\s+karna)\\b",
    "\\b(ladki|ladkiyo[n]?|bandi)\\s+(patane|impress\\s+karne)\\s+(ke|ka)\\s+(tarike|tips|formula|rules)\\b",
    "\\b(ladki|ladkiyo[n]?|bandi)\\s+(se\\s+)?(kaise\\s+)?baat\\s+kare\\b",
    "\\b(girlfriend|gf|bandi)\\s+kaise\\s+(banaye|banau|pau|pataye)\\b",
    "\\b(crush\\s+(ko|se)\\s+)?(kaise\\s+propose|propose\\s+kaise)\\s+(kare|karein|karu)\\b",
    "\\bpropose\\s+(kaise\\s+kare|karna|karu|karne\\s+ka\\s+tarika)\\b",
    "\\b(pyaar|prem|ishq|pyar)\\s+(ka\\s+izhaar|ke\\s+tips|ki\\s+salah|advice)\\b",
    "\\b(love|dating)\\s+tips\\s+hindi\\b",
    // Devanagari Hindi
    "[\\u0900-\\u097F]*(लड़की\\s*(को\\s*)?(कैसे\\s*)?पटायें?|लड़की\\s*पटाने|लड़की\\s*को\\s*इम्प्रेस|गर्लफ्रेंड\\s*कैसे\\s*बनाएं?|प्रपोज\\s*कैसे\\s*करे|प्यार\\s*के\\s*टिप्स|लव\\s*टिप्स)[\\u0900-\\u097F]*",
    // 13. Telugu dating & love advice patterns (Latin & Telugu script)
    "\\b(ammayi(ni)?|ammayilani)\\s+(ela\\s+)?(impress\\s+cheyali|padeseyali|pataistha|patayali|love\\s+lo\\s+padeseyali)\\b",
    "\\b(ammayi(ni)?|ammayilani)\\s+(impress\\s+cheyadam|padeseyadam|patayadam)\\b",
    "\\b(ammayi|ammayila)(\\s*tho)?\\s+(ela\\s+)?matladali\\b",
    "\\b(girlfriend|gf)\\s+ela\\s+(chesukovali|dorukuthundi|set\\s+cheyali)\\b",
    "\\b(crush\\s+ni\\s+)?(ela\\s+)?(love\\s+)?propose\\s+cheyali\\b",
    "\\b(love|dating)\\s+tips\\s+telugu\\b",
    // Telugu script
    "[\\u0C00-\\u0C7F]*(అమ్మాయిని\\s*ఎలా\\s*ఇంప్రెస్|అమ్మాయిని\\s*పడేయడం|గర్ల్‌ఫ్రెండ్\\s*ఎలా|లవ్\\s*టిప్స్|ప్రపోజ్\\s*ఎలా)[\\u0C00-\\u0C7F]*",
    // 14. Tamil / Kannada / Spanish dating patterns
    "\\b(ponnu\\s+impress|ponnu\\s+kooda\\s+date|kadhal\\s+tips|kadhal\\s+advice)\\b",
    "\\b(hudugi\\s+impress|preethi\\s+tips|preethi\\s+advice)\\b",
    "\\b(c[oó]mo\\s+conquistar\\s+(a\\s+)?(una\\s+)?(chica|mujer)|c[oó]mo\\s+ligar|consejos\\s+de\\s+(amor|citas)|conseguir\\s+novia|piropos\\s+para\\s+(ligar|enamorar))\\b",
  ].join("|"),
  "i"
);

export const containsDatingOrLoveAdviceRequest = (text) => {
  if (!text || typeof text !== "string") return false;
  return DATING_AND_LOVE_ADVICE_REGEX.test(text);
};

export const getDatingRefusalResponse = (learningLanguage = "Spanish", nativeLanguage = "auto") => {
  const chosenTarget = learningLanguage || "Spanish";
  const targetLower = chosenTarget.toLowerCase();
  const nativeLower = (nativeLanguage || "English").toLowerCase();

  const targetRefusals = {
    spanish: {
      targetText: "Como tu tutor de idiomas, me concentro exclusivamente en el aprendizaje lingüístico, la pronunciación y la comunicación diaria. No ofrezco consejos sobre citas ni relaciones amorosas.",
      romanization: "",
    },
    french: {
      targetText: "En tant que coach linguistique, je me consacre à l'apprentissage de la langue, à la prononciation et à la communication du quotidien. Je ne donne pas de conseils de séduction ou de vie amoureuse.",
      romanization: "",
    },
    german: {
      targetText: "Als dein Sprachtrainer konzentriere ich mich ausschließlich auf Sprachkenntnisse, Aussprache und alltägliche Kommunikation. Ich gebe keine Dating- oder Liebesratschläge.",
      romanization: "",
    },
    hindi: {
      targetText: "एक भाषा प्रशिक्षक के रूप में, मैं केवल भाषा सीखने, उच्चारण और दैनिक बातचीत कौशल पर ध्यान देता हूँ। मैं डेटिंग या प्रेम संबंधी सलाह नहीं देता हूँ।",
      romanization: "Ek bhasha prashikshak ke roop mein, main keval bhasha seekhne, uccharan aur dainik baat-cheet par dhyan deta hoon. Main dating ya prem sambandhi salah nahi deta hoon.",
    },
    telugu: {
      targetText: "కమ్యూనికేషన్ మరియు భాషా కోచ్‌గా, నేను భాషా అభ్యాసం, ఉచ్చారణ మరియు రోజువారీ సంభాషణలపై మాత్రమే దృష్టి పెడతాను. నేను డేటింగ్ లేదా ప్రేమ సలహాలు ఇవ్వను.",
      romanization: "Communication mariyu bhasha coach ga, nenu bhasha abhyasam, uccharana mariyu rojuvari sambhashanalapai maathrame drushti pedathanu. Nenu dating leda prema salahalu ivvanu.",
    },
    tamil: {
      targetText: "மொழி மற்றும் தொடர்பு பயிற்சியாளராக, நான் மொழி கற்றல், உச்சரிப்பு மற்றும் அன்றாட உரையாடல்களில் மட்டுமே கவனம் செலுத்துகிறேன். நான் டேட்டிங் அல்லது காதல் ஆலோசனைகளை வழங்குவதில்லை.",
      romanization: "Mozhi matrum thodharbu payirchiyaalaraaga, naan mozhi katral, uccharippu matrum anrada uraiyaadalgalil mattume kavanam seluthugiren. Naan dating alladhu kaadhal aalosanaiyai vazhanguvadhillai.",
    },
    kannada: {
      targetText: "ಭಾಷಾ ತರಬೇತುದಾರನಾಗಿ, ನಾನು ಭಾಷಾ ಕಲಿಕೆ, ಉಚ್ಚಾರಣೆ ಮತ್ತು ದೈನಂದಿನ ಸಂಭಾಷಣೆಯ ಮೇಲೆ ಮಾತ್ರ ಗಮನ ಹರಿಸುತ್ತೇನೆ. ನಾನು ಡೇಟಿಂಗ್ ಅಥವಾ ಪ್ರೇಮ ಸಲಹೆಗಳನ್ನು ನೀಡುವುದಿಲ್ಲ.",
      romanization: "Bhasha tarabayitudaranagi, naanu bhasha kalike, uccharane mattu dainandina sambhashaneya mele matra gamana harisuttene. Naanu dating athava prema salahegalannu needuvudilla.",
    },
    japanese: {
      targetText: "語学コーチとして、語学学習、発音、日常会話のスキル向上のみをサポートしています。恋愛やデートに関するアドバイスは行っていません。",
      romanization: "Gogaku kōchi toshite, gogaku gakushū, hatsuon, nichijō kaiwa no sukiru kōjō nomi o sapōto shiteimasu. Ren'ai ya dēto ni kansuru adobaisu wa okonatte imasen.",
    },
    italian: {
      targetText: "Come tuo tutor di lingua, mi concentro sull'apprendimento linguistico e sulla comunicazione quotidiana. Non fornisco consigli su appuntamenti o questioni amorose.",
      romanization: "",
    },
    english: {
      targetText: "As your communication coach, I focus exclusively on language learning, pronunciation, and practical conversational skills. I do not provide dating, romance, or relationship advice.",
      romanization: "",
    },
  };

  const targetEntry = targetRefusals[targetLower] || {
    targetText: "As your communication coach, I focus exclusively on language learning, pronunciation, and practical conversational skills. I do not provide dating, romance, or relationship advice.",
    romanization: "",
  };

  let nativeExplanation =
    "I am here to help you develop language and communication skills. I do not provide dating advice, tips to impress girls/boys, love advice, or pickup lines. Let's practice useful everyday conversations like travel, hobbies, career, or daily routines! 😊";

  if (nativeLower.includes("telugu") || nativeLower === "te") {
    nativeExplanation =
      "నేను మీకు భాషా ప్రావీణ్యం, ఉచ్చారణ మరియు సంభాషణ నైపుణ్యాలను నేర్పించడానికి మాత్రమే సహాయం చేస్తాను. అమ్మాయిలను ఎలా ఇంప్రెస్ చేయాలి, డేటింగ్ టిప్స్, లవ్ అడ్వైస్ లేదా ప్రేమ సంబంధిత విషయాలపై నేను సమాధానం ఇవ్వను. దయచేసి ప్రయాణం, కెరీర్, రోజువారీ మాటలు వంటి ఉపయోగకరమైన అంశాలను నేర్చుకుందాం! 😊";
  } else if (nativeLower.includes("hindi") || nativeLower === "hi") {
    nativeExplanation =
      "मैं आपको भाषा, शब्दावली, उच्चारण और अच्छे संवाद कौशल सिखाने के लिए हूँ। मैं डेटिंग सलाह, लड़कियों को इम्प्रेस करने के तरीके, प्रेम सलाह (love advice) या पिकअप लाइन्स पर उत्तर नहीं देता। आइए करियर, यात्रा, दैनिक वार्तालाप या नए शब्दों का अभ्यास करें! 😊";
  } else if (nativeLower.includes("tamil") || nativeLower === "ta") {
    nativeExplanation =
      "மொழித்திறன், உச்சரிப்பு மற்றும் உரையாடல்களைக் கற்றுக்கொடுப்பதே எனது நோக்கம். டேட்டிங், பெண்களை கவரும் வழிகள் அல்லது காதல் ஆலோசனைகள் குறித்து நான் பதிலளிக்க முடியாது. பயனுள்ள அன்றாட உரையாடல்களைப் பயிற்சி செய்வோம்! 😊";
  } else if (nativeLower.includes("kannada") || nativeLower === "kn") {
    nativeExplanation =
      "ನಾನು ನಿಮಗೆ ಭಾಷಾ ಕೌಶಲ್ಯ, ಉಚ್ಚಾರಣೆ ಮತ್ತು ಸಂಭಾಷಣೆಯನ್ನು ಕಲಿಸಲು ಇಲ್ಲಿದ್ದೇನೆ. ಹುಡುಗಿಯರನ್ನು ಮೆಚ್ಚಿಸುವುದು, ಡೇಟಿಂಗ್ ಸಲಹೆಗಳು ಅಥವಾ ಪ್ರೇಮ ಸಲಹೆಗಳ ಬಗ್ಗೆ ನಾನು ಉತ್ತರಿಸುವುದಿಲ್ಲ. ಉಪಯುಕ್ತವಾದ ದೈನಂದಿನ ಸಂಭಾಷಣೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡೋಣ! 😊";
  } else if (nativeLower.includes("spanish") || nativeLower === "es") {
    nativeExplanation =
      "Estoy aquí para ayudarte a desarrollar habilidades de comunicación, gramática, vocabulario y pronunciación. No proporciono consejos sobre citas amorosas, cómo conquistar a chicas ni frases para ligar. ¡Practiquemos situaciones útiles como viajes o trabajo! 😊";
  } else if (nativeLower.includes("french") || nativeLower === "fr") {
    nativeExplanation =
      "Je suis là pour vous aider à maîtriser la langue, la grammaire et la prononciation. Je ne fournis pas de conseils de séduction, de rendez-vous amoureux ou de vie sentimentale. Pratiquons des sujets pratiques de la vie quotidienne ! 😊";
  }

  let formattedReply = targetEntry.targetText;
  if (targetEntry.romanization) {
    formattedReply += `\n(${targetEntry.romanization})`;
  }
  formattedReply += `\n\n(${nativeExplanation})`;

  return {
    reply: formattedReply,
    targetText: targetEntry.targetText,
    nativeExplanation,
    romanization: targetEntry.romanization,
    tip: "Educational Focus Tip: Focusing on practical vocabulary, confidence, and respectful communication prepares you best for any real-world situation.",
    spokenAudioText: targetEntry.targetText,
    nativeAudioText: nativeExplanation,
    targetLanguage: chosenTarget,
    nativeLanguage: nativeLanguage || "English",
    detectedLanguage: "en",
    detectedLanguageName: "English",
    isSafetyRefusal: true,
    isDatingRefusal: true,
  };
};

export const generateGroqChat = async ({
  userName = "Friend",
  message,
  learningLanguage = "Spanish",
  nativeLanguage = "auto",
  userSpeakingMode = "auto", // "learning" | "native" | "auto"
  history = [],
}) => {
  const isAutoDetect =
    !nativeLanguage ||
    nativeLanguage.toLowerCase() === "auto" ||
    nativeLanguage.toLowerCase().includes("auto");
  const chosenTarget = learningLanguage || "Spanish";
  const chosenNative = isAutoDetect
    ? "the user's communicative language (e.g. Telugu, Hindi, English)"
    : nativeLanguage;

  // 1. FAST PRE-FILTER: Instantly refuse unparliamentary language, profanity, or abuse requests
  if (containsUnparliamentaryLanguage(message)) {
    return getSafetyRefusalResponse(chosenTarget, chosenNative);
  }

  // 2. FAST PRE-FILTER: Instantly refuse dating advice, romance, pickup lines, or relationship coaching
  if (containsDatingOrLoveAdviceRequest(message)) {
    return getDatingRefusalResponse(chosenTarget, chosenNative);
  }

  let modeInstruction = "";
  if (userSpeakingMode === "learning") {
    modeInstruction = `The user is practicing speaking in ${chosenTarget}. Converse in ${chosenTarget}, gently correct any grammar or pronunciation in the native explanation if needed, and advance the dialogue naturally.`;
  } else if (userSpeakingMode === "native") {
    modeInstruction = `The user is asking a question or doubt in their native language. Directly answer their question in ${chosenNative} and teach them how to express it in ${chosenTarget}.`;
  } else {
    modeInstruction = `If the user spoke in ${chosenTarget}, converse in ${chosenTarget}. If the user asked a question in their native language, answer and teach them ${chosenTarget}.`;
  }

  const systemContent = `You are LangBridge AI, an engaging, friendly, and world-class Language Tutor helping ${userName} learn ${chosenTarget}.
Explanation / Instructional Language: ${chosenNative}.

CORE TEACHING RULES:
1. ${modeInstruction}
2. BITE-SIZED CONVERSATIONAL TURNS (ABSOLUTE RULE: KEEP IT CRISP & SHORT):
   - "targetText": Exactly 1 to 2 natural, friendly conversational sentences strictly in ${chosenTarget} script.
   - "romanization": Clean Latin romanization of targetText for non-Latin scripts (e.g. Hindi, Japanese, Russian, Chinese, Korean, Arabic). If target language already uses Latin script (e.g. Spanish, French, German, Italian, Portuguese, English), return empty string "".
   - "nativeExplanation": Exactly 1 to 2 sentences strictly in ${chosenNative} explaining the meaning and 1 key word or usage note.
   - "tip": One short, memorable 1-sentence tip in ${chosenNative} (or null).
3. ABSOLUTE DECORUM & UNPARLIAMENTARY LANGUAGE POLICY (STRICT SAFETY CONTRACT):
   - Under NO circumstances should you generate, repeat, translate, explain, or entertain bad words, profanity, cuss words, vulgar expressions, slurs, sexual obscenities, abusive insults, or unparliamentary language in ANY language (English, Telugu, Hindi, Spanish, French, etc.).
   - If the user uses, asks to translate, or requests bad words or unparliamentary language:
     YOU MUST NOT ANSWER OR COMPLY WITH THEIR REQUEST.
     Instead, politely decline in a courteous and respectful manner in targetText and nativeExplanation, reminding them to maintain a respectful, clean, and constructive learning environment.
4. ABSOLUTE NO DATING, LOVE, OR ROMANCE ADVICE POLICY (STRICT SAFETY CONTRACT):
   - Under NO circumstances should you provide dating advice, love advice, relationship advice, pickup lines, flirting guidance, rizz advice, seduction tips, love proposal coaching, or advice on how to date or impress girls/women/boys/men in ANY language.
   - If the user asks for dating advice, love tips, how to talk to girls to date them, how to get a girlfriend/boyfriend, or how to propose love:
     YOU MUST NOT ANSWER OR COMPLY WITH THEIR REQUEST.
     Instead, politely decline in targetText and nativeExplanation, explaining that you are strictly an educational language and communication coach focused on language learning and pronunciation, and invite them to practice practical conversational topics instead.
5. NEVER write long paragraphs, walls of text, or multiple sentences.
6. Keep dialogue flowing naturally across turns.

Return ONLY a valid JSON object matching this schema (NO markdown formatting outside, just JSON):
{
  "targetText": "<1-2 natural conversational sentences in ${chosenTarget} script>",
  "romanization": "<Latin romanization of targetText for non-Latin scripts (e.g. Hindi, Japanese, Russian, Chinese, Korean, Arabic). If target language already uses Latin script (e.g. Spanish, French, German, Italian, Portuguese, English), return empty string \"\">",
  "nativeExplanation": "<1-2 sentences with meaning and 1 key word/tip in ${chosenNative}>",
  "tip": "<Short 1-sentence tip or null>"
}`;


  const messages = [
    {
      role: "system",
      content: systemContent,
    },
  ];

  if (Array.isArray(history) && history.length > 0) {
    history.slice(-10).forEach((h) => {
      if (h.role && h.content) {
        messages.push({
          role: h.role === "model" || h.role === "assistant" ? "assistant" : "user",
          content: typeof h.content === "string" ? h.content : JSON.stringify(h.content),
        });
      }
    });
  }

  messages.push({
    role: "user",
    content: message || "Hello",
  });

  const candidateModels = [
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "groq/compound",
    "qwen/qwen3.6-27b",
  ];

  return await executeWithGroqKeyFailover(async (groqClient) => {
    let completion = null;
    let modelErr = null;

    for (const modelName of candidateModels) {
      try {
        completion = await groqClient.chat.completions.create({
          model: modelName,
          messages,
          temperature: 0.3,
          max_tokens: 850,
          top_p: 0.9,
        });
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err) {
        console.warn(`[GroqService] Model ${modelName} failed:`, err.message);
        modelErr = err;
        completion = null;
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw modelErr || new Error("Failed to generate AI response from Groq models.");
    }

    let rawReply = completion.choices[0].message.content;
    rawReply = rawReply.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();

    let card = null;
    try {
      let cleanJson = rawReply.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleanJson);
      if (parsed.targetText || parsed.nativeExplanation) {
        card = {
          targetText: parsed.targetText?.trim() || "",
          romanization: parsed.romanization?.trim() || "",
          nativeExplanation: parsed.nativeExplanation?.trim() || "",
          tip: parsed.tip?.trim() || null,
        };
      }
    } catch (parseErr) {
      console.warn("[GroqService] JSON parse fallback for chat reply:", parseErr.message);
    }

    // Multi-tier regex extraction fallback if JSON.parse failed or incomplete
    if (!card || !card.targetText) {
      const extractField = (key) => {
        const regex = new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, "i");
        const match = rawReply.match(regex);
        if (match && match[1]) {
          return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
        }
        const openRegex = new RegExp(`"${key}"\\s*:\\s*"([^"\\n\\r}]+)`, "i");
        const openMatch = rawReply.match(openRegex);
        if (openMatch && openMatch[1]) {
          return openMatch[1].replace(/\\"/g, '"').trim();
        }
        return "";
      };

      const extractedTarget = extractField("targetText");
      const extractedNative = extractField("nativeExplanation");
      const extractedRom = extractField("romanization");
      const extractedTip = extractField("tip");

      if (extractedTarget || extractedNative) {
        card = {
          targetText: extractedTarget,
          romanization: extractedRom,
          nativeExplanation: extractedNative,
          tip: extractedTip || null,
        };
      }
    }

    // Ultimate fallback if no JSON keys found
    if (!card || (!card.targetText && !card.nativeExplanation)) {
      const cleanRaw = rawReply
        .replace(/```json[\s\S]*?```/gi, "")
        .replace(/[{}[\]"]/g, "")
        .trim();
      const lines = cleanRaw.split("\n").map((l) => l.trim()).filter(Boolean);
      card = {
        targetText: lines[0] || rawReply.substring(0, 100),
        romanization: "",
        nativeExplanation: lines.slice(1).join("\n") || "",
        tip: null,
      };
    }

    // Defensive cleanup of any remaining JSON wrappers or keys in values
    const sanitizeField = (text) => {
      if (!text) return "";
      let s = String(text).trim();
      s = s.replace(/^{?\s*"targetText"\s*:\s*"?/i, "");
      s = s.replace(/^{?\s*"nativeExplanation"\s*:\s*"?/i, "");
      s = s.replace(/^{?\s*"romanization"\s*:\s*"?/i, "");
      s = s.replace(/["}\s]+$/g, "").trim();
      return s;
    };

    card.targetText = sanitizeField(card.targetText);
    card.nativeExplanation = sanitizeField(card.nativeExplanation);
    card.romanization = sanitizeField(card.romanization);

    // Suppress redundant romanization for Latin script target languages
    const LATIN_LANGUAGES = ["spanish", "french", "german", "italian", "portuguese", "english"];
    if (
      LATIN_LANGUAGES.includes(chosenTarget.toLowerCase()) ||
      card.romanization.toLowerCase() === card.targetText.toLowerCase()
    ) {
      card.romanization = "";
    }

    // Clean conversational format: Target language first, native explanation in parentheses
    let formattedReply = card.targetText;
    if (card.romanization && card.romanization.toLowerCase() !== card.targetText.toLowerCase()) {
      formattedReply += `\n(${card.romanization})`;
    }
    if (card.nativeExplanation) {
      formattedReply += `\n\n(${card.nativeExplanation})`;
    }

    const spokenAudioText = card.targetText;
    const nativeAudioText = card.nativeExplanation;

    const detected = detectLanguageFromText(card.nativeExplanation || rawReply, "en");
    const resolvedNativeLang = isAutoDetect ? detected.name : chosenNative;
    const resolvedNativeCode = isAutoDetect ? detected.code : (detectLanguageFromText(chosenNative).code || "en");

    // POST-FILTER SANITIZER: Ensure model output does not contain unparliamentary language or dating advice
    if (
      containsUnparliamentaryLanguage(card.targetText) ||
      containsUnparliamentaryLanguage(card.nativeExplanation)
    ) {
      return getSafetyRefusalResponse(chosenTarget, chosenNative);
    }

    if (
      containsDatingOrLoveAdviceRequest(card.targetText) ||
      containsDatingOrLoveAdviceRequest(card.nativeExplanation)
    ) {
      return getDatingRefusalResponse(chosenTarget, chosenNative);
    }

    return {
      reply: formattedReply,
      targetText: card.targetText,


      nativeExplanation: card.nativeExplanation,
      romanization: card.romanization,
      tip: card.tip,
      spokenAudioText,
      nativeAudioText,
      targetLanguage: chosenTarget,
      nativeLanguage: resolvedNativeLang,
      detectedLanguage: resolvedNativeCode,
      detectedLanguageName: resolvedNativeLang,
    };
  });
};

export const evaluateSpeechPronunciation = async ({
  targetSentence,
  userTranscript = "",
  learningLanguage = "Spanish",
  nativeLanguage = "English",
}) => {
  const isAutoDetect =
    !nativeLanguage ||
    nativeLanguage.toLowerCase() === "auto" ||
    nativeLanguage.toLowerCase().includes("auto");
  const chosenNative = isAutoDetect ? "English" : nativeLanguage;

  const cleanTranscript = (userTranscript || "").trim();
  const isAudioSilent =
    !cleanTranscript ||
    cleanTranscript === "(Silence or unclear speech)" ||
    cleanTranscript.length < 2;

  const prompt = `You are an expert, encouraging Language Pronunciation Coach.
Target Phrase to Pronounce: "${targetSentence}"
User's Actual Spoken Speech Transcription: "${cleanTranscript || "(Silence or no clear speech)"}"
Target Language: ${learningLanguage}
User's Native Language (for explanations & suggestions): ${chosenNative}

TASK:
1. Break down the Target Phrase word by word and compare against the user's spoken speech.
2. For each word in the Target Phrase, determine pronunciation accuracy:
   - "green": Pronounced accurately and clearly.
   - "yellow": Understood, but with slight hesitation, accent, or minor vowel/consonant slip.
   - "red": Mispronounced, omitted, substituted with another word, or skipped.
3. If the user made mistakes (yellow or red words), list them in "mistakes":
   - "word": The target word that had an issue
   - "heard": What was actually heard from the user, or "(omitted)"
   - "issue": Brief description of what went wrong
   - "suggestion": Concrete, actionable advice strictly in ${chosenNative} on how to position the mouth, tongue, or articulate the sound correctly.
4. Calculate an accurate overall score (0 to 100):
   ${isAudioSilent ? "- Since no clear speech was heard, score must be between 10 and 25." : "- Reflect the ratio of accurate vs mispronounced words."}
5. Provide ONE overall actionable mouth/tongue placement tip strictly in ${chosenNative}.

Return ONLY a valid JSON object matching this schema (NO markdown outside, just valid JSON):
{
  "score": <number 0-100>,
  "accuracy": "<'Excellent' | 'Great' | 'Good' | 'Needs Practice' | 'Unclear Audio'>",
  "words": [
    { "word": "<Target word>", "status": "<'green' | 'yellow' | 'red'>" }
  ],
  "mistakes": [
    {
      "word": "<Target word>",
      "heard": "<What was heard or (omitted)>",
      "issue": "<What was wrong>",
      "suggestion": "<Actionable fix strictly in ${chosenNative}>"
    }
  ],
  "tip": "<Overall 1-sentence tip strictly in ${chosenNative}>"
}`;

  const candidateModels = [
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "groq/compound",
    "qwen/qwen3.6-27b",
  ];

  return await executeWithGroqKeyFailover(async (groqClient) => {
    let completion = null;
    let modelErr = null;

    for (const modelName of candidateModels) {
      try {
        completion = await groqClient.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 650,
        });
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err) {
        modelErr = err;
        completion = null;
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw modelErr || new Error("Failed to evaluate pronunciation.");
    }

    let rawReply = completion.choices[0].message.content;
    rawReply = rawReply.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();

    try {
      let cleanJson = rawReply.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleanJson);
      return {
        score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : (isAudioSilent ? 20 : 80),
        accuracy: parsed.accuracy || (isAudioSilent ? "Unclear Audio" : parsed.score >= 85 ? "Great" : "Good"),
        words: Array.isArray(parsed.words)
          ? parsed.words
          : targetSentence.split(/\s+/).map((w) => ({ word: w, status: "green" })),
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
        tip: parsed.tip || (isAudioSilent ? "No clear speech was heard. Please speak clearly into your microphone." : "Keep your tongue relaxed and articulate clearly."),
        userTranscript: cleanTranscript || "(No speech detected)",
      };
    } catch (parseErr) {
      const targetWords = targetSentence.split(/\s+/).filter(Boolean);
      const spokenLower = cleanTranscript.toLowerCase();
      const mistakes = [];
      let matchCount = 0;

      const words = targetWords.map((w) => {
        const cleanW = w.toLowerCase().replace(/[.,!?;:¿¡]/g, "");
        const matched = spokenLower.includes(cleanW);
        if (matched) {
          matchCount++;
          return { word: w, status: "green" };
        } else if (cleanW.length > 3 && cleanW.split("").filter((c) => spokenLower.includes(c)).length > cleanW.length * 0.5) {
          matchCount += 0.5;
          mistakes.push({
            word: w,
            heard: "(partially heard)",
            issue: "Pronounced with slight accent or hesitation",
            suggestion: `Focus on the exact vowels and consonants of "${w}".`,
          });
          return { word: w, status: "yellow" };
        } else {
          mistakes.push({
            word: w,
            heard: "(omitted or unclear)",
            issue: "Word was not clearly recognized",
            suggestion: `Try enunciating "${w}" slowly and distinctly.`,
          });
          return { word: w, status: "red" };
        }
      });

      const calculatedScore = isAudioSilent
        ? 15
        : Math.max(20, Math.min(100, Math.round((matchCount / Math.max(1, targetWords.length)) * 100)));

      return {
        score: calculatedScore,
        accuracy: isAudioSilent ? "Unclear Audio" : calculatedScore >= 85 ? "Great" : calculatedScore >= 60 ? "Good" : "Needs Practice",
        words,
        mistakes,
        tip: isAudioSilent
          ? "No clear speech detected. Please speak closer to the mic and try again."
          : "Keep your jaw relaxed and articulate each syllable distinctly.",
        userTranscript: cleanTranscript || "(No speech detected)",
      };
    }
  });
};

export const translateText = async ({
  text,
  targetLanguage = "English",
}) => {
  if (!text || !text.trim()) return { translation: "" };
  const chosenTarget =
    !targetLanguage ||
    targetLanguage === "auto" ||
    targetLanguage.toLowerCase().includes("auto")
      ? "English"
      : targetLanguage;

  const candidateModels = [
    "groq/compound-mini",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "groq/compound",
    "qwen/qwen3.6-27b",
  ];

  return await executeWithGroqKeyFailover(async (groqClient) => {
    let completion = null;
    let modelErr = null;

    for (const modelName of candidateModels) {
      try {
        completion = await groqClient.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the text directly into ${chosenTarget}. Return ONLY the direct translated sentence in the authentic script of ${chosenTarget}. Do not include quotation marks, markdown, explanations, or notes.`,
            },
            {
              role: "user",
              content: text.trim(),
            },
          ],
          temperature: 0.1,
          max_tokens: 300,
        });
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err) {
        modelErr = err;
        completion = null;
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw modelErr || new Error("Translation failed.");
    }

    let translation = completion.choices[0].message.content;
    translation = translation.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
    translation = translation.replace(/^["'`\s]+|["'`\s]+$/g, "").trim();

    return { translation };
  });
};

const CURATED_PRACTICE_SENTENCES = {
  English: {
    beginner: "Good morning, how are you today?",
    intermediate: "Could you please tell me where the nearest station is?",
    advanced: "I would appreciate hearing your perspective on this development.",
  },
  Spanish: {
    beginner: "¿Hola, cómo estás el día de hoy?",
    intermediate: "¿Podría decirme dónde está la estación más cercana?",
    advanced: "Agradecería mucho conocer su perspectiva sobre este asunto.",
  },
  Hindi: {
    beginner: "नमस्ते, आप आज कैसे हैं?",
    intermediate: "क्या आप बता सकते हैं कि सबसे पास का स्टेशन कहाँ है?",
    advanced: "मैं इस विषय पर आपके विचार जानना चाहता हूँ।",
  },
  Telugu: {
    beginner: "నమస్కారం, మీరు ఈరోజు ఎలా ఉన్నారు?",
    intermediate: "దగ్గర్లోని స్టేషన్ ఎక్కడుందో దయచేసి చెప్పగలరా?",
    advanced: "ఈ విషయంపై మీ అభిప్రాయాన్ని తెలుసుకోవాలనుకుంటున్నాను.",
  },
  Tamil: {
    beginner: "வணக்கம், நீங்கள் இன்று எப்படி இருக்கிறீர்கள்?",
    intermediate: "அருகில் உள்ள ரயில் நிலையம் எங்குள்ளது என்று கூற முடியுமா?",
    advanced: "இந்த விஷயத்தில் உங்கள் கருத்தை அறிய விரும்புகிறேன்.",
  },
  Kannada: {
    beginner: "ನಮಸ್ಕಾರ, ನೀವು ಇಂದು ಹೇಗಿದ್ದೀರಿ?",
    intermediate: "ಹತ್ತಿರದ ರೈಲ್ವೆ ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ ಎಂದು ತಿಳಿಸಬಹುದೇ?",
    advanced: "ಈ ವಿಷಯದ ಕುರಿತು ನಿಮ್ಮ ಅಭಿಪ್ರಾಯವನ್ನು ತಿಳಿಯಲು ಬಯಸುತ್ತೇನೆ.",
  },
  Malayalam: {
    beginner: "നമസ്കാരം, സുഖമാണോ നിങ്ങൾക്ക്?",
    intermediate: "അടുത്തുള്ള റെയിൽവേ സ്റ്റേഷൻ എവിടെയാണെന്ന് പറയാമോ?",
    advanced: "ഈ വിഷയത്തിൽ നിങ്ങളുടെ അഭിപ്രായം അറിയാൻ ഞാൻ ആഗ്രഹിക്കുന്നു.",
  },
  Bengali: {
    beginner: "নমস্কার, আপনি আজ কেমন আছেন?",
    intermediate: "কাছের রেলওয়ে স্টেশন কোথায় দয়া করে বলতে পারেন?",
    advanced: "এই বিষয়ে আপনার মতামত জানতে পেরে আমি আনন্দিত হব।",
  },
  Marathi: {
    beginner: "नमस्कार, आज तुम्ही कसे आहात?",
    intermediate: "जवळचे रेल्वे स्टेशन कुठे आहे ते सांगू शकाल का?",
    advanced: "या विषयावर तुमचे मत जाणून घेण्यास मला आवडेल.",
  },
  Gujarati: {
    beginner: "નમસ્તે, આજે તમે કેમ છો?",
    intermediate: "નજીકનું રેલ્વે સ્ટેશન ક્યાં છે તે જણાવી શકશો?",
    advanced: "આ વિષય પર તમારા વિચારો જાણવા હું ઉત્સુક છું.",
  },
  Punjabi: {
    beginner: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?",
    intermediate: "ਕੀ ਤੁਸੀਂ ਦੱਸ ਸਕਦੇ ਹੋ ਕਿ ਨੇੜਲਾ ਸਟੇਸ਼ਨ ਕਿੱਥੇ ਹੈ?",
    advanced: "ਮੈਂ ਇਸ ਮਾਮਲੇ 'ਤੇ ਤੁਹਾਡੇ ਵਿਚਾਰ ਜਾਣਨਾ ਚਾਹੁੰਦਾ ਹਾਂ।",
  },
  Urdu: {
    beginner: "آداب، آپ آج کیسے ہیں؟",
    intermediate: "کیا آپ بتا سکتے ہیں کہ قریب ترین اسٹیشن کہاں ہے؟",
    advanced: "میں اس موضوع پر آپ کی رائے جاننا چاہتا ہوں۔",
  },
  French: {
    beginner: "Bonjour, comment allez-vous aujourd'hui ?",
    intermediate: "Pourriez-vous me dire où se trouve la gare la plus proche ?",
    advanced: "J'aimerais beaucoup avoir votre point de vue sur cette question.",
  },
  German: {
    beginner: "Guten Tag, wie geht es Ihnen heute?",
    intermediate: "Könnten Sie mir bitte sagen, wo der nächste Bahnhof ist?",
    advanced: "Ich würde gerne Ihre Sichtweise zu diesem Thema hören.",
  },
  Japanese: {
    beginner: "こんにちは、今日はいかがですか？",
    intermediate: "一番近い駅はどこか教えていただけますか？",
    advanced: "この件についてのご意見をお聞かせいただけますか？",
  },
  Italian: {
    beginner: "Buongiorno, come sta oggi?",
    intermediate: "Potrebbe dirmi dov'è la stazione ferroviaria più vicina?",
    advanced: "Apprezzerei molto conoscere la sua prospettiva su questo tema.",
  },
  Korean: {
    beginner: "안녕하세요, 오늘 어떻게 지내세요?",
    intermediate: "가장 가까운 기차역이 어디인지 알려주시겠어요?",
    advanced: "이 문제에 대한 귀하의 생각을 듣고 싶습니다.",
  },
  Chinese: {
    beginner: "你好，你今天怎么样？",
    intermediate: "请问最近的火车站怎么走？",
    advanced: "我很想听听您对这个问题的看法。",
  },
  Portuguese: {
    beginner: "Olá, como você está hoje?",
    intermediate: "Você poderia me dizer onde fica a estação mais próxima?",
    advanced: "Eu gostaria muito de saber a sua opinião sobre este assunto.",
  },
  Russian: {
    beginner: "Здравствуйте, как ваши дела сегодня?",
    intermediate: "Не могли бы вы подсказать, где ближайший вокзал?",
    advanced: "Я был бы признателен за ваше мнение по этому вопросу.",
  },
  Arabic: {
    beginner: "مرحبًا، كيف حالك اليوم؟",
    intermediate: "هل يمكنك إخباري بأقرب محطة قطار من هنا؟",
    advanced: "أود كثيرًا معرفة وجهة نظرك حول هذا الموضوع.",
  },
};

export const generatePracticeSentence = async ({
  learningLanguage = "Spanish",
  nativeLanguage = "English",
  difficulty = "beginner",
  previousSentences = [],
}) => {
  const chosenNative = (!nativeLanguage || nativeLanguage === "auto" || nativeLanguage.toLowerCase().includes("auto")) ? "English" : nativeLanguage;
  const isLatinScript = ["English", "Spanish", "French", "German", "Italian", "Portuguese"].includes(learningLanguage);

  const prompt = `You are a Language Pronunciation Coach.
Target Language to Practice: ${learningLanguage}
Learner's Native Language (for translation): ${chosenNative}
Difficulty Level: ${difficulty}
${previousSentences.length > 0 ? `Previously practiced (DO NOT REPEAT): ${previousSentences.slice(-5).join("; ")}` : ""}

Generate ONE natural, practical sentence strictly in ${learningLanguage} for a ${difficulty}-level learner to practice speaking out loud.
Focus exclusively on clean, everyday practical topics (greetings, food, travel, directions, shopping, work, daily routine, hobbies). DO NOT generate any dating, romantic, pickup lines, or flirtatious sentences.
Sentence length: 4 to 8 words.

Return ONLY a valid JSON object matching this schema (NO thinking, NO markdown outside JSON):
{
  "sentence": "<Clean sentence strictly in ${learningLanguage}>",
  "romanization": "${isLatinScript ? "" : "<English phonetic romanization for non-Latin script>"}",
  "meaning": "<Clear, natural translation in ${chosenNative}>",
  "difficulty": "${difficulty}",
  "category": "<greetings|food|directions|shopping|daily|travel>"
}`;

  const candidateModels = [
    "openai/gpt-oss-20b",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "groq/compound",
    "qwen/qwen3.6-27b",
  ];

  return await executeWithGroqKeyFailover(async (groqClient) => {
    let completion = null;
    let modelErr = null;

    for (const modelName of candidateModels) {
      try {
        completion = await groqClient.chat.completions.create({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: 800,
        });
        if (completion?.choices?.[0]?.message?.content) break;
      } catch (err) {
        modelErr = err;
        completion = null;
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw modelErr || new Error("Failed to generate practice sentence.");
    }

    let rawReply = completion.choices[0].message.content;
    rawReply = rawReply.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();

    let sentence = "";
    let romanization = "";
    let meaning = "";
    let category = "daily";

    // 1. Try standard JSON parse
    try {
      let cleanJson = rawReply.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      const firstBrace = cleanJson.indexOf("{");
      const lastBrace = cleanJson.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleanJson);
      if (parsed.sentence && typeof parsed.sentence === "string") {
        sentence = parsed.sentence.trim();
        romanization = parsed.romanization?.trim() || "";
        meaning = parsed.meaning?.trim() || "";
        category = parsed.category?.trim() || "daily";
      }
    } catch (parseErr) {
      // JSON parse failed or was incomplete, fallback to regex extraction
    }

    // 2. If sentence wasn't extracted, extract with regex (resilient against truncated JSON)
    if (!sentence) {
      const sentenceMatch =
        rawReply.match(/"sentence"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        rawReply.match(/"sentence"\s*:\s*"([^"\r\n]+)/i);
      if (sentenceMatch && sentenceMatch[1]) {
        sentence = sentenceMatch[1].replace(/\\"/g, '"').trim();
      }

      const meaningMatch =
        rawReply.match(/"meaning"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        rawReply.match(/"meaning"\s*:\s*"([^"\r\n]+)/i);
      if (meaningMatch && meaningMatch[1]) {
        meaning = meaningMatch[1].replace(/\\"/g, '"').trim();
      }

      const romMatch =
        rawReply.match(/"romanization"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
        rawReply.match(/"romanization"\s*:\s*"([^"\r\n]+)/i);
      if (romMatch && romMatch[1]) {
        romanization = romMatch[1].replace(/\\"/g, '"').trim();
      }
    }

    // 3. Clean any lingering JSON syntax or quotes from sentence
    if (sentence) {
      sentence = sentence
        .replace(/^[{"\s]+/, "")
        .replace(/["}\s]+$/, "")
        .replace(/^sentence["\s:]+/i, "")
        .trim();
    }

    // 4. Quality verification: if corrupted or empty, use curated sentence
    if (!sentence || sentence.length < 3 || sentence.includes('"sentence"') || sentence.includes('{')) {
      const cur = CURATED_PRACTICE_SENTENCES[learningLanguage] || CURATED_PRACTICE_SENTENCES.English;
      sentence = cur[difficulty] || cur.beginner;
      meaning = "";
      romanization = "";
    }

    // Never show romanization for Latin scripts (English, Spanish, etc.)
    if (isLatinScript) {
      romanization = "";
    }

    return {
      sentence,
      romanization,
      meaning,
      difficulty,
      category,
    };
  });
};

export const transcribeAudioWithGroq = async (audioBuffer, mimeType = "audio/webm", language = "") => {
  return await executeWithGroqKeyFailover(async (groqClient, apiKey) => {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "verbose_json");

    // Only specify language if explicitly given and not "auto"
    if (
      language &&
      typeof language === "string" &&
      language.trim() &&
      language.toLowerCase() !== "auto" &&
      !language.toLowerCase().includes("auto")
    ) {
      const shortLang = language.split("-")[0].toLowerCase().trim();
      formData.append("language", shortLang);
    }

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Whisper transcription failed (${res.status})`);
    }

    const data = await res.json();
    const text = data.text ? data.text.trim() : "";
    const detectedLang = data.language ? data.language.toLowerCase() : "";

    return {
      text,
      transcript: text,
      detectedLanguage: detectedLang,
    };
  });
};
