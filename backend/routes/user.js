const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const auth = require('../middlewares/auth');
const Analytics = require('../models/Analytics');
const Note = require('../models/Note');
const StudyPlan = require('../models/StudyPlan');

const requestPublicJson = async (url) => {
  const res = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StudyCompanionCodingTracker/1.0)',
      Accept: 'application/json,text/html;q=0.9,*/*;q=0.8'
    }
  });
  return res.data;
};

const requestPublicHtml = async (url) => {
  const res = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StudyCompanionCodingTracker/1.0)',
      Accept: 'text/html,application/xhtml+xml'
    }
  });
  return String(res.data || '');
};

const numberFrom = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const textBetween = (html, patterns) => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  return null;
};

const bucketByDifficulty = (rating) => {
  if (!rating || rating <= 1200) return 'easySolved';
  if (rating <= 1800) return 'mediumSolved';
  return 'hardSolved';
};

const dateKeyFromDate = (date = new Date(), timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const dateKeyFromTimestamp = (timestampSeconds, timeZone) => {
  if (!timestampSeconds) return null;
  return dateKeyFromDate(new Date(Number(timestampSeconds) * 1000), timeZone);
};

const calculateCurrentStreak = (activity = {}, timeZone) => {
  let streak = 0;
  const date = new Date();

  while (true) {
    const key = dateKeyFromDate(date, timeZone);
    if (Number(activity[key] || 0) <= 0) break;
    streak += 1;
    date.setDate(date.getDate() - 1);
  }

  return streak;
};

const activityFromCurrentStreak = (streak = 0, timeZone) => {
  const activity = {};
  const count = Number(streak || 0);
  for (let index = 0; index < count; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    activity[dateKeyFromDate(date, timeZone)] = 1;
  }
  return activity;
};

const pickNumber = (source = {}, paths = []) => {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], source);
    const parsed = numberFrom(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const monthKeyFromDate = (date = new Date(), timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      year: 'numeric'
    }).formatToParts(date);
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const year = parts.find((part) => part.type === 'year')?.value || '';
    return `${month} ${year}`;
  } catch {
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }
};

const buildMonthlySolvedSeries = (activity = {}, timeZone) => {
  const buckets = new Map();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    buckets.set(monthKeyFromDate(date, timeZone), { month: monthKeyFromDate(date, timeZone), solved: 0, contests: 0, rating: null });
  }

  Object.entries(activity || {}).forEach(([dateKey, count]) => {
    const date = new Date(`${dateKey}T12:00:00`);
    const key = monthKeyFromDate(date, timeZone);
    if (!buckets.has(key)) return;
    buckets.get(key).solved += Number(count || 0);
  });

  return Array.from(buckets.values());
};

const mergeMonthlySeries = (base = [], contests = []) => {
  const byMonth = new Map(base.map((item) => [item.month, { ...item }]));
  contests.forEach((contest) => {
    const current = byMonth.get(contest.month) || { month: contest.month, solved: 0, contests: 0, rating: null };
    current.contests += Number(contest.contests || 0);
    if (contest.rating !== null && contest.rating !== undefined) current.rating = contest.rating;
    byMonth.set(contest.month, current);
  });
  return Array.from(byMonth.values());
};

const normalizeContestHistoryRow = ({ platform, contest, date, rank, oldRating, newRating }) => ({
  platform,
  contest,
  date,
  rank: numberFrom(rank),
  oldRating: numberFrom(oldRating),
  newRating: numberFrom(newRating),
  change: numberFrom(newRating) !== null && numberFrom(oldRating) !== null ? numberFrom(newRating) - numberFrom(oldRating) : null
});

const parseContestDate = (date) => {
  if (!date) return null;
  if (date instanceof Date) return Number.isNaN(date.getTime()) ? null : date;
  const raw = String(date).trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const withoutOrdinal = raw.replace(/(\d+)(st|nd|rd|th)/i, '$1');
  const reparsed = new Date(withoutOrdinal);
  return Number.isNaN(reparsed.getTime()) ? null : reparsed;
};

const normalizeUpcomingContest = ({ platform, name, start, durationSeconds, link }) => {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  return {
    platform,
    name,
    start: startDate.toISOString(),
    duration: durationSeconds ? `${Math.floor(durationSeconds / 3600)}h ${Math.round((durationSeconds % 3600) / 60)}m` : 'N/A',
    link,
    urgent: startDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000
  };
};

const fetchCodeforcesUpcomingContests = async () => {
  const data = await requestPublicJson('https://codeforces.com/api/contest.list?gym=false');
  if (data.status !== 'OK') return [];
  return data.result
    .filter((contest) => contest.phase === 'BEFORE')
    .map((contest) => normalizeUpcomingContest({
      platform: 'codeforces',
      name: contest.name,
      start: Number(contest.startTimeSeconds) * 1000,
      durationSeconds: contest.durationSeconds,
      link: `https://codeforces.com/contests/${contest.id}`
    }))
    .filter(Boolean);
};

const fetchLeetCodeUpcomingContests = async () => {
  const res = await axios.post(
    'https://leetcode.com/graphql',
    {
      query: `
        query upcomingContests {
          allContests {
            title
            titleSlug
            startTime
            duration
          }
        }
      `
    },
    {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StudyCompanionCodingTracker/1.0)',
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com/contest/'
      }
    }
  );

  return (res.data?.data?.allContests || [])
    .filter((contest) => Number(contest.startTime) * 1000 > Date.now())
    .map((contest) => normalizeUpcomingContest({
      platform: 'leetcode',
      name: contest.title,
      start: Number(contest.startTime) * 1000,
      durationSeconds: Number(contest.duration),
      link: `https://leetcode.com/contest/${contest.titleSlug}/`
    }))
    .filter(Boolean);
};

const fetchCodeChefUpcomingContests = async () => {
  const data = await requestPublicJson('https://www.codechef.com/api/list/contests/all');
  const rows = data.future_contests || data.futureContests || [];
  return rows.map((contest) => normalizeUpcomingContest({
    platform: 'codechef',
    name: contest.contest_name || contest.name,
    start: contest.contest_start_date_iso || contest.contest_start_date,
    durationSeconds: numberFrom(contest.contest_duration) ? numberFrom(contest.contest_duration) * 60 : null,
    link: contest.contest_code ? `https://www.codechef.com/${contest.contest_code}` : 'https://www.codechef.com/contests'
  })).filter(Boolean);
};

const fetchLeetCodeStats = async (username, timeZone) => {
  try {
    const graphRes = await axios.post(
      'https://leetcode.com/graphql',
      {
        query: `
          query codingTrackerProfile($username: String!) {
            matchedUser(username: $username) {
              username
              profile { ranking }
              submitStatsGlobal {
                acSubmissionNum { difficulty count }
              }
              userCalendar {
                streak
                totalActiveDays
                submissionCalendar
              }
            }
            userContestRanking(username: $username) {
              rating
              globalRanking
              attendedContestsCount
            }
            userContestRankingHistory(username: $username) {
              attended
              rating
              ranking
              contest {
                title
                startTime
              }
            }
            recentSubmissionList(username: $username, limit: 50) {
              title
              titleSlug
              timestamp
              statusDisplay
              lang
            }
          }
        `,
        variables: { username }
      },
      {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StudyCompanionCodingTracker/1.0)',
          'Content-Type': 'application/json',
          Referer: `https://leetcode.com/u/${encodeURIComponent(username)}/`
        }
      }
    );

    const payload = graphRes.data?.data;
    if (!payload?.matchedUser) throw new Error('LeetCode username was not found.');

    const solvedBuckets = payload.matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const solvedByDifficulty = Object.fromEntries(solvedBuckets.map((item) => [item.difficulty, item.count]));
    const activity = JSON.parse(payload.matchedUser.userCalendar?.submissionCalendar || '{}');
    const normalizedActivity = Object.fromEntries(
      Object.entries(activity).map(([timestamp, count]) => [dateKeyFromTimestamp(timestamp, timeZone), Number(count || 0)]).filter(([key]) => key)
    );
    const recent = payload.recentSubmissionList || [];
    const lastSubmission = recent[0]?.timestamp ? new Date(Number(recent[0].timestamp) * 1000).toISOString() : null;
    const today = dateKeyFromDate(new Date(), timeZone);
    const todayProblems = recent
      .filter((submission) => dateKeyFromTimestamp(submission.timestamp, timeZone) === today)
      .map((submission) => ({
        id: `leetcode-${submission.titleSlug}-${submission.timestamp}`,
        name: submission.title,
        status: submission.statusDisplay,
        language: submission.lang,
        time: new Date(Number(submission.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: `https://leetcode.com/problems/${submission.titleSlug}/`
      }));
    const contestHistory = (payload.userContestRankingHistory || [])
      .filter((entry) => entry.attended)
      .map((entry, index, entries) => {
        const previous = entries.slice(0, index).reverse().find((item) => item.attended);
        return normalizeContestHistoryRow({
          platform: 'leetcode',
          contest: entry.contest?.title || 'LeetCode Contest',
          date: entry.contest?.startTime ? dateKeyFromTimestamp(entry.contest.startTime, timeZone) : null,
          rank: entry.ranking,
          oldRating: previous?.rating ?? null,
          newRating: entry.rating
        });
      })
      .filter((entry) => entry.date)
      .slice(-20);
    const monthlyContestSeries = contestHistory.reduce((rows, contest) => {
      const date = parseContestDate(contest.date);
      if (!date) return rows;
      const month = monthKeyFromDate(date, timeZone);
      const existing = rows.find((row) => row.month === month);
      if (existing) {
        existing.contests += 1;
        existing.rating = contest.newRating ?? existing.rating;
      } else {
        rows.push({ month, contests: 1, rating: contest.newRating ?? null });
      }
      return rows;
    }, []);
    const monthlySeries = mergeMonthlySeries(buildMonthlySolvedSeries(normalizedActivity, timeZone), monthlyContestSeries);

    return {
      platform: 'leetcode',
      username,
      solvedProblem: numberFrom(solvedByDifficulty.All),
      easySolved: numberFrom(solvedByDifficulty.Easy),
      mediumSolved: numberFrom(solvedByDifficulty.Medium),
      hardSolved: numberFrom(solvedByDifficulty.Hard),
      globalRank: numberFrom(payload.matchedUser.profile?.ranking ?? payload.userContestRanking?.globalRanking),
      currentRating: numberFrom(payload.userContestRanking?.rating),
      highestRating: numberFrom(payload.userContestRanking?.rating),
      contestCount: numberFrom(payload.userContestRanking?.attendedContestsCount),
      currentStreak: numberFrom(payload.matchedUser.userCalendar?.streak) ?? calculateCurrentStreak(normalizedActivity, timeZone),
      lastSubmission,
      todayProblems,
      activity: normalizedActivity,
      monthlySeries,
      contestHistory,
      source: 'Live'
    };
  } catch {
    const endpoints = [
      `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/solved`,
      `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await requestPublicJson(endpoint);
        const solvedProblem = numberFrom(data.solvedProblem ?? data.totalSolved);
        if (solvedProblem !== null) {
          return {
            platform: 'leetcode',
            username,
            solvedProblem,
            easySolved: numberFrom(data.easySolved),
            mediumSolved: numberFrom(data.mediumSolved),
            hardSolved: numberFrom(data.hardSolved),
            globalRank: numberFrom(data.ranking ?? data.globalRank),
            acceptanceRate: numberFrom(data.acceptanceRate),
            source: 'Partial'
          };
        }
      } catch {
        // Try the next public LeetCode mirror.
      }
    }
  }

  throw new Error('LeetCode stats are unavailable for this username.');
};

const fetchCodeforcesStats = async (username, timeZone) => {
  const handle = encodeURIComponent(username);
  const info = await requestPublicJson(`https://codeforces.com/api/user.info?handles=${handle}`);
  if (info.status !== 'OK' || !info.result?.length) throw new Error('Codeforces handle was not found.');

  const userInfo = info.result[0];
  const submissions = await requestPublicJson(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`);
  if (submissions.status !== 'OK') throw new Error('Codeforces submissions are unavailable.');

  const accepted = new Map();
  const activity = {};
  const today = dateKeyFromDate(new Date(), timeZone);
  const todayProblems = [];
  let lastSubmission = null;
  submissions.result.forEach((submission) => {
    if (!lastSubmission || submission.creationTimeSeconds > lastSubmission.creationTimeSeconds) {
      lastSubmission = submission;
    }
    if (submission.verdict !== 'OK' || !submission.problem) return;
    const dateKey = dateKeyFromTimestamp(submission.creationTimeSeconds, timeZone);
    activity[dateKey] = Number(activity[dateKey] || 0) + 1;
    if (dateKey === today) {
      todayProblems.push({
        id: `codeforces-${submission.id}`,
        name: `${submission.problem.contestId}${submission.problem.index} - ${submission.problem.name}`,
        difficulty: submission.problem.rating || submission.problem.index,
        status: submission.verdict,
        language: submission.programmingLanguage,
        time: new Date(submission.creationTimeSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        link: `https://codeforces.com/problemset/problem/${submission.problem.contestId}/${submission.problem.index}`
      });
    }
    const key = `${submission.problem.contestId || 'gym'}-${submission.problem.index}`;
    accepted.set(key, submission.problem);
  });

  const counts = { easySolved: 0, mediumSolved: 0, hardSolved: 0 };
  accepted.forEach((problem) => {
    counts[bucketByDifficulty(problem.rating)] += 1;
  });

  let contestCount = 0;
  let ratingChange = null;
  let contestHistory = [];
  try {
    const rating = await requestPublicJson(`https://codeforces.com/api/user.rating?handle=${handle}`);
    if (rating.status === 'OK') {
      contestCount = rating.result.length;
      const last = rating.result.at(-1);
      if (last) ratingChange = last.newRating - last.oldRating;
      contestHistory = rating.result.map((entry) => normalizeContestHistoryRow({
        platform: 'codeforces',
        contest: entry.contestName,
        date: dateKeyFromTimestamp(entry.ratingUpdateTimeSeconds, timeZone),
        rank: entry.rank,
        oldRating: entry.oldRating,
        newRating: entry.newRating
      })).slice(-20);
    }
  } catch {
    // Rating history is optional.
  }
  const monthlyContestSeries = contestHistory.reduce((rows, contest) => {
    const date = parseContestDate(contest.date);
    if (!date) return rows;
    const month = monthKeyFromDate(date, timeZone);
    const existing = rows.find((row) => row.month === month);
    if (existing) {
      existing.contests += 1;
      existing.rating = contest.newRating ?? existing.rating;
    } else {
      rows.push({ month, contests: 1, rating: contest.newRating ?? null });
    }
    return rows;
  }, []);

  return {
    platform: 'codeforces',
    username,
    solvedProblem: accepted.size,
    ...counts,
    currentRating: numberFrom(userInfo.rating),
    highestRating: numberFrom(userInfo.maxRating),
    rankLabel: userInfo.rank || null,
    maxRank: userInfo.maxRank || null,
    contestCount,
    ratingChange,
    lastSubmission: lastSubmission ? new Date(lastSubmission.creationTimeSeconds * 1000).toISOString() : null,
    todayProblems,
    activity,
    monthlySeries: mergeMonthlySeries(buildMonthlySolvedSeries(activity, timeZone), monthlyContestSeries),
    contestHistory,
    source: 'Live'
  };
};

const fetchCodeChefStats = async (username, timeZone) => {
  const handle = encodeURIComponent(username);
  try {
    const data = await requestPublicJson(`https://codechef-api.vercel.app/handle/${handle}`);
    if (data.success === false) throw new Error(data.message || 'CodeChef handle was not found.');
    const ratingRows = Array.isArray(data.ratingData) ? data.ratingData : [];
    const contestHistory = ratingRows.map((entry) => normalizeContestHistoryRow({
      platform: 'codechef',
      contest: entry.name || entry.code || 'CodeChef Contest',
      date: entry.end_date || entry.getday || entry.date,
      rank: entry.rank,
      oldRating: entry.rating ? Number(entry.rating) - Number(entry.penalised_in || 0) : null,
      newRating: entry.rating
    })).filter((entry) => entry.date).slice(-20);
    const monthlyContestSeries = contestHistory.reduce((rows, contest) => {
      const date = parseContestDate(contest.date);
      if (!date) return rows;
      const month = monthKeyFromDate(date, timeZone);
      const existing = rows.find((row) => row.month === month);
      if (existing) {
        existing.contests += 1;
        existing.rating = contest.newRating ?? existing.rating;
      } else {
        rows.push({ month, contests: 1, rating: contest.newRating ?? null });
      }
      return rows;
    }, []);

    return {
      platform: 'codechef',
      username,
      solvedProblem: numberFrom(data.totalSolved ?? data.fullySolved?.count),
      currentRating: numberFrom(data.currentRating),
      highestRating: numberFrom(data.highestRating),
      stars: String(data.stars || '').replace(/[^\d]/g, '') || null,
      globalRank: numberFrom(data.globalRank),
      countryRank: numberFrom(data.countryRank),
      contestCount: ratingRows.length || null,
      monthlySeries: mergeMonthlySeries(buildMonthlySolvedSeries({}, timeZone), monthlyContestSeries),
      contestHistory,
      source: 'Live'
    };
  } catch {
    const html = await requestPublicHtml(`https://www.codechef.com/users/${handle}`);
    const currentRating = numberFrom(textBetween(html, [/class="rating-number"[^>]*>([^<]+)/i]));
    if (currentRating === null) throw new Error('CodeChef profile could not be parsed.');

    return {
      platform: 'codechef',
      username,
      currentRating,
      highestRating: numberFrom(textBetween(html, [/Highest Rating[^0-9]*([0-9,]+)/i])),
      stars: textBetween(html, [/class="rating-star"[^>]*>([^<]+)/i]),
      globalRank: numberFrom(textBetween(html, [/Global Rank[^0-9]*([0-9,]+)/i])),
      countryRank: numberFrom(textBetween(html, [/Country Rank[^0-9]*([0-9,]+)/i])),
      solvedProblem: numberFrom(textBetween(html, [/Fully Solved[^0-9]*([0-9,]+)/i])),
      monthlySeries: buildMonthlySolvedSeries({}, timeZone),
      contestHistory: [],
      source: 'Live'
    };
  }
};

const fetchGfgStats = async (username, timeZone) => {
  const handle = encodeURIComponent(username);
  try {
    const data = await requestPublicJson(`https://geeks-for-geeks-api.vercel.app/${handle}`);
    const info = data.info || data;
    const codingScore = numberFrom(info.codingScore ?? data.codingScore);
    const solvedProblem = numberFrom(info.totalProblemsSolved ?? info.totalSolved ?? data.totalProblemsSolved);
    if (codingScore === null && solvedProblem === null) throw new Error('GFG public API did not return usable stats.');
    const currentStreak = numberFrom(info.currentStreak ?? data.currentStreak);

    return {
      platform: 'geeksforgeeks',
      username,
      codingScore,
      solvedProblem,
      easySolved: pickNumber({ ...data, ...info }, ['easySolved', 'easy', 'Easy', 'solvedStats.easy.count', 'solvedStats.Easy.count', 'difficulty.easy']),
      mediumSolved: pickNumber({ ...data, ...info }, ['mediumSolved', 'medium', 'Medium', 'solvedStats.medium.count', 'solvedStats.Medium.count', 'difficulty.medium']),
      hardSolved: pickNumber({ ...data, ...info }, ['hardSolved', 'hard', 'Hard', 'solvedStats.hard.count', 'solvedStats.Hard.count', 'difficulty.hard']),
      monthlyScore: numberFrom(info.monthlyScore ?? info.monthly_score ?? data.monthlyScore ?? data.monthly_score),
      instituteRank: numberFrom(info.instituteRank ?? data.instituteRank),
      currentStreak,
      lastSubmission: info.lastSubmission || data.lastSubmission || null,
      activity: activityFromCurrentStreak(currentStreak, timeZone),
      monthlySeries: buildMonthlySolvedSeries(activityFromCurrentStreak(currentStreak, timeZone), timeZone).map((row, index, rows) => (
        index === rows.length - 1 ? { ...row, solved: numberFrom(info.monthlyScore ?? info.monthly_score ?? data.monthlyScore ?? data.monthly_score) ?? row.solved } : row
      )),
      contestHistory: [],
      profileUrl: `https://www.geeksforgeeks.org/profile/${handle}`,
      source: 'Live'
    };
  } catch {
    const profileUrls = [
      `https://www.geeksforgeeks.org/profile/${handle}?tab=activity`,
      `https://www.geeksforgeeks.org/profile/${handle}`,
      `https://www.geeksforgeeks.org/user/${handle}`
    ];

    let html = '';
    let profileUrl = profileUrls[0];
    for (const url of profileUrls) {
      try {
        html = await requestPublicHtml(url);
        profileUrl = url;
        if (html) break;
      } catch {
        // Try the next known GFG profile URL shape.
      }
    }

    const scriptJson = textBetween(html, [/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i]);
    const searchable = `${html} ${scriptJson || ''}`;
    const codingScore = numberFrom(textBetween(searchable, [
      /Coding Score<\/[^>]+>\s*<[^>]+>([0-9,]+)/i,
      /Coding Score[^0-9]{0,80}([0-9,]+)/i,
      /codingScore\\?["']\s*:\s*([0-9,]+)/i,
      /\\?"score\\?"\s*:\s*([0-9,]+)/i
    ]));
    const solvedProblem = numberFrom(textBetween(searchable, [
      /Problem Solved<\/[^>]+>\s*<[^>]+>([0-9,]+)/i,
      /Problems Solved[^0-9]{0,80}([0-9,]+)/i,
      /totalProblemsSolved\\?["']\s*:\s*([0-9,]+)/i,
      /totalSolved\\?["']\s*:\s*([0-9,]+)/i,
      /\\?"total_problems_solved\\?"\s*:\s*([0-9,]+)/i
    ]));
    if (codingScore === null && solvedProblem === null) {
      throw new Error('GeeksforGeeks profile could not be parsed. GFG often changes or blocks profile markup; try again after deployment or add the problem manually.');
    }
    const currentStreak = numberFrom(textBetween(searchable, [/Current Streak[^0-9]{0,80}([0-9,]+)/i, /currentStreak\\?["']\s*:\s*([0-9,]+)/i, /\\?"pod_solved_current_streak\\?"\s*:\s*([0-9,]+)/i]));
    const monthlyScore = numberFrom(textBetween(searchable, [/monthlyScore\\?["']\s*:\s*([0-9,]+)/i, /\\?"monthly_score\\?"\s*:\s*([0-9,]+)/i]));

    return {
      platform: 'geeksforgeeks',
      username,
      codingScore,
      solvedProblem,
      easySolved: numberFrom(textBetween(searchable, [/easySolved\\?["']\s*:\s*([0-9,]+)/i, /\\?"easy\\?"\s*:\s*([0-9,]+)/i, /\\?"Easy\\?"\s*:\s*([0-9,]+)/i])),
      mediumSolved: numberFrom(textBetween(searchable, [/mediumSolved\\?["']\s*:\s*([0-9,]+)/i, /\\?"medium\\?"\s*:\s*([0-9,]+)/i, /\\?"Medium\\?"\s*:\s*([0-9,]+)/i])),
      hardSolved: numberFrom(textBetween(searchable, [/hardSolved\\?["']\s*:\s*([0-9,]+)/i, /\\?"hard\\?"\s*:\s*([0-9,]+)/i, /\\?"Hard\\?"\s*:\s*([0-9,]+)/i])),
      monthlyScore,
      instituteRank: numberFrom(textBetween(searchable, [/Institute Rank[^0-9]{0,80}([0-9,]+)/i, /instituteRank\\?["']\s*:\s*([0-9,]+)/i, /\\?"institute_rank\\?"\s*:\s*([0-9,]+)/i])),
      currentStreak,
      longestStreak: numberFrom(textBetween(searchable, [/\\?"pod_solved_longest_streak\\?"\s*:\s*([0-9,]+)/i])),
      activity: activityFromCurrentStreak(currentStreak, timeZone),
      monthlySeries: buildMonthlySolvedSeries(activityFromCurrentStreak(currentStreak, timeZone), timeZone).map((row, index, rows) => (
        index === rows.length - 1 ? { ...row, solved: monthlyScore ?? row.solved } : row
      )),
      contestHistory: [],
      profileUrl,
      source: 'Live'
    };
  }
};

// Get User Profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update Preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { studyTimePreference, difficultyLevel } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          'preferences.studyTimePreference': studyTimePreference,
          'preferences.difficultyLevel': difficultyLevel
        }
      },
      { returnDocument: 'after' }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get User Heatmap/Analytics Data
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = await Analytics.find({ userId: req.user.id }).sort({ date: 1 });
    res.json(analytics);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Log Study Time (called by Focus Timer on session complete)
router.post('/analytics/log-time', auth, async (req, res) => {
  try {
    const minutes = parseInt(req.body.minutes);
    if (!minutes || minutes <= 0) return res.status(400).json({ message: 'Invalid minutes' });

    const todayStr = new Date().toISOString().split('T')[0];
    let analytics = await Analytics.findOne({ userId: req.user.id, date: todayStr });
    if (!analytics) {
      analytics = new Analytics({ userId: req.user.id, date: todayStr, studyMinutes: minutes });
    } else {
      analytics.studyMinutes = (analytics.studyMinutes || 0) + minutes;
    }
    await analytics.save();
    res.json({ message: 'Time logged', analytics });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get All Notes
router.get('/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save a New Note
router.post('/notes', auth, async (req, res) => {
  try {
    const { topics, important } = req.body;
    if (!topics) return res.status(400).json({ message: 'Topics are required' });

    const note = new Note({
      userId: req.user.id,
      date: new Date().toISOString().split('T')[0],
      topics,
      important: important || ''
    });
    await note.save();
    res.json(note);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get coding challenge progress synced to the user's account
router.get('/coding-progress', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('codingProgress');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const progress = user.codingProgress || {};
    res.json({
      days: progress.days ? Object.fromEntries(progress.days) : {},
      solvedProblems: progress.solvedProblems || [],
      dailyQuestions: progress.dailyQuestions || { dateKey: '', questions: [] }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save coding challenge progress so the same login sees it on every device
router.put('/coding-progress', auth, async (req, res) => {
  try {
    const { days = {}, solvedProblems = [], dailyQuestions = {} } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          codingProgress: {
            days,
            solvedProblems,
            dailyQuestions: {
              dateKey: dailyQuestions.dateKey || '',
              questions: Array.isArray(dailyQuestions.questions) ? dailyQuestions.questions : []
            }
          }
        }
      },
      { returnDocument: 'after' }
    ).select('codingProgress');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const progress = user.codingProgress || {};
    res.json({
      days: progress.days ? Object.fromEntries(progress.days) : {},
      solvedProblems: progress.solvedProblems || [],
      dailyQuestions: progress.dailyQuestions || { dateKey: '', questions: [] }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const normalizeCodingPlatforms = (platforms = []) => {
  if (!Array.isArray(platforms)) return [];

  return platforms
    .map((platform, index) => ({
      id: String(platform.id || Date.now() + index),
      name: String(platform.name || '').trim(),
      url: String(platform.url || '').trim()
    }))
    .filter(platform => platform.name && platform.url)
    .slice(0, 20);
};

// Get coding platform links synced to the user's account
router.get('/coding-platforms', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('codingPlatforms');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ platforms: user.codingPlatforms || [] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save coding platform links so the same login sees them on every device
router.put('/coding-platforms', auth, async (req, res) => {
  try {
    const platforms = normalizeCodingPlatforms(req.body.platforms);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { codingPlatforms: platforms } },
      { returnDocument: 'after' }
    ).select('codingPlatforms');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ platforms: user.codingPlatforms || [] });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

const normalizeCodingDashboard = (dashboard = {}) => ({
  profiles: Array.isArray(dashboard.profiles) ? dashboard.profiles.slice(0, 8) : [],
  goals: Array.isArray(dashboard.goals) ? dashboard.goals.slice(0, 20) : [],
  problemHistory: Array.isArray(dashboard.problemHistory) ? dashboard.problemHistory.slice(0, 500) : [],
  notificationPreferences: {
    upcomingContests: dashboard.notificationPreferences?.upcomingContests !== false,
    streakReminders: dashboard.notificationPreferences?.streakReminders !== false,
    goalCompletion: dashboard.notificationPreferences?.goalCompletion !== false,
    contestResults: dashboard.notificationPreferences?.contestResults === true
  },
  lastRefreshedAt: dashboard.lastRefreshedAt ? new Date(dashboard.lastRefreshedAt) : new Date()
});

router.get('/public-coding-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !userId.match(/^[a-f\d]{24}$/i)) {
      return res.status(400).json({ message: 'Invalid public profile link' });
    }

    const user = await User.findById(userId).select('name avatar codingDashboard');
    if (!user) return res.status(404).json({ message: 'Public profile not found' });

    const dashboard = normalizeCodingDashboard(user.codingDashboard || {});
    const publicProfiles = dashboard.profiles
      .filter((profile) => profile.connected)
      .map((profile) => ({
        platform: profile.platform,
        username: profile.username,
        url: profile.url,
        status: profile.status
      }));

    res.json({
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar
      },
      dashboard: {
        profiles: publicProfiles,
        goals: dashboard.goals,
        problemHistory: dashboard.problemHistory,
        lastRefreshedAt: dashboard.lastRefreshedAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Unable to load public profile' });
  }
});

// Get the richer coding tracker dashboard state.
router.get('/coding-dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('codingDashboard');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.codingDashboard || {});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Save the richer coding tracker dashboard state.
router.put('/coding-dashboard', auth, async (req, res) => {
  try {
    const dashboard = normalizeCodingDashboard(req.body || {});

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { codingDashboard: dashboard } },
      { returnDocument: 'after' }
    ).select('codingDashboard');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.codingDashboard || {});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/coding-stats/:platform/:username', auth, async (req, res) => {
  try {
    const platform = String(req.params.platform || '').toLowerCase();
    const username = String(req.params.username || '').trim();

    if (!/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) {
      return res.status(400).json({ message: 'Invalid username' });
    }

    const fetchers = {
      leetcode: fetchLeetCodeStats,
      geeksforgeeks: fetchGfgStats,
      codeforces: fetchCodeforcesStats,
      codechef: fetchCodeChefStats
    };

    if (!fetchers[platform]) {
      return res.status(400).json({ message: 'Unsupported coding platform' });
    }

    const timeZone = typeof req.query.timeZone === 'string' ? req.query.timeZone : undefined;
    const stats = await fetchers[platform](username, timeZone);
    res.json(stats);
  } catch (err) {
    res.status(502).json({
      message: err.message || 'Unable to fetch coding profile data right now.'
    });
  }
});

router.get('/coding-contests/upcoming', auth, async (req, res) => {
  try {
    const settled = await Promise.allSettled([
      fetchLeetCodeUpcomingContests(),
      fetchCodeforcesUpcomingContests(),
      fetchCodeChefUpcomingContests()
    ]);

    const contests = settled
      .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .filter((contest) => new Date(contest.start).getTime() > Date.now())
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 30);

    res.json({ contests });
  } catch (err) {
    res.status(502).json({ message: 'Unable to fetch upcoming contests right now.' });
  }
});

// Reset User Progress
router.delete('/reset', auth, async (req, res) => {
  try {
    await Analytics.deleteMany({ userId: req.user.id });
    await StudyPlan.deleteMany({ userId: req.user.id });
    await User.findByIdAndUpdate(req.user.id, { 
      $set: { xp: 0, level: 1, 'streak.count': 0 }
    });
    res.json({ message: 'Progress reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
