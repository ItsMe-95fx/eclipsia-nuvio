"use strict";

const __defProp = Object.defineProperty;
const __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

const TMDB_API_KEY = "6e6ab700b6477171ee6c23d504b1e9cb";
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const KARNIS_BASE = "https://api.hlowb.com"
const PKG = "com.external.castle";
const CHANNEL = "IndiaA";
const CLIENT = "1";
const LANG = "en-US";
const API_HEADERS = {
  "User-Agent": "okhttp/4.9.3",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "Keep-Alive",
  "Referer": KARNIS_BASE
};
const PLAYBACK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Connection": "keep-alive",
  "Sec-Fetch-Dest": "video",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
};
const RESOLUTIONS = [3, 2];
const QUALITY_MAP = { "3": 1080, "2": 720, "1": 480 };
const QUALITY_NAME_MAP = { "3": "1080p", "2": "720p", "1": "480p" };

function makeRequest(_0) {
  return __async(this, arguments, function*(url, options = {}) {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      throw new Error("Invalid URL: Only HTTPS is allowed");
    }
    
    const response = yield fetch(url, {
      method: options.method || "GET",
      headers: __spreadValues(__spreadValues({}, API_HEADERS), options.headers),
      body: options.body
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  });
}

function extractCipherFromResponse(response) {
  return __async(this, null, function*() {
    const text = yield response.text();
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Empty response");
    }
    try {
      const json = JSON.parse(trimmed);
      if (json && json.data && typeof json.data === "string") {
        return json.data.trim();
      }
    } catch (e) {
    }
    return trimmed;
  });
}

function extractDataBlock(obj) {
  if (obj && obj.data && typeof obj.data === "object") {
    return obj.data;
  }
  return obj || {};
}

function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function*() {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = yield makeRequest(url);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return {
      title,
      year,
      tmdbId
    };
  });
}

function decryptKarnis(encryptedB64, securityKeyB64) {
  return __async(this, null, function*() {
    let result = null;
    let tempKeyMaterial = null;
    let tempCiphertext = null;

    try {
      const CryptoJS = require("crypto-js");
      
      if (typeof __crypto_aes_decrypt_raw !== 'undefined') {
        const originalDecrypt = CryptoJS.AES.decrypt;
        CryptoJS.AES.decrypt = function(cipher, key, options) {
          try {
            const wordArrayToBytes = (wordArray) => {
              const bytes = new Uint8Array(wordArray.sigBytes);
              for (let i = 0; i < wordArray.sigBytes; i++) {
                bytes[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
              }
              return bytes;
            };
            
            const toUint8Array = (data) => {
              if (data instanceof Uint8Array) return data;
              if (data instanceof ArrayBuffer) return new Uint8Array(data);
              if (data && typeof data.length === 'number') return new Uint8Array(Array.prototype.slice.call(data));
              return new Uint8Array(0);
            };
            
            tempCiphertext = typeof cipher === 'string'
              ? new Uint8Array(Array.from(atob(cipher), c => c.charCodeAt(0)))
              : (cipher.ciphertext ? wordArrayToBytes(cipher.ciphertext) : toUint8Array(cipher));
              
            const kBytes = wordArrayToBytes(key);
            const ivBytes = (options && options.iv) ? wordArrayToBytes(options.iv) : new Uint8Array(0);
            
            const keyArg = typeof Int8Array !== 'undefined' ? new Int8Array(kBytes.buffer) : kBytes;
            const ivArg = typeof Int8Array !== 'undefined' ? new Int8Array(ivBytes.buffer) : ivBytes;
            const dataArg = typeof Int8Array !== 'undefined' ? new Int8Array(tempCiphertext.buffer) : tempCiphertext;
            
            const resBytes = __crypto_aes_decrypt_raw('AES-CBC', keyArg, ivArg, dataArg);
            const plain = new TextDecoder().decode(resBytes);
            return { toString: function() { return plain; } };
          } catch (err) {
            return originalDecrypt.call(CryptoJS.AES, cipher, key, options);
          }
        };
      }

      const KARNIS_SUFFIX = "T!BgJB";
      
      const securityKeyWords = CryptoJS.enc.Base64.parse(securityKeyB64);
      const suffixWords = CryptoJS.enc.Utf8.parse(KARNIS_SUFFIX);
      const keyMaterial = securityKeyWords.concat(suffixWords);
      
      let finalKey;
      if (keyMaterial.sigBytes < 16) {
        const padding = CryptoJS.lib.WordArray.create(new Array(16 - keyMaterial.sigBytes).fill(0));
        finalKey = keyMaterial.concat(padding);
      } else if (keyMaterial.sigBytes > 16) {
        finalKey = CryptoJS.lib.WordArray.create(keyMaterial.words.slice(0, 4), 16);
      } else {
        finalKey = keyMaterial;
      }
      
      const iv = finalKey;
      
      const decrypted = CryptoJS.AES.decrypt(encryptedB64, finalKey, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (!result) {
        throw new Error("Decryption resulted in empty string");
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  });
}

function getSecurityKey() {
  return __async(this, null, function*() {
    const url = `${KARNIS_BASE}/v0.1/system/getSecurityKey/1?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}`;
    const response = yield makeRequest(url);
    const data = yield response.json();
    if (data.code !== 200 || !data.data) {
      throw new Error(`Security key API error: ${JSON.stringify(data)}`);
    }
    return data.data;
  });
}

function searchKarnis(securityKey, keyword, page = 1, size = 30) {
  return __async(this, null, function*() {
    const params = new URLSearchParams({
      channel: CHANNEL,
      clientType: CLIENT,
      keyword,
      lang: LANG,
      mode: "1",
      packageName: PKG,
      page: page.toString(),
      size: size.toString()
    });
    const url = `${KARNIS_BASE}/film-api/v1.1.0/movie/searchByKeyword?${params.toString()}`;
    const response = yield makeRequest(url);
    const cipher = yield extractCipherFromResponse(response);
    const decrypted = yield decryptKarnis(cipher, securityKey);
    return JSON.parse(decrypted);
  });
}

function getDetails(securityKey, movieId) {
  return __async(this, null, function*() {
    const url = `${KARNIS_BASE}/film-api/v1.9.9/movie?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}&movieId=${movieId}&packageName=${PKG}`;
    const response = yield makeRequest(url);
    const cipher = yield extractCipherFromResponse(response);
    const decrypted = yield decryptKarnis(cipher, securityKey);
    return JSON.parse(decrypted);
  });
}

function getVideoV1(securityKey, movieId, episodeId, languageId, resolution = 2) {
  return __async(this, null, function*() {
    const url = `${KARNIS_BASE}/film-api/v2.0.1/movie/getVideo2?clientType=${CLIENT}&packageName=${PKG}&channel=${CHANNEL}&lang=${LANG}`;
    const body = {
      mode: "1",
      appMarket: "GuanWang",
      clientType: CLIENT,
      woolUser: "false",
      apkSignKey: "ED0955EB04E67A1D9F3505B95454FED485261475",
      androidVersion: "13",
      movieId: movieId.toString(),
      episodeId: episodeId.toString(),
      languageId: languageId.toString(),
      isNewUser: "true",
      resolution: resolution.toString(),
      packageName: PKG
    };
    const response = yield makeRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const cipher = yield extractCipherFromResponse(response);
    const decrypted = yield decryptKarnis(cipher, securityKey);
    return JSON.parse(decrypted);
  });
}

function getVideo2(securityKey, movieId, episodeId, resolution = 2) {
  return __async(this, null, function*() {
    const url = `${KARNIS_BASE}/film-api/v2.0.1/movie/getVideo2?clientType=${CLIENT}&packageName=${PKG}&channel=${CHANNEL}&lang=${LANG}`;
    const body = {
      mode: "1",
      appMarket: "GuanWang",
      clientType: CLIENT,
      woolUser: "false",
      apkSignKey: "ED0955EB04E67A1D9F3505B95454FED485261475",
      androidVersion: "13",
      movieId: movieId.toString(),
      episodeId: episodeId.toString(),
      isNewUser: "true",
      resolution: resolution.toString(),
      packageName: PKG
    };
    const response = yield makeRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const cipher = yield extractCipherFromResponse(response);
    const decrypted = yield decryptKarnis(cipher, securityKey);
    return JSON.parse(decrypted);
  });
}

function findKarnisMovieId(securityKey, tmdbInfo) {
  return __async(this, null, function*() {
    const searchTerm = tmdbInfo.year ? `${tmdbInfo.title} ${tmdbInfo.year}` : tmdbInfo.title;
    const searchResult = yield searchKarnis(securityKey, searchTerm);
    const data = extractDataBlock(searchResult);
    const rows = data.rows || [];
    if (rows.length === 0) {
      throw new Error("No search results found");
    }
    for (const item of rows) {
      const itemTitle = (item.title || item.name || "").toLowerCase();
      const searchTitle = tmdbInfo.title.toLowerCase();
      if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) {
        const movieId2 = item.id || item.redirectId || item.redirectIdStr;
        if (movieId2) {
          return movieId2.toString();
        }
      }
    }
    const firstItem = rows[0];
    const movieId = firstItem.id || firstItem.redirectId || firstItem.redirectIdStr;
    if (movieId) {
      return movieId.toString();
    }
    throw new Error("Could not extract movie ID from search results");
  });
}

function getQualityValue(quality) {
  if (!quality)
    return 0;
  const cleanQuality = quality.toString().toLowerCase().replace(/^(sd|hd|fhd|uhd|4k)\s*/i, "").replace(/p$/, "").trim();
  const qualityMap = {
    "4k": 2160,
    "2160": 2160,
    "1440": 1440,
    "1080": 1080,
    "720": 720,
    "480": 480,
    "360": 360,
    "240": 240
  };
  if (qualityMap[cleanQuality]) {
    return qualityMap[cleanQuality];
  }
  const numQuality = parseInt(cleanQuality);
  if (!isNaN(numQuality) && numQuality > 0) {
    return numQuality;
  }
  return 0;
}

function formatSize(sizeValue) {
  if (typeof sizeValue !== "number" || sizeValue <= 0) {
    return "Unknown";
  }
  if (sizeValue > 1e9) {
    return `${(sizeValue / 1e9).toFixed(2)} GB`;
  }
  return `${(sizeValue / 1e6).toFixed(0)} MB`;
}

function resolutionToQuality(resolution) {
  return QUALITY_NAME_MAP[String(resolution)] || `${resolution}p`;
}

function buildStreamName(mediaInfo, languageInfo, quality, isPreview) {
  let name = "Karnis.";
  if (languageInfo) name += ` • ${languageInfo}`;
  if (isPreview) name += " (preview)";
  return name;
}

function processVideoResponse(videoData, mediaInfo, seasonNum, episodeNum, resolution, languageInfo) {
  const streams = [];
  const data = extractDataBlock(videoData);
  const videoUrl = data.videoUrl;
  if (!videoUrl) {
    return streams;
  }
  
  const subtitles = [];
  if (data.subtitles && Array.isArray(data.subtitles)) {
    for (const sub of data.subtitles) {
      if (sub.url) {
        subtitles.push({
          url: sub.url,
          language: sub.abbreviate || "Unknown",
          name: sub.title || sub.abbreviate || "Unknown",
          headers: PLAYBACK_HEADERS
        });
      }
    }
  }
  let mediaTitle = mediaInfo.title || "Unknown";
  if (mediaInfo.year) {
    mediaTitle += ` (${mediaInfo.year})`;
  }
  if (seasonNum && episodeNum) {
    mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
  }

  const quality = resolutionToQuality(resolution);
  if (data.videos && Array.isArray(data.videos)) {
    for (const video of data.videos) {
      let videoQuality = video.resolutionDescription || video.resolution || quality;
      videoQuality = videoQuality.replace(/^(SD|HD|FHD)\s+/i, "");
      if (getQualityValue(videoQuality) < 720) continue;
      const isPreview = /preview/i.test(video.url || videoUrl);
      const streamName = buildStreamName(mediaInfo, languageInfo, videoQuality, isPreview);
      streams.push({
        name: streamName,
        title: mediaTitle,
        url: video.url || videoUrl,
        quality: videoQuality,
        size: formatSize(video.size),
        headers: PLAYBACK_HEADERS,
        provider: "karnis",
        subtitles
      });
    }
  } else {
    const isPreview = /preview/i.test(videoUrl);
    const streamName = buildStreamName(mediaInfo, languageInfo, quality, isPreview);
    streams.push({
      name: streamName,
      title: mediaTitle,
      url: videoUrl,
      quality,
      size: formatSize(data.size),
      headers: PLAYBACK_HEADERS,
      provider: "karnis",
      subtitles
    });
  }
  return streams;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function*() {
    try {
      const tmdbInfo = yield getTMDBDetails(tmdbId, mediaType);
      const securityKey = yield getSecurityKey();
      const rootMovieId = yield findKarnisMovieId(securityKey, tmdbInfo);
      let currentMovieId = rootMovieId;
      if (mediaType === "tv" && seasonNum) {
        const rootDetails = yield getDetails(securityKey, rootMovieId);
        const rootData = extractDataBlock(rootDetails);
        const seasons = rootData.seasons || [];
        if (seasons.length > 1) {
          const season = seasons.find((s) => s.number === seasonNum);
          if (season && season.movieId && season.movieId.toString() !== rootMovieId) {
            currentMovieId = season.movieId.toString();
          }
        }
      }
      const details = yield getDetails(securityKey, currentMovieId);
      const detailsData = extractDataBlock(details);
      const episodes = detailsData.episodes || [];
      let episodeId = null;
      let episode = null;

      if (mediaType === "tv" && episodeNum) {
        episode = episodes.find((e) => e.number === episodeNum) || null;
      } else {
        episode = episodes.length > 0 ? episodes[0] : null;
      }

      if (!episode || !episode.id) {
        throw new Error("Could not find episode");
      }
      episodeId = episode.id.toString();
      const ALLOWED_LANGS = ["english", "hindi", "bangla", "bengali"];

      function isAllowed(name) {
        if (!name) return false;
        const n = name.toLowerCase();
        return ALLOWED_LANGS.some((l) => n.includes(l));
      }

      const allTracks = episode.tracks || [];
      const tracks = allTracks.filter((t) => isAllowed(t.languageName || t.abbreviate));
      const allStreams = [];
      const videoLoaded = { value: false };
      const hasIndividualVideo = tracks.some((t) => t && t.existIndividualVideo === true);

      if (!hasIndividualVideo) {
        const allLanguageNames = null;

        for (const resolution of RESOLUTIONS) {
          try {
            const videoData = yield getVideo2(securityKey, currentMovieId, episodeId, resolution);
            const streams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, allLanguageNames);
            if (streams.length > 0) {
              allStreams.push(...streams);
              videoLoaded.value = true;
            }
          } catch (error) {
          }
        }
      } else {
        for (const track of tracks) {
          if (!track || track.languageId == null) continue;
          const langName = track.languageName || track.abbreviate || "Unknown";

          for (const resolution of RESOLUTIONS) {
            try {
              const videoData = yield getVideoV1(securityKey, currentMovieId, episodeId, track.languageId, resolution);
              const streams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, langName);
              if (streams.length > 0) {
                allStreams.push(...streams);
                videoLoaded.value = true;
              }
            } catch (error) {
            }
          }
        }
      }
      if (!videoLoaded.value) {
        const fallbackNames = null;
        for (const resolution of RESOLUTIONS) {
          try {
            const videoData = yield getVideo2(securityKey, currentMovieId, episodeId, resolution);
            const streams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, fallbackNames);
            if (streams.length > 0) allStreams.push(...streams);
          } catch (error) {
          }
        }
      }

      allStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));
      return allStreams;
    } catch (error) {
      return [];
    }
  });
}

module.exports = { getStreams };
