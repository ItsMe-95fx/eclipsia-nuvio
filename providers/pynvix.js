"use strict";

const __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    const fulfilled = (value) => {
      try { step(generator.next(value)); } catch (e) { reject(e); }
    };
    const rejected = (value) => {
      try { step(generator.throw(value)); } catch (e) { reject(e); }
    };
    const step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

const PYNVIX_API = "https://moviebox-cfa7.onrender.com";
const TMDB_API_KEY = "6e6ab700b6477171ee6c23d504b1e9cb";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
};

const pad2 = (n) => String(Number.parseInt(n ?? 0, 10) || 0).padStart(2, "0");

const cleanText = (str) =>
  String(str ?? "")
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, "")
    .trim();

const ALLOWED_LANGS = ["hindi", "original", "angla", "anglais", "english", "bengali", "bangla"];

const isValidLanguage = (lang) => {
  if (lang === "Default") return true;
  return ALLOWED_LANGS.includes(lang.toLowerCase());
};

const isBengali = (lang) => {
  const l = lang.toLowerCase();
  return l === "bengali" || l === "bangla";
};

const normalizeQuality = (raw) => {
  const q = raw?.toLowerCase();
  if (!q) return null;
  if (q === "2160p") return "4K";
  return q;
};

const isValidQuality = (quality, language) => {
  const q = quality?.toLowerCase();
  if (!q) return false;
  if (q === "1080p" || q === "4k" || q === "2160p") return true;
  if (q === "720p") return isBengali(language);
  return false;
};

const extractQuality = (text) => {
  const match = String(text ?? "").match(/(\d{3,4}p|4k|2160p)/i);
  return match?.[0] ?? null;
};

const extractLanguage = (cleanedTitle) => {
  const t = String(cleanedTitle ?? "");
  const m = t.match(/Audio:\s*([^⸱|\u2E31·\n]+)/i);
  if (m && m[1]) {
    const lang = m[1].trim();
    return lang === "" ? "Default" : lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
  }
  return "Default";
};

const isProxyUrl = (url) =>
  String(url ?? "").includes("workers.dev") || /[?&]url=/.test(String(url ?? ""));

function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
      const response = yield fetch(url);
      if (!response.ok) return null;
      const data = yield response.json();
      return data?.external_ids?.imdb_id ?? null;
    } catch {
      return null;
    }
  });
}

function resolveProxyUrl(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, {
        redirect: "follow",
        headers: { ...HEADERS, "Referer": url },
      });
      const finalUrl = response.url;
      if ([".m3u8", ".mp4", ".mkv"].some((ext) => finalUrl.includes(ext))) {
        return finalUrl;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("text/plain")) {
        const text = yield response.text();
        return text.trim() || null;
      }
      if (contentType.includes("application/json")) {
        const data = yield response.json();
        return data?.url ?? data?.stream ?? data?.src ?? null;
      }
      return finalUrl || null;
    } catch {
      return null;
    }
  });
}

const detectStreamType = (url) => {
  if (!url) return "video";
  const lower = String(url).toLowerCase().split("?")[0];
  return lower.includes(".m3u8") ? "m3u8" : "video";
};

function buildStream(item) {
  return __async(this, null, function* () {
    if (!item?.url || item.externalUrl) return null;
    if (String(item.url).includes("github.com")) return null;

    const combinedText = cleanText(`${item.name ?? ""} ${item.title ?? ""}`);
    const rawQuality = extractQuality(combinedText);

    const cleanedTitle = cleanText(item.title ?? "");
    const language = extractLanguage(cleanedTitle);

    if (!isValidLanguage(language)) return null;
    if (!isValidQuality(rawQuality, language)) return null;

    const quality = normalizeQuality(rawQuality);

    const headers = {
      ...(item.behaviorHints?.proxyHeaders?.request ?? {}),
      ...(item.behaviorHints?.headers ?? {}),
    };

    const streamUrl = isProxyUrl(item.url)
      ? yield resolveProxyUrl(item.url)
      : item.url;

    if (!streamUrl) return null;

    const langDisplay = language === "Default" ? "" : language;

    return {
      name: "Pynvix." + (langDisplay ? ` • ${langDisplay}` : ""),
      title: quality,
      url: streamUrl,
      quality,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      provider: "Pynvix.",
    };
  });
}

function parseStreams(data) {
  return __async(this, null, function* () {
    if (!Array.isArray(data?.streams) || data.streams.length === 0) return [];

    const validItems = data.streams.filter((item) => {
      if (typeof item?.url !== "string" || !item.url.startsWith("https")) return false;
      const innerMatch = item.url.match(/[?&]url=(https?:\/\/[^&]+)/);
      return !innerMatch || innerMatch[1].startsWith("https");
    });

    const streams = yield Promise.all(validItems.map(buildStream));
    return streams.filter(Boolean);
  });
}

function fetchStreams(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url);
      if (!response.ok) return [];
      const data = yield response.json();
      return yield parseStreams(data);
    } catch {
      return [];
    }
  });
}

function fetchFirstValid(urls) {
  return __async(this, null, function* () {
    for (const url of urls) {
      const streams = yield fetchStreams(url);
      if (streams.length > 0) return streams;
    }
    return [];
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isSeries = mediaType === "tv" || season != null || episode != null;
    const s = season ?? 1;
    const e = episode ?? 1;

    try {
      const imdbId = yield getImdbId(tmdbId, isSeries ? "tv" : "movie");
      if (!imdbId) return [];

      if (!isSeries) {
        return yield fetchStreams(`${PYNVIX_API}/stream/movie/${imdbId}.json`);
      }

      return yield fetchFirstValid([
        `${PYNVIX_API}/stream/series/${imdbId}:${pad2(s)}:${pad2(e)}.json`,
        `${PYNVIX_API}/stream/series/${imdbId}:${parseInt(s, 10) || 1}:${parseInt(e, 10) || 1}.json`,
      ]);
    } catch {
      return [];
    }
  });
}

module.exports = { getStreams };
