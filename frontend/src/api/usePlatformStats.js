// usePlatformStats.js
// Fetches platform stats with localStorage caching and backend proxy fallbacks.

import API from './axios';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_VERSION = 'v2';

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
  const cacheKey = `${CACHE_VERSION}_lc_stats_${username}`;
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

async function fetchBackendPlatformStats(platformKey, username) {
  const cacheKey = `${CACHE_VERSION}_${platformKey}_stats_${username}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await API.get(`/api/user/coding-stats/${platformKey}/${encodeURIComponent(username)}`);
  setCache(cacheKey, res.data);
  return res.data;
}

export async function fetchPlatformStats(platformKey, username) {
  if (!username) return null;
  if (platformKey === 'leetcode') {
    try {
      return await fetchBackendPlatformStats(platformKey, username);
    } catch {
      return fetchLeetCodeStats(username);
    }
  }
  return fetchBackendPlatformStats(platformKey, username);
}
