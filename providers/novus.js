const PROVIDER_NAME   = 'Novus.';
const BASE_URL        = 'https://cinefreak.nl';
const NOVUS_BASE   = 'https://new5.cinecloud.site';
const TMDB_API_KEY    = '6e6ab700b6477171ee6c23d504b1e9cb';
const REQUEST_TIMEOUT = 12000;

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

function encodeUri(str) {
  try { return encodeURIComponent(str); } catch (_) { return str; }
}

function fetchText(url, extraHeaders) {
  const headers = Object.assign({}, HEADERS, extraHeaders || {});
  return fetch(url, { headers: headers })
    .then(function(res) {
      if (!res || !res.ok) return null;
      return res.text();
    })
    .catch(function() { return null; });
}

function fetchJson(url, extraHeaders) {
  return fetchText(url, extraHeaders).then(function(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
  });
}

function parseQuality(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.indexOf('2160') !== -1 || s.indexOf('4k') !== -1) return '2160p';
  if (s.indexOf('1080') !== -1) return '1080p';
  if (s.indexOf('720')  !== -1) return '720p';
  if (s.indexOf('480')  !== -1) return '480p';
  return 'HD';
}

function filterQualities(qualities) {
  if (!qualities || !qualities.length) return [];
  const ORDER = { '2160p': 0, '1080p': 1, '720p': 2, 'HD': 3 };
  const seen = {};
  const out  = [];
  for (let i = 0; i < qualities.length; i++) {
    const q = qualities[i];
    if (q.quality === '480p' || q.quality === 'SD') continue;
    if (seen[q.quality]) continue;
    seen[q.quality] = true;
    out.push(q);
  }
  return out.sort(function(a, b) {
    const va = ORDER[a.quality] !== undefined ? ORDER[a.quality] : 99;
    const vb = ORDER[b.quality] !== undefined ? ORDER[b.quality] : 99;
    return va - vb;
  });
}

function extractHash(url) {
  if (!url) return '';
  const fi = url.indexOf('/f/');
  const xi = url.indexOf('/x/');
  const start = fi >= 0 ? fi + 3 : xi >= 0 ? xi + 3 : -1;
  if (start < 0) return '';
  return url.substring(start);
}

function isFslPath(url) {
  return url && (url.indexOf('/f/') !== -1 || url.indexOf('/x/') !== -1);
}

function extractFslUrl(html) {
  const NEEDLE = 'href="https://pub-';
  let start  = html.indexOf(NEEDLE);
  if (start === -1) return null;
  let urlStart = start + 6;
  let urlEnd   = html.indexOf('"', urlStart);
  if (urlEnd === -1) return null;
  return html.substring(urlStart, urlEnd).replace(/&amp;/g, '&');
}

function decodeGenerateUrl(encodedId) {
  try {
    const decoded = atob(encodedId);
    return decoded.replace(/newgo32$/, '');
  } catch (_) { return null; }
}

function resolveFslUrl(fslPath) {
  if (!fslPath) return Promise.resolve(null);
  const hash = extractHash(fslPath);
  if (!hash) return Promise.resolve(null);
  const subPath = fslPath.indexOf('/x/') !== -1 ? 'x' : 'f';
  const pageUrl = NOVUS_BASE + '/' + subPath + '/' + hash;
  return fetchText(pageUrl).then(function(html) {
    if (!html) return null;
    return extractFslUrl(html);
  });
}

function extractAllGenerateLinks(html) {
  if (!html) return [];
  const NEEDLE = '/generate.php?id=';
  const links  = [];
  let pos    = 0;
  while (true) {
    const hrefStart = html.indexOf(NEEDLE, pos);
    if (hrefStart === -1) break;
    const aOpen = html.lastIndexOf('<a ', hrefStart);
    if (aOpen === -1 || aOpen < pos) { pos = hrefStart + 1; continue; }
    const aClose = html.indexOf('</a>', hrefStart);
    if (aClose === -1) { pos = hrefStart + 1; continue; }
    const gtIdx = html.indexOf('>', hrefStart);
    if (gtIdx === -1 || gtIdx > aClose) { pos = aClose + 4; continue; }
    const label = html.substring(gtIdx + 1, aClose).trim();
    const quoteIdx = html.indexOf('"', hrefStart);
    if (quoteIdx === -1) { pos = aClose + 4; continue; }
    const attrSnippet = html.substring(hrefStart, quoteIdx);
    const idMatch = attrSnippet.match(/id=([a-zA-Z0-9+/=]+)/);
    if (!idMatch) { pos = aClose + 4; continue; }
    const encodedId  = idMatch[1];
    const decodedUrl = decodeGenerateUrl(encodedId) || '';
    links.push({ encodedId: encodedId, decodedUrl: decodedUrl, label: label });
    pos = aClose + 4;
  }
  return links;
}

function extractMovieQualities(html) {
  if (!html) return [];
  const sections = html.split('dlbtn-container');
  const results  = [];
  for (let i = 1; i < sections.length; i++) {
    const current  = sections[i];
    const previous = sections[i - 1];
    const linkMatch = current.match(
      /href="(?:https?:\/\/[^"]*?)?\/generate\.php\?id=([a-zA-Z0-9+/=]+)"/
    );
    if (!linkMatch) continue;
    const encodedId  = linkMatch[1];
    const decodedUrl = decodeGenerateUrl(encodedId);
    if (!decodedUrl || !isFslPath(decodedUrl)) continue;
    let rawLabel = '';
    const lm1 = previous.match(/<\/span>\s*([^<]*?(?:2160|1080|720|480|4K)[^<]*?)\s*\[/i);
    if (lm1) {
      rawLabel = lm1[1].trim();
    } else {
      const lm2 = previous.match(/\b(?:4K\s*2160p|UHD|2160p|1080p|720p|480p|SD|HD)\b/i);
      if (lm2) rawLabel = lm2[0];
    }
    if (!rawLabel) rawLabel = decodedUrl;
    const quality = parseQuality(rawLabel);
    let dup = false;
    for (let d = 0; d < results.length; d++) {
      if (results[d].decodedUrl === decodedUrl) { dup = true; break; }
    }
    if (!dup) results.push({ encodedId: encodedId, decodedUrl: decodedUrl, label: rawLabel, quality: quality });
  }
  return results;
}

function extractEpisodeQualities(html, episodeNumber) {
  if (!html) return [];
  const cards      = html.split('<div class="ep-card"');
  let targetCard = null;
  const patterns   = [
    /episode-badge[^>]*>\s*(?:Episode\s*)?(\d+)/i,
    /ep-num[^>]*>\s*(\d+)\s*</i,
    /data-episode="(\d+)"/i,
    /\bEpisode\s+(\d+)\b/i,
  ];
  for (let i = 1; i < cards.length; i++) {
    const card    = cards[i];
    let matched = false;
    for (let p = 0; p < patterns.length; p++) {
      const m = card.match(patterns[p]);
      if (m && parseInt(m[1], 10) === episodeNumber) {
        targetCard = card;
        matched    = true;
        break;
      }
    }
    if (matched) break;
  }
  if (!targetCard) return [];
  const links   = extractAllGenerateLinks(targetCard);
  const results = [];
  for (let j = 0; j < links.length; j++) {
    const link = links[j];
    if (!link.decodedUrl || !isFslPath(link.decodedUrl)) continue;
    const quality = parseQuality(link.label || link.decodedUrl);
    let dup2 = false;
    for (let k = 0; k < results.length; k++) {
      if (results[k].decodedUrl === link.decodedUrl) { dup2 = true; break; }
    }
    if (!dup2) results.push({
      encodedId:  link.encodedId,
      decodedUrl: link.decodedUrl,
      label:      link.label || quality,
      quality:    quality,
    });
  }
  return results;
}

function wordMatchScore(query, target) {
  const words = String(query || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  let total = 0, matched = 0;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 3) continue;
    total++;
    const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(target)) matched++;
  }
  return total === 0 ? 0 : matched / total;
}

function titleStartsWith(candidate, query) {
  const c = String(candidate || '').toLowerCase().trim();
  const q = String(query    || '').toLowerCase().trim();
  return c.indexOf(q) === 0 || c.indexOf(q + ' ') === 0 || c.indexOf('(' + q + ')') === 0;
}

function urlContains(url, title) {
  const u    = String(url   || '').toLowerCase();
  const slug = String(title || '').toLowerCase()
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const words = slug.split('-').filter(function(w) { return w.length > 2; });
  if (words.length === 0) return 0;
  const hits = words.filter(function(w) { return u.indexOf(w) !== -1; });
  return hits.length / words.length;
}

function scoreResult(result, title, year) {
  if (!result) return 0;
  let score = 0;
  if (titleStartsWith(result.title, title)) score += 10;
  score += urlContains(result.url, title) * 5;
  score += wordMatchScore(title, result.title);
  if (year && String(result.title).toLowerCase().indexOf(year) !== -1) score += 3;
  return score;
}

function matchByTitleYear(title, year, results, season) {
  if (!results || !results.length) return null;
  if (season) {
    const seasonRe = new RegExp('(?:season|s)\\s*0*' + season + '\\b', 'i');
    let best1 = null, bestScore1 = -1;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r || !r.title) continue;
      if (seasonRe.test(r.title)) {
        const s = scoreResult(r, title, year) + 10;
        if (s > bestScore1) { bestScore1 = s; best1 = r; }
      }
    }
    if (best1 && bestScore1 >= 5) return best1;
  }
  let best2 = null, bestScore2 = -1;
  for (let j = 0; j < results.length; j++) {
    const r2 = results[j];
    if (!r2 || !r2.title) continue;
    const s2 = scoreResult(r2, title, year);
    if (s2 > bestScore2) { bestScore2 = s2; best2 = r2; }
  }
  return best2 && bestScore2 >= 3 ? best2 : null;
}

function searchcinefreak(query) {
  if (!query) return Promise.resolve([]);
  const url = BASE_URL + '/wp-json/wp/v2/search?search=' + encodeUri(query) + '&per_page=10';
  return fetchJson(url).then(function(data) {
    if (!data || !data.length) return [];
    return data
      .filter(function(item) { return item && item.title && item.url; })
      .map(function(item) {
        return {
          id:    item.id,
          title: String(item.title).replace(/Download\s*/gi, '').trim(),
          url:   item.url,
        };
      })
      .filter(function(item) { return item.title; });
  });
}

function fetchPostPage(pathOrUrl) {
  if (!pathOrUrl) return Promise.resolve(null);
  let url = pathOrUrl;
  if (pathOrUrl.indexOf('http') !== 0) {
    url = pathOrUrl.indexOf('/') === 0 ? BASE_URL + pathOrUrl : BASE_URL + '/' + pathOrUrl;
  }
  return fetchText(url);
}

function getTMDBInfo(tmdbId, type) {
  const isTv   = type === 'tv' || type === 'series';
  const apiUrl = isTv
    ? 'https://api.themoviedb.org/3/tv/'    + tmdbId
    : 'https://api.themoviedb.org/3/movie/' + tmdbId;
  const tmdbHeaders = {
    'Authorization': 'Bearer ' + TMDB_API_KEY,
    'Accept':        'application/json',
  };
  return fetchJson(apiUrl, tmdbHeaders).then(function(data) {
    if (!data) return null;
    return {
      title: isTv ? data.name  : data.title,
      year:  isTv ? (data.first_air_date || '').substring(0, 4)
                  : (data.release_date   || '').substring(0, 4),
      isTv:  isTv,
    };
  });
}

function searchWithFallbacks(title, year, isTv, seasonNum) {
  return searchcinefreak(title).then(function(results) {
    if (results && results.length >= 3) return results;
    return searchcinefreak(title + ' ' + year).then(function(fallback) {
      const merged = (fallback && fallback.length) ? fallback : (results || []);
      if (!isTv || !seasonNum || merged.length >= 3) return merged;
      return searchcinefreak(title + ' Season ' + seasonNum).then(function(sf) {
        return (sf && sf.length) ? sf : merged;
      });
    });
  });
}

function resolveStreamsFromQualities(qualities, season, episode, isTv) {
  let episodePrefix = '';
  if (isTv) {
    const s = parseInt(season,  10) || 1;
    const e = parseInt(episode, 10) || 1;
    const sp = s < 10 ? '0' : '';
    const ep = e < 10 ? '0' : '';
    episodePrefix = 'S' + sp + s + 'E' + ep + e + ' ';
  }

  const streams = [];
  function resolveNext(index) {
    if (index >= qualities.length) return Promise.resolve(streams);
    const q = qualities[index];
    return resolveFslUrl(q.decodedUrl).then(function(directUrl) {
      if (directUrl && directUrl.startsWith('https')) {
        streams.push({
          name:    PROVIDER_NAME,
          title:   episodePrefix + q.quality + ' [FSL]',
          url:     directUrl,
          quality: q.quality,
          headers: { Referer: NOVUS_BASE + '/' },
        });
      }
      return resolveNext(index + 1);
    });
  }
  return resolveNext(0);
}

function getStreams(tmdbId, mediaType, season, episode) {
  const isTv      = mediaType === 'tv' || mediaType === 'series';
  const seasonNum = isTv ? (parseInt(season, 10) || 1) : null;

  return getTMDBInfo(tmdbId, mediaType)
    .then(function(tmdbInfo) {
      if (!tmdbInfo || !tmdbInfo.title) return [];

      return searchWithFallbacks(tmdbInfo.title, tmdbInfo.year, isTv, seasonNum)
        .then(function(searchResults) {
          if (!searchResults || !searchResults.length) return [];

          const matched = matchByTitleYear(tmdbInfo.title, tmdbInfo.year, searchResults, seasonNum);
          if (!matched) return [];

          return fetchPostPage(matched.url).then(function(html) {
            if (!html) return [];

            let rawQualities;
            if (isTv) {
              const episodeNum = parseInt(episode, 10) || 1;
              rawQualities = extractEpisodeQualities(html, episodeNum);
            } else {
              rawQualities = extractMovieQualities(html);
            }

            if (!rawQualities || !rawQualities.length) return [];

            const qualities = filterQualities(rawQualities);
            if (!qualities.length) return [];

            return resolveStreamsFromQualities(qualities, season, episode, isTv);
          });
        });
    })
    .catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
