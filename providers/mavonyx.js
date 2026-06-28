"use strict";

const __create = Object.create;
const __defProp = Object.defineProperty;
const __defProps = Object.defineProperties;
const __getOwnPropDesc = Object.getOwnPropertyDescriptor;
const __getOwnPropDescs = Object.getOwnPropertyDescriptors;
const __getOwnPropNames = Object.getOwnPropertyNames;
const __getOwnPropSymbols = Object.getOwnPropertySymbols;
const __getProtoOf = Object.getPrototypeOf;
const __hasOwnProp = Object.prototype.hasOwnProperty;
const __propIsEnum = Object.prototype.propertyIsEnumerable;
const __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
const __spreadValues = (a, b) => {
  for (const prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (const prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
const __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
const __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    const fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    const rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    const step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

const API_BASE = "https://api3.aoneroom.com";
const KEY_B64_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const KEY_B64_ALT = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ==";
const TMDB_API_KEY = "6e6ab700b6477171ee6c23d504b1e9cb";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const BRAND_MODELS = {
  "Samsung": ["SM-S918B", "SM-A528B", "SM-M336B"],
  "Xiaomi": ["2201117TI", "M2012K11AI", "Redmi Note 11"],
  "OnePlus": ["LE2111", "CPH2449", "IN2023"],
  "Google": ["Pixel 6", "Pixel 7", "Pixel 8"],
  "Realme": ["RMX3085", "RMX3360", "RMX3551"]
};
const PACKAGE_INFO = {
  package_name: "com.community.mbox.in",
  version_name: "3.0.03.0529.03",
  version_code: 50020042
};

function ensureHttps(url) {
  if (typeof url !== "string") {
    return null;
  }
  if (url.startsWith("http://")) {
    return url.replace("http://", "https://");
  }
  if (!url.startsWith("https://")) {
    return null;
  }
  return url;
}

const import_crypto_js = __toESM(require("crypto-js"));
const SECRET_KEY_DEFAULT = import_crypto_js.default.enc.Base64.parse(
  import_crypto_js.default.enc.Base64.parse(KEY_B64_DEFAULT).toString(import_crypto_js.default.enc.Utf8)
);
const SECRET_KEY_ALT = import_crypto_js.default.enc.Base64.parse(
  import_crypto_js.default.enc.Base64.parse(KEY_B64_ALT).toString(import_crypto_js.default.enc.Utf8)
);
let deviceId = "";
let selectedBrand = "";
let selectedModel = "";
let bearerToken = null;

function decodeJwtExpiry(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2)
      return 0;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const parsed = import_crypto_js.default.enc.Base64.parse(base64).toString(import_crypto_js.default.enc.Utf8);
    const json = JSON.parse(parsed);
    return json.exp || 0;
  } catch (e) {
    return 0;
  }
}

function isTokenValid(token) {
  if (!token)
    return false;
  const exp = decodeJwtExpiry(token);
  return exp > Date.now() / 1e3 + 3600;
}

function getCachedToken() {
  return __async(this, null, function* () {
    if (isTokenValid(bearerToken))
      return bearerToken;
    const url = `${API_BASE}/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1`;
    const res = yield mavonyxRequest("GET", url, null, {}, true);
    if (res && res.headers) {
      const xUser = res.headers.get("x-user");
      if (xUser) {
        try {
          const xUserJson = JSON.parse(xUser);
          const token = xUserJson.token;
          if (token && isTokenValid(token)) {
            bearerToken = token;
            return token;
          }
        } catch (e) {
        }
      }
    }
    return bearerToken || "";
  });
}

function initializeSession() {
  if (!deviceId) {
    const chars = "0123456789abcdef";
    for (let i = 0; i < 32; i++) {
      deviceId += chars[Math.floor(Math.random() * 16)];
    }
    const brands = Object.keys(BRAND_MODELS);
    selectedBrand = brands[Math.floor(Math.random() * brands.length)];
    const models = BRAND_MODELS[selectedBrand];
    selectedModel = models[Math.floor(Math.random() * models.length)];
  }
}

function md5(input) {
  return import_crypto_js.default.MD5(input).toString(import_crypto_js.default.enc.Hex);
}

function hmacMd5(key, data) {
  return import_crypto_js.default.HmacMD5(data, key).toString(import_crypto_js.default.enc.Base64);
}

function generateXClientToken(timestamp) {
  const ts = (timestamp || Date.now()).toString();
  const reversed = ts.split("").reverse().join("");
  const hash = md5(reversed);
  return `${ts},${hash}`;
}

function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
  let path = "";
  let query = "";
  try {
    const urlObj = new URL(url);
    path = urlObj.pathname;
    const params = Array.from(urlObj.searchParams.keys()).sort();
    if (params.length > 0) {
      query = params.map((key) => {
        const values = urlObj.searchParams.getAll(key);
        return values.map((val) => `${key}=${val}`).join("&");
      }).join("&");
    }
  } catch (e) {
    if (url.includes("?")) {
      const parts = url.split("?");
      path = parts[0].replace(/https?:\/\/[^\/]+/, "");
      const qParts = parts[1].split("&").sort();
      query = qParts.join("&");
    } else {
      path = url.replace(/https?:\/\/[^\/]+/, "");
    }
  }
  const canonicalUrl = query ? `${path}?${query}` : path;
  let bodyHash = "";
  let bodyLength = "";
  if (body) {
    const bodyWords = import_crypto_js.default.enc.Utf8.parse(body);
    const totalBytes = bodyWords.sigBytes;
    bodyHash = md5(bodyWords);
    bodyLength = totalBytes.toString();
  }
  return `${method.toUpperCase()}\n${accept || ""}\n${contentType || ""}\n${bodyLength}\n${timestamp}\n${bodyHash}\n` + canonicalUrl;
}

function generateXTrSignature(method, accept, contentType, url, body, useAltKey = false, customTimestamp = null) {
  const timestamp = customTimestamp || Date.now();
  const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
  const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
  const signatureB64 = hmacMd5(secret, canonical);
  return `${timestamp}|2|${signatureB64}`;
}

function mavonyxRequest(_0, _1) {
  return __async(this, arguments, function* (method, url, body = null, customHeaders = {}, isTokenFetch = false) {
    initializeSession();
    const validatedUrl = ensureHttps(url);
    if (!validatedUrl) {
      return null;
    }
    const timestamp = Date.now();
    const xClientToken = generateXClientToken(timestamp);
    const headerContentType = customHeaders["Content-Type"] || (body ? "application/json; charset=utf-8" : "application/json");
    const accept = customHeaders["Accept"] || "application/json";
    const xTrSignature = generateXTrSignature(method, accept, headerContentType, validatedUrl, body, false, timestamp);
    const xClientInfo = JSON.stringify(__spreadProps(__spreadValues({}, PACKAGE_INFO), {
      os: "android",
      os_version: "16",
      device_id: deviceId,
      install_store: "ps",
      gaid: "d7578036d13336cc",
      brand: selectedBrand.toLowerCase(),
      model: selectedModel,
      system_language: "en",
      net: "NETWORK_WIFI",
      region: "IN",
      timezone: "Asia/Calcutta",
      sp_code: ""
    }));
    const headers = __spreadValues({
      "Accept": accept,
      "Content-Type": headerContentType,
      "x-client-token": xClientToken,
      "x-tr-signature": xTrSignature,
      "User-Agent": `${PACKAGE_INFO.package_name}/${PACKAGE_INFO.version_code} (Linux; U; Android 16; en_IN; ${selectedModel}; Build/BP22.250325.006; Cronet/133.0.6876.3)`,
      "x-client-info": xClientInfo,
      "x-client-status": "0"
    }, customHeaders);
    if (!isTokenFetch) {
      const token = yield getCachedToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    const options = {
      method,
      headers
    };
    if (body) {
      options.body = body;
    }
    let retries = 2;
    while (retries > 0) {
      try {
        const res = yield fetch(validatedUrl, options);
        if (!res.ok) {
          if (res.status === 403 || res.status === 429) {
            retries--;
            yield new Promise((resolve) => setTimeout(resolve, 1e3));
            continue;
          }
          return null;
        }
        const text = yield res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = text;
        }
        if (res.headers) {
          const xUser = res.headers.get("x-user");
          if (xUser) {
            try {
              const xUserJson = JSON.parse(xUser);
              const token = xUserJson.token;
              if (token && isTokenValid(token)) {
                bearerToken = token;
              }
            } catch (e) {
            }
          }
        }
        return {
          data: parsed,
          headers: res.headers
        };
      } catch (err) {
        retries--;
        if (retries === 0) {
          return null;
        }
        yield new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    return null;
  });
}

function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield fetch(ensureHttps(url), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Connection": "keep-alive"
        }
      });
      const data = yield res.json();
      return {
        title: mediaType === "movie" ? data.title || data.original_title : data.name || data.original_name,
        year: (data.release_date || data.first_air_date || "").substring(0, 4),
        imdbId: data.external_ids ? data.external_ids.imdb_id : null,
        originalTitle: data.original_title || data.original_name
      };
    } catch (e) {
      return null;
    }
  });
}

function normalizeTitle(s) {
  if (!s)
    return "";
  return s.replace(/\[.*?\]/g, " ").replace(/\(.*?|\)/g, " ").replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, " ").trim().toLowerCase().replace(/:/g, " ").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ");
}

function parseQualityNumber(value) {
  const match = String(value || "").match(/(\d{3,4})/);
  return match ? parseInt(match[1], 10) : 0;
}

function getFormatType(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes(".mpd"))
    return "DASH";
  if (u.includes(".m3u8"))
    return "HLS";
  if (u.includes(".mp4"))
    return "MP4";
  if (u.includes(".mkv"))
    return "MKV";
  return "VIDEO";
}

function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  return __async(this, null, function* () {
    const details = yield fetchTmdbDetails(tmdbId, mediaType);
    if (!details)
      return [];
    let subjects = yield searchMavonyx(details.title);
    let bestMatch = findBestMatch(subjects, details.title, details.year, mediaType);
    if (!bestMatch && details.originalTitle && details.originalTitle !== details.title) {
      subjects = yield searchMavonyx(details.originalTitle);
      bestMatch = findBestMatch(subjects, details.originalTitle, details.year, mediaType);
    }
    if (bestMatch) {
      const s = mediaType === "tv" ? seasonNum : 0;
      const e = mediaType === "tv" ? episodeNum : 0;
      const rawServerTitle = bestMatch.title;
      return yield getStreamLinks(bestMatch.subjectId, s, e, rawServerTitle, mediaType);
    }
    return [];
  });
}

function searchMavonyx(query) {
  return __async(this, null, function* () {
    const url = `${API_BASE}/wefeed-mobile-bff/subject-api/search/v2`;
    const body = JSON.stringify({ page: 1, perPage: 20, keyword: query });
    const response = yield mavonyxRequest("POST", url, body);
    if (response && response.data && response.data.data && response.data.data.results) {
      let allSubjects = [];
      response.data.data.results.forEach((group) => {
        if (group.subjects) {
          allSubjects = allSubjects.concat(group.subjects);
        }
      });
      return allSubjects;
    }
    return [];
  });
}

function findBestMatch(subjects, tmdbTitle, tmdbYear, mediaType) {
  const normTmdbTitle = normalizeTitle(tmdbTitle);
  const targetType = mediaType === "movie" ? 1 : 2;
  let bestMatch = null;
  let bestScore = 0;
  for (const subject of subjects) {
    if (subject.subjectType !== targetType)
      continue;
    const title = subject.title;
    const normTitle = normalizeTitle(title);
    const year = subject.year || (subject.releaseDate ? subject.releaseDate.substring(0, 4) : null);
    let score = 0;
    if (normTitle === normTmdbTitle)
      score += 50;
    else if (normTitle.includes(normTmdbTitle) || normTmdbTitle.includes(normTitle))
      score += 15;
    if (tmdbYear && year && tmdbYear == year)
      score += 35;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = subject;
    }
  }
  if (bestScore >= 40)
    return bestMatch;
  return null;
}

function getStreamLinks(subjectId, season = 0, episode = 0, mediaTitle = "", mediaType = "movie") {
  return __async(this, null, function* () {
    const subjectUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get?subjectId=${subjectId}`;
    const detailRes = yield mavonyxRequest("GET", subjectUrl);
    if (!detailRes || !detailRes.data || !detailRes.data.data)
      return [];

    const subjectIds = [];
    let originalLang = "Original";
    const dubs = detailRes.data.data.dubs;
    if (Array.isArray(dubs)) {
      dubs.forEach((dub) => {
        if (dub.subjectId == subjectId) {
          originalLang = dub.lanName || "Original";
        } else {
          subjectIds.push({ id: dub.subjectId, lang: dub.lanName });
        }
      });
    }
    subjectIds.unshift({ id: subjectId, lang: originalLang });

    const allowedLangs = ["bengali", "original", "english", "hindi"];
    const filteredSubjectIds = subjectIds.filter((item) => {
      const lang = String(item.lang || "").toLowerCase();
      return allowedLangs.some((allowed) => lang.includes(allowed));
    });

    let allStreams = [];
    for (const item of filteredSubjectIds) {
      try {
        const playUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId=${item.id}&se=${season}&ep=${episode}`;
        const playRes = yield mavonyxRequest("GET", playUrl, null);
        if (playRes && playRes.data && playRes.data.data) {
          const playData = playRes.data.data;
          const streamsList = playData.streams;
          if (Array.isArray(streamsList) && streamsList.length > 0) {
            for (const stream of streamsList) {
              if (!stream.url)
                continue;
              
              const secureUrl = ensureHttps(stream.url);
              if (!secureUrl)
                continue;

              const formatType = getFormatType(secureUrl);
              const qualLabel = stream.resolutions || stream.quality || "Auto";
              const qualNumMain = parseQualityNumber(qualLabel);

              if (qualNumMain < 1080)
                continue;

              const quality = qualNumMain ? `${qualNumMain}p` : "Auto";
              const streamId = stream.id || `${item.id}|${season}|${episode}`;
              const subtitles = yield fetchSubtitles(item.id, streamId, item.lang);

              const streamTitle = `Mavonyx. • ${item.lang} • ${formatType}`;

              allStreams.push({
                name: streamTitle,
                title: streamTitle,
                url: secureUrl,
                quality,
                qualityNum: qualNumMain,
                headers: __spreadValues({
                  "Referer": API_BASE,
                  "User-Agent": `com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; MovieBox; Build/BP22.250325.006; Cronet/133.0.6876.3)`
                }, stream.signCookie ? { "Cookie": stream.signCookie } : {}),
                subtitles,
                provider: "moviebox"
              });
            }
          } else if (Array.isArray(playData.resourceDetectors)) {
            for (const detector of playData.resourceDetectors) {
              if (Array.isArray(detector.resolutionList)) {
                for (const video of detector.resolutionList) {
                  if (!video.resourceLink)
                    continue;

                  const secureUrl = ensureHttps(video.resourceLink);
                  if (!secureUrl)
                    continue;

                  const qualNumVideo = parseQualityNumber(video.resolution);

                  if (qualNumVideo < 1080)
                    continue;

                  const quality = qualNumVideo ? `${qualNumVideo}p` : "Auto";
                  const formatType = getFormatType(secureUrl);
                  const fallbackTitle = `Mavonyx. • ${item.lang} • ${formatType}`;

                  allStreams.push({
                    name: fallbackTitle,
                    title: fallbackTitle,
                    url: secureUrl,
                    quality,
                    qualityNum: qualNumVideo,
                    headers: {
                      "Referer": API_BASE,
                      "User-Agent": `com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; MovieBox; Build/BP22.250325.006; Cronet/133.0.6876.3)`
                    },
                    provider: "moviebox"
                  });
                }
              }
            }
          }
        }
      } catch (err) {
      }
    }

    allStreams.sort((a, b) => b.qualityNum - a.qualityNum);

    allStreams = allStreams.map(({ qualityNum, ...rest }) => rest);

    return allStreams;
  });
}

function fetchSubtitles(subjectId, streamId, langLabel) {
  return __async(this, null, function* () {
    const subtitles = [];
    try {
      const streamCapUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId=${subjectId}&streamId=${streamId}`;
      const capRes = yield mavonyxRequest("GET", streamCapUrl, null);
      if (capRes && capRes.data && capRes.data.data && Array.isArray(capRes.data.data.extCaptions)) {
        capRes.data.data.extCaptions.forEach((cap) => {
          if (cap.url) {
            const secureUrl = ensureHttps(cap.url);
            if (!secureUrl)
              return;
            subtitles.push({
              url: secureUrl,
              language: cap.language || cap.lanName || cap.lan || "en",
              name: `${cap.lanName || cap.language || "Subtitle"} (${langLabel})`,
              headers: { "Referer": API_BASE }
            });
          }
        });
      }
    } catch (e) {
    }
    try {
      const extCapUrl = `${API_BASE}/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId=${subjectId}&resourceId=${streamId}&episode=0`;
      const extRes = yield mavonyxRequest("GET", extCapUrl, null);
      if (extRes && extRes.data && extRes.data.data && Array.isArray(extRes.data.data.extCaptions)) {
        extRes.data.data.extCaptions.forEach((cap) => {
          if (cap.url) {
            const secureUrl = ensureHttps(cap.url);
            if (!secureUrl)
              return;
            subtitles.push({
              url: secureUrl,
              language: cap.lan || cap.lanName || cap.language || "en",
              name: `${cap.lanName || cap.lan || "Subtitle"} (${langLabel})`,
              headers: { "Referer": API_BASE }
            });
          }
        });
      }
    } catch (e) {
    }
    return subtitles;
  });
}

module.exports = { getStreams };
