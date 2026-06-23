// usePlatformStats.js
// Fetches platform stats with localStorage caching and quiet fallbacks.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
    localStorage.removeItem(key);
  } catch {
    return null;
  }
  return null;
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Cache writes can fail in private mode or when storage is full.
  }
}

async function fetchLeetCodeStats(username) {
  const cacheKey = `lc_stats_${username}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const endpoints = [
    `https://alfa-leetcode-api.onrender.com/${username}/solved`,
    `https://leetcode-stats-api.herokuapp.com/${username}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const normalized = {
        solvedProblem: data.solvedProblem ?? data.totalSolved ?? null,
        easySolved: data.easySolved ?? null,
        mediumSolved: data.mediumSolved ?? null,
        hardSolved: data.hardSolved ?? null,
      };
      if (normalized.solvedProblem !== null) {
        setCache(cacheKey, normalized);
        return normalized;
      }
    } catch {
      // Try the next endpoint.
    }
  }

  return null;
}

async function fetchGFGStats(username) {
  const cacheKey = `gfg_stats_${username}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Public GFG stats APIs currently reject some usernames and omit CORS headers.
  // Browser fetches then create unavoidable console errors, so keep the UI on its
  // existing "Visit Profile" fallback without firing a bad client request.
  return null;
}

export async function fetchPlatformStats(platformKey, username) {
  if (!username) return null;
  if (platformKey === 'leetcode') return fetchLeetCodeStats(username);
  if (platformKey === 'geeksforgeeks') return fetchGFGStats(username);
  return null;
}
