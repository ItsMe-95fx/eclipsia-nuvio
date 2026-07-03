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

function buildConfig(token) {
  return {
    source_acermovies: 'on',
    source_aniwaves: 'on',
    source_vaplayer: 'on',
    source_vidking: 'on',
    source_animesuge: 'on',
    source_aether: 'on',
    res_2160: 'on',
    res_1080: 'on',
    auth_token: token
  };
}

function buildVornixApi(token) {
  const config = buildConfig(token);
  const encoded = encodeURIComponent(JSON.stringify(config));
  const manifestUrl = `https://pengu.uk/${encoded}/manifest.json`;
  return manifestUrl.replace(/\/manifest\.json$/, '');
}

function fetchAuthToken() {
  return __async(this, null, function* () {
    try {
      const response = yield fetch('https://pengu.uk/auth/token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Token request failed with status ${response.status}`);
      }
      
      const payload = yield response.json();
      
      if (!payload.token) {
        throw new Error(payload.error || 'No token returned from server');
      }
      
      return payload.token;
    } catch (error) {
      throw error;
    }
  });
}

let VORNIX_API = '';

function initVornixApi() {
  return __async(this, null, function* () {
    const token = yield fetchAuthToken();
    VORNIX_API = buildVornixApi(token);
  });
}

initVornixApi().catch(console.error);

const TMDB_API_KEY = "6e6ab700b6477171ee6c23d504b1e9cb";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
};

const pad2 = (n) => String(Number.parseInt(n ?? 0, 10) || 0).padStart(2, "0");

const cleanText = (str) =>
  String(str ?? "")
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, "")
    .trim();

const extractLanguage = (cleanedTitle) => {
  const langMatch = String(cleanedTitle ?? "").match(/\(([^)]+)\)/);
  if (!langMatch) return "Default";
  const raw = langMatch[1].trim();
  return raw.toLowerCase() === ""
    ? "Default"
    : raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const isProxyUrl = (url) =>
  String(url ?? "").includes("workers.dev") || /[?&]url=/.test(String(url ?? ""));

function extractQuality(item) {
  const description = item?.description || '';
  const name = item?.title || item?.name || '';
  
  const combinedText = `${description}\n${name}`.toLowerCase();
  
  const parts = [];
  
  const resMatch = combinedText.match(/\b(\d{3,4})p\b/i);
  if (resMatch) {
    parts.push(`${resMatch[1]}p`);
  }
  
  const sourceTypes = ['web-dl', 'bluray', 'blu-ray', 'hdrrip', 'cam', 'ts', 'tc', 'webrip', 'hdtv'];
  for (const source of sourceTypes) {
    if (combinedText.includes(source)) {
      parts.push(source.toUpperCase());
      break;
    }
  }
  
  const codecs = [/h\.264/i, /x264/i, /avc/i, /h\.265/i, /x265/i, /hevc/i];
  for (const codec of codecs) {
    if (codec.test(combinedText)) {
      const match = combinedText.match(codec);
      if (match) {
        let codecStr = match[0];
        if (/h\.265|x265|hevc/i.test(codecStr)) {
          codecStr = 'H.265';
        } else if (/h\.264|x264|avc/i.test(codecStr)) {
          codecStr = 'H.264';
        }
        parts.push(codecStr.toUpperCase());
      }
      break;
    }
  }
  
  const audioMatches = combinedText.match(/(dd\+\s*\d+\.\d+|dolby\s*digital|aac|\s\d\.\d\s*ch|dts|truehd|atmos|flac|pcm)/gi);
  if (audioMatches && audioMatches[0]) {
    parts.push(audioMatches[0].trim().toUpperCase());
  }
  
  const containers = /\b(mkv|mp4|avi|mov|wmv|m4v)\b/i;
  const contMatch = combinedText.match(containers);
  if (contMatch) {
    parts.push(contMatch[1].toUpperCase());
  }
  
  const streamTypes = ['hls', 'dash', 'rtmp', 'http-stream', 'mss'];
  for (const stype of streamTypes) {
    if (combinedText.includes(stype)) {
      parts.push(stype.toUpperCase());
      break;
    }
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Unknown';
}

function getSourceName(item) {
  const filename = item?.behaviorHints?.filename || '';
  const name = item?.title || item?.name || '';
  const combined = `${filename}\n${name}`.toLowerCase();
  
  if (combined.includes('vadriver') || combined.includes('vaplayer')) return 'Theta';
  if (combined.includes('vidking')) return 'Alpha';
  if (combined.includes('acermovies')) return 'Phi';
  if (combined.includes('aniwaves')) return 'Varphi';
  if (combined.includes('animesuge')) return 'Zeta';
  if (combined.includes('aether')) return 'Rho';
  
  return null;
}

function isValidVidkingStream(item) {
  const filename = item?.behaviorHints?.filename || '';
  const isFromVidking = filename.toLowerCase().includes('vidking');
  
  if (!isFromVidking) {
    return true;
  }
  
  const referer = item?.behaviorHints?.proxyHeaders?.request?.Referer ||
                  item?.behaviorHints?.proxyHeaders?.request?.referer ||
                  '';
  const origin = item?.behaviorHints?.proxyHeaders?.request?.Origin ||
                 item?.behaviorHints?.proxyHeaders?.request?.origin ||
                 '';
  
  const lowerRef = referer.toLowerCase();
  const lowerOrig = origin.toLowerCase();
  
  return lowerRef.includes('player') || lowerOrig.includes('player');
}

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
  if (!url)
    return "video";
  const lower = String(url).toLowerCase().split("?")[0];
  return lower.includes(".m3u8") ? "m3u8" : "video";
};

function buildStream(item) {
  return __async(this, null, function* () {
    if (!item?.url || item.externalUrl) return null;
    if (String(item.url).includes("github.com")) return null;

    const cleanedTitle = cleanText(item.title || item.name || '');
    const quality = extractQuality(item);
    const language = extractLanguage(cleanedTitle);
    const providerName = getSourceName(item);

    const headers = {
      ...(item.behaviorHints?.proxyHeaders?.request ?? {}),
      ...(item.behaviorHints?.headers ?? {}),
    };

    const streamUrl = isProxyUrl(item.url)
      ? yield resolveProxyUrl(item.url)
      : item.url;

    if (!streamUrl) return null;

    const resolutionMatch = quality.match(/\b(\d{3,4})p\b/i);
    const resolution = resolutionMatch ? parseInt(resolutionMatch[1], 10) : 0;

    const nameParts = ["Vornix"];
    if (providerName) nameParts.push(providerName);
    
    const displayName = nameParts.join(' • ');

    return {
      name: displayName,
      title: quality,
      url: streamUrl,
      quality: quality,
      _resolution: resolution,
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      provider: "Vornix",
      _providerKey: providerName
    };
  });
}

function limitStreamsPerProvider(streams) {
  const grouped = {};
  
  for (const stream of streams) {
    const key = stream._providerKey || 'Unknown';
    if (!grouped[key]) {
      grouped[key] = {
        _2160: [],
        _1080: []
      };
    }
    
    if (stream._resolution >= 2000) {
      grouped[key]._2160.push(stream);
    } else if (stream._resolution >= 1000) {
      grouped[key]._1080.push(stream);
    } else {
      grouped[key]._1080.push(stream);
    }
  }
  
  const result = [];
  const sortedKeys = Object.keys(grouped).sort();
  
  for (const key of sortedKeys) {
    result.push(...grouped[key]._2160);
    result.push(...grouped[key]._1080.slice(0, 2));
  }
  
  return result;
}

function parseStreams(data) {
  return __async(this, null, function* () {
    if (!Array.isArray(data?.streams) || data.streams.length === 0) return [];

    const validItems = data.streams.filter((item) => {
      if (!isValidVidkingStream(item)) return false;
      
      const cleanedTitle = cleanText(item?.title || item?.name || '');
      if (!cleanedTitle.toLowerCase().includes("")) return false;
      if (typeof item?.url !== "string" || !item.url.startsWith("https")) return false;

      const innerMatch = item.url.match(/[?&]url=(https?:\/\/[^&]+)/);
      return !innerMatch || innerMatch[1].startsWith("https");
    });

    const streams = yield Promise.all(validItems.map(buildStream));
    const filteredStreams = streams.filter(Boolean);
    
    return limitStreamsPerProvider(filteredStreams);
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
        return yield fetchStreams(`${VORNIX_API}/stream/movie/${imdbId}.json`);
      }

      return yield fetchFirstValid([
        `${VORNIX_API}/stream/series/${imdbId}:${pad2(s)}:${pad2(e)}.json`,
        `${VORNIX_API}/stream/series/${imdbId}:${parseInt(s, 10) || 1}:${parseInt(e, 10) || 1}.json`,
      ]);
    } catch {
      return [];
    }
  });
}

module.exports = { getStreams };
