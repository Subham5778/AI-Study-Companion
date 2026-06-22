// usePlatformStats.js
// A shared hook to fetch LeetCode / GFG stats with:
//   1. localStorage caching (5-minute TTL) — prevents 429 rate-limit errors
//   2. Proper HTTP status checks — handles 400/429 gracefully
//   3. Alternative LeetCode endpoints — falls back if primary fails

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL_MS) return data;
    localStorage.removeItem(key);
  } catch {}
  return null;
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// Fetch LeetCode solved count — tries two endpoints
async function fetchLeetCodeStats(username) {
  const cacheKey = `lc_stats_${username}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Try primary endpoint
  const endpoints = [
    `https://alfa-leetcode-api.onrender.com/${username}/solved`,
    `https://leetcode-stats-api.herokuapp.com/${username}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue; // skip 400, 429, 500, etc.
      const data = await res.json();
      // Normalize response across APIs
      const normalized = {
        solvedProblem:
          data.solvedProblem ?? data.totalSolved ?? null,
        easySolved:
          data.easySolved ?? data.easySolved ?? null,
        mediumSolved:
          data.mediumSolved ?? data.mediumSolved ?? null,
        hardSolved:
          data.hardSolved ?? data.hardSolved ?? null,
      };
      if (normalized.solvedProblem !== null) {
        setCache(cacheKey, normalized);
        return normalized;
      }
    } catch {}
  }
  return null;
}

// Fetch GFG stats
async function fetchGFGStats(username) {
  const cacheKey = `gfg_stats_${username}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const urls = [
    `https://geeks-for-geeks-stats-api.vercel.app/?raw=y&userName=${username}`,
    `https://gfgstatsapi.vercel.app/api/${username}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const total = data.totalProblemsSolved ?? data.total_problems_solved_count ?? null;
      if (total === null) continue;
      const normalized = {
        solvedProblem: total,
        easySolved: (data.school || 0) + (data.basic || 0) + (data.easy || 0),
        mediumSolved: data.medium || 0,
        hardSolved: data.hard || 0,
      };
      setCache(cacheKey, normalized);
      return normalized;
    } catch {}
  }
  return null;
}

export async function fetchPlatformStats(platformKey, username) {
  if (!username) return null;
  if (platformKey === 'leetcode') return fetchLeetCodeStats(username);
  if (platformKey === 'geeksforgeeks') return fetchGFGStats(username);
  return null;
}
