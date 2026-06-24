"use strict";

const TMDB_API_KEY = "6e6ab700b6477171ee6c23d504b1e9cb";
const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";
const VIDLINK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  "Connection": "keep-alive",
  "Referer": "https://vidlink.pro/",
  "Origin": "https://vidlink.pro"
};

const QUALITY_ORDER = {
  "4K": 5,
  "1440p": 4,
  "1080p": 3,
  "720p": 2,
  "Auto": -2
};

const ALLOWED_QUALITIES = ["4K", "1440p", "1080p", "720p", "Auto"];

function pad2(n) {
  return String(parseInt(n, 10)).padStart(2, "0");
}

function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY;
  return fetch(url)
    .then(function(response) {
      if (!response.ok) return null;
      return response.json();
    })
    .then(function(data) {
      if (!data) return null;
      const title = mediaType === "tv" ? data.name : data.title;
      const dateStr = mediaType === "tv" ? data.first_air_date : data.release_date;
      const year = dateStr ? dateStr.substring(0, 4) : null;
      if (!title) return null;
      return { title: title, year: year };
    })
    .catch(function() { return null; });
}

function encryptTmdbId(tmdbId) {
  return fetch(ENC_DEC_API + "/enc-vidlink?text=" + tmdbId)
    .then(function(response) {
      if (!response.ok) return null;
      return response.json();
    })
    .then(function(data) {
      if (data && data.result) return data.result;
      return null;
    })
    .catch(function() { return null; });
}

function extractQuality(str) {
  if (!str) return null;
  let s = str.toString().toLowerCase();
  if (s.includes("2160") || s.includes("4k")) return "4K";
  if (s.includes("1440") || s.includes("2k")) return "1440p";
  if (s.includes("1080") || s.includes("fhd")) return "1080p";
  if (s.includes("720") || s.includes("hd")) return "720p";
  if (s.includes("480") || s.includes("sd")) return "480p";
  if (s.includes("360")) return "360p";
  if (s.includes("240")) return "240p";
  const match = s.match(/(\d{3,4})[p]?/);
  if (match) {
    const h = parseInt(match[1]);
    if (h >= 2160) return "4K";
    if (h >= 1440) return "1440p";
    if (h >= 1080) return "1080p";
    if (h >= 720) return "720p";
    if (h >= 480) return "480p";
    if (h >= 360) return "360p";
    return "240p";
  }
  return null;
}

function resolveUrl(url, baseUrl) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch (e) {
    return url;
  }
}

function createStreamTitle(title, year, mediaType, season, episode) {
  if (mediaType === "tv" && season && episode) {
    return title + " S" + pad2(season) + "E" + pad2(episode);
  }
  return year ? title + " (" + year + ")" : title;
}

function buildStream(url, qualityKey, streamTitle) {
  if (!url) return null;
  const quality = extractQuality(qualityKey);
  if (quality === null) return null;
  return {
    name: "Nyxora.",
    title: quality,
    url: url,
    quality: quality,
    type: url.toLowerCase().includes(".m3u8") ? "m3u8" : "video",
    headers: VIDLINK_HEADERS,
    provider: "Vidlink"
  };
}


function parseM3U8(content, baseUrl) {
  const lines = content.split("\n").map(function(l) { return l.trim(); }).filter(Boolean);
  const streams = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      current = { resolution: null };
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/);
      if (resMatch) current.resolution = resMatch[1];
    } else if (current && !line.startsWith("#")) {
      current.url = resolveUrl(line, baseUrl);
      streams.push(current);
      current = null;
    }
  }
  return streams;
}

function fetchM3U8Streams(playlistUrl, streamTitle) {
  return fetch(playlistUrl, { headers: VIDLINK_HEADERS })
    .then(function(r) {
      if (!r.ok) return null;
      return r.text();
    })
    .then(function(content) {
      if (!content) return [];
      const parsed = parseM3U8(content, playlistUrl);
      if (parsed.length === 0) return [];
      return parsed.map(function(s) {
        const qualityKey = s.resolution
          ? s.resolution.split("x").pop() + "p"
          : null;
        return buildStream(s.url, qualityKey, streamTitle);
      }).filter(Boolean);
    })
    .catch(function() {
      return [];
    });
}


function extractStreamsFromData(data, streamTitle) {
  const results = [];
  if (!data) return results;

  if (data.stream && data.stream.qualities) {
    Object.keys(data.stream.qualities).forEach(function(key) {
      const item = data.stream.qualities[key];
      if (item && item.url) {
        const s = buildStream(item.url, key, streamTitle);
        if (s) results.push(s);
      }
    });

    if (data.stream.playlist) {
      results.push({ _playlist: true, url: data.stream.playlist });
    }
    return results;
  }

  if (data.stream && data.stream.playlist) {
    results.push({ _playlist: true, url: data.stream.playlist });
    return results;
  }

  if (data.url) {
    const s = buildStream(data.url, data.quality || null, streamTitle);
    if (s) results.push(s);
    return results;
  }

  if (Array.isArray(data.streams)) {
    data.streams.forEach(function(item) {
      if (item && item.url) {
        const s = buildStream(item.url, item.quality || item.resolution || null, streamTitle);
        if (s) results.push(s);
      }
    });
    return results;
  }

  if (Array.isArray(data.links)) {
    data.links.forEach(function(item) {
      if (item && item.url) {
        const s = buildStream(item.url, item.quality || null, streamTitle);
        if (s) results.push(s);
      }
    });
    return results;
  }

  (function findUrls(obj) {
    if (!obj || typeof obj !== "object") return;
    Object.keys(obj).forEach(function(key) {
      const val = obj[key];
      const keyLower = key.toLowerCase();
      if (keyLower.includes("subtitle") || keyLower.includes("caption")) return;
      if (typeof val === "string" && val.startsWith("http")) {
        if (val.includes(".srt") || val.includes(".vtt") ||
            val.includes("subtitle") || val.includes("caption")) return;
        const s = buildStream(val, key, streamTitle);
        if (s) results.push(s);
      } else if (typeof val === "object" && val !== null) {
        findUrls(val);
      }
    });
  })(data);

  return results;
}

function sortStreams(streams) {
  return streams
    .filter(function(s) { return ALLOWED_QUALITIES.indexOf(s.quality) !== -1; })
    .filter(function(s) { return s.url && s.url.startsWith("https"); })
    .sort(function(a, b) {
      return (QUALITY_ORDER[b.quality] || 0) - (QUALITY_ORDER[a.quality] || 0);
    });
}


function getStreams(tmdbId, mediaType, season, episode) {
  mediaType = mediaType || "movie";
  const isTv = mediaType === "tv" || mediaType === "series" ||
    (season != null && season !== "" && season !== 0) ||
    (episode != null && episode !== "" && episode !== 0);
  const finalType = isTv ? "tv" : "movie";
  let s = season || null;
  let e = episode || null;

  return getTmdbInfo(tmdbId, finalType)
    .then(function(info) {
      if (!info) return [];
      return encryptTmdbId(tmdbId).then(function(encryptedId) {
        if (!encryptedId) return [];

        const vidlinkUrl = isTv && s && e
          ? VIDLINK_API + "/tv/" + encryptedId + "/" + s + "/" + e
          : VIDLINK_API + "/movie/" + encryptedId;

        const streamTitle = createStreamTitle(info.title, info.year, finalType, s, e);

        return fetch(vidlinkUrl, { headers: VIDLINK_HEADERS })
          .then(function(r) {
            if (!r.ok) return null;
            return r.json();
          })
          .then(function(data) {
            if (!data) return [];

            const extracted = extractStreamsFromData(data, streamTitle);
            if (extracted.length === 0) return [];

            const playlists = extracted.filter(function(x) { return x._playlist; });
            const direct = extracted.filter(function(x) { return !x._playlist; });

            if (playlists.length === 0) {
              return sortStreams(direct);
            }

            return Promise.all(
              playlists.map(function(p) { return fetchM3U8Streams(p.url, streamTitle); })
            ).then(function(arrays) {
              const all = direct.concat.apply(direct, arrays);
              return sortStreams(all);
            });
          })
          .catch(function() { return []; });
      });
    })
    .catch(function() { return []; });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
