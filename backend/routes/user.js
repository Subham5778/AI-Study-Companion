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

const fetchLeetCodeStats = async (username) => {
  const endpoints = [
    `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/solved`,
    `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`
  ];

  let solvedData = null;
  for (const endpoint of endpoints) {
    try {
      const data = await requestPublicJson(endpoint);
      const solvedProblem = numberFrom(data.solvedProblem ?? data.totalSolved);
      if (solvedProblem !== null) {
        solvedData = {
          solvedProblem,
          easySolved: numberFrom(data.easySolved),
          mediumSolved: numberFrom(data.mediumSolved),
          hardSolved: numberFrom(data.hardSolved),
          globalRank: numberFrom(data.ranking ?? data.globalRank),
          acceptanceRate: numberFrom(data.acceptanceRate)
        };
        break;
      }
    } catch {
      // Try the next public LeetCode mirror.
    }
  }

  if (!solvedData) throw new Error('LeetCode stats are unavailable for this username.');

  try {
    const contest = await requestPublicJson(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/contest`);
    solvedData.currentRating = numberFrom(contest.contestRating ?? contest.userContestRanking?.rating);
    solvedData.highestRating = numberFrom(contest.contestRating ?? contest.userContestRanking?.rating);
    solvedData.contestCount = numberFrom(contest.contestAttend ?? contest.userContestRanking?.attendedContestsCount);
    solvedData.globalRank = solvedData.globalRank ?? numberFrom(contest.contestGlobalRanking ?? contest.userContestRanking?.globalRanking);
  } catch {
    // Solved counts are still useful when contest mirrors are down.
  }

  return { platform: 'leetcode', username, ...solvedData, source: 'Live' };
};

const fetchCodeforcesStats = async (username) => {
  const handle = encodeURIComponent(username);
  const info = await requestPublicJson(`https://codeforces.com/api/user.info?handles=${handle}`);
  if (info.status !== 'OK' || !info.result?.length) throw new Error('Codeforces handle was not found.');

  const userInfo = info.result[0];
  const submissions = await requestPublicJson(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`);
  if (submissions.status !== 'OK') throw new Error('Codeforces submissions are unavailable.');

  const accepted = new Map();
  let lastSubmission = null;
  submissions.result.forEach((submission) => {
    if (!lastSubmission || submission.creationTimeSeconds > lastSubmission.creationTimeSeconds) {
      lastSubmission = submission;
    }
    if (submission.verdict !== 'OK' || !submission.problem) return;
    const key = `${submission.problem.contestId || 'gym'}-${submission.problem.index}`;
    accepted.set(key, submission.problem);
  });

  const counts = { easySolved: 0, mediumSolved: 0, hardSolved: 0 };
  accepted.forEach((problem) => {
    counts[bucketByDifficulty(problem.rating)] += 1;
  });

  let contestCount = 0;
  let ratingChange = null;
  try {
    const rating = await requestPublicJson(`https://codeforces.com/api/user.rating?handle=${handle}`);
    if (rating.status === 'OK') {
      contestCount = rating.result.length;
      const last = rating.result.at(-1);
      if (last) ratingChange = last.newRating - last.oldRating;
    }
  } catch {
    // Rating history is optional.
  }

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
    source: 'Live'
  };
};

const fetchCodeChefStats = async (username) => {
  const handle = encodeURIComponent(username);
  try {
    const data = await requestPublicJson(`https://codechef-api.vercel.app/handle/${handle}`);
    if (data.success === false) throw new Error(data.message || 'CodeChef handle was not found.');

    return {
      platform: 'codechef',
      username,
      solvedProblem: numberFrom(data.totalSolved ?? data.fullySolved?.count),
      currentRating: numberFrom(data.currentRating),
      highestRating: numberFrom(data.highestRating),
      stars: String(data.stars || '').replace(/[^\d]/g, '') || null,
      globalRank: numberFrom(data.globalRank),
      countryRank: numberFrom(data.countryRank),
      contestCount: Array.isArray(data.ratingData) ? data.ratingData.length : null,
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
      source: 'Live'
    };
  }
};

const fetchGfgStats = async (username) => {
  const handle = encodeURIComponent(username);
  try {
    const data = await requestPublicJson(`https://geeks-for-geeks-api.vercel.app/${handle}`);
    const info = data.info || data;

    return {
      platform: 'geeksforgeeks',
      username,
      codingScore: numberFrom(info.codingScore ?? data.codingScore),
      solvedProblem: numberFrom(info.totalProblemsSolved ?? info.totalSolved ?? data.totalProblemsSolved),
      instituteRank: numberFrom(info.instituteRank ?? data.instituteRank),
      currentStreak: numberFrom(info.currentStreak ?? data.currentStreak),
      source: 'Live'
    };
  } catch {
    const html = await requestPublicHtml(`https://www.geeksforgeeks.org/user/${handle}`);
    const codingScore = numberFrom(textBetween(html, [/Coding Score[^0-9]*([0-9,]+)/i, /codingScore["':\s]+([0-9,]+)/i]));
    const solvedProblem = numberFrom(textBetween(html, [/Problem Solved[^0-9]*([0-9,]+)/i, /totalProblemsSolved["':\s]+([0-9,]+)/i]));
    if (codingScore === null && solvedProblem === null) throw new Error('GeeksforGeeks profile could not be parsed.');

    return {
      platform: 'geeksforgeeks',
      username,
      codingScore,
      solvedProblem,
      instituteRank: numberFrom(textBetween(html, [/Institute Rank[^0-9]*([0-9,]+)/i])),
      currentStreak: numberFrom(textBetween(html, [/Current Streak[^0-9]*([0-9,]+)/i])),
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

    const stats = await fetchers[platform](username);
    res.json(stats);
  } catch (err) {
    res.status(502).json({
      message: err.message || 'Unable to fetch coding profile data right now.'
    });
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
