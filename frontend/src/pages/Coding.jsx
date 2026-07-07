import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  Filter,
  Flame,
  GitCompare,
  Globe2,
  Link2,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  X
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import API from '../api/axios';
import { fetchPlatformStats, fetchUpcomingContests } from '../api/usePlatformStats';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'coding_tracker_dashboard';
const PLATFORMS = [
  { id: 'leetcode', name: 'LeetCode', accent: '#f59e0b', bg: 'from-amber-500/20 to-orange-500/5', host: 'leetcode.com' },
  { id: 'geeksforgeeks', name: 'GeeksforGeeks', accent: '#22c55e', bg: 'from-emerald-500/20 to-lime-500/5', host: 'geeksforgeeks.org' },
  { id: 'codeforces', name: 'Codeforces', accent: '#38bdf8', bg: 'from-sky-500/20 to-blue-500/5', host: 'codeforces.com' },
  { id: 'codechef', name: 'CodeChef', accent: '#c084fc', bg: 'from-fuchsia-500/20 to-purple-500/5', host: 'codechef.com' }
];

const defaultNotifications = {
  upcomingContests: true,
  streakReminders: true,
  goalCompletion: true,
  contestResults: false
};

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayKey = () => localDateKey();

const hashNumber = (value = '', min = 0, max = 100) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return min + (hash % (max - min + 1));
};

const platformById = (id) => PLATFORMS.find((platform) => platform.id === id) || PLATFORMS[0];

const emptyDashboard = () => ({
  profiles: PLATFORMS.map((platform) => ({ platform: platform.id, username: '', url: '', connected: false, status: 'Not connected' })),
  goals: [
    { id: 'goal-lc-100', title: 'Solve 100 LeetCode problems', platform: 'leetcode', current: 42, target: 100 },
    { id: 'goal-cf-1600', title: 'Reach Codeforces rating 1600', platform: 'codeforces', current: 1240, target: 1600 }
  ],
  problemHistory: [],
  notificationPreferences: defaultNotifications,
  lastRefreshedAt: null
});

const normalizeDashboard = (value = {}) => {
  const base = emptyDashboard();
  const profilesByPlatform = new Map(base.profiles.map((profile) => [profile.platform, profile]));

  (value.profiles || []).forEach((profile) => {
    if (!profile?.platform) return;
    profilesByPlatform.set(profile.platform, { ...profilesByPlatform.get(profile.platform), ...profile });
  });

  return {
    profiles: Array.from(profilesByPlatform.values()),
    goals: Array.isArray(value.goals) ? value.goals : base.goals,
    problemHistory: Array.isArray(value.problemHistory) ? value.problemHistory : base.problemHistory,
    notificationPreferences: { ...defaultNotifications, ...(value.notificationPreferences || {}) },
    lastRefreshedAt: value.lastRefreshedAt || null
  };
};

const usernameFromInput = (platformId, input = '') => {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    if (platformId === 'leetcode') return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
    if (platformId === 'geeksforgeeks') {
      if ((parts[0] === 'user' || parts[0] === 'profile') && parts[1]) return parts[1];
      return parts.at(-1) || '';
    }
    if (platformId === 'codechef') return parts[0] === 'users' ? parts[1] || '' : parts.at(-1) || '';
    if (platformId === 'codeforces') return parts[0] === 'profile' ? parts[1] || '' : parts.at(-1) || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }

  return trimmed.replace(/^@/, '');
};

const profileUrl = (platformId, username) => {
  if (!username) return '';
  if (platformId === 'leetcode') return `https://leetcode.com/u/${username}`;
  if (platformId === 'geeksforgeeks') return `https://www.geeksforgeeks.org/profile/${username}`;
  if (platformId === 'codeforces') return `https://codeforces.com/profile/${username}`;
  return `https://www.codechef.com/users/${username}`;
};

const buildStats = (profile, liveStats) => {
  const username = profile.username || profile.platform;
  const isDisconnected = !profile.connected;
  const isSyncing = profile.connected && liveStats === undefined;
  const isUnavailable = profile.connected && liveStats === null;

  if (isDisconnected || isSyncing || isUnavailable) {
    return {
      username: profile.username || 'Not connected',
      currentRating: null,
      highestRating: null,
      globalRank: null,
      countryRank: null,
      instituteRank: null,
      codingScore: null,
      solved: 0,
      easy: null,
      medium: null,
      hard: null,
      streak: null,
      lastSubmission: null,
      contestCount: null,
      ratingChange: null,
      rankLabel: null,
      maxRank: null,
      stars: null,
      source: isDisconnected ? 'Connect' : isSyncing ? 'Syncing' : 'Unavailable',
      available: false
    };
  }

  const solved = liveStats.solvedProblem ?? liveStats.totalSolved ?? 0;
  const easy = liveStats.easySolved ?? null;
  const medium = liveStats.mediumSolved ?? null;
  const hard = liveStats.hardSolved ?? null;
  const rating = liveStats.currentRating ?? liveStats.codingScore ?? null;
  const highest = liveStats.highestRating ?? rating;
  const rank = liveStats.globalRank ?? null;
  const contests = liveStats.contestCount ?? null;

  return {
    username: username || 'Not connected',
    currentRating: rating,
    highestRating: highest,
    globalRank: rank,
    countryRank: liveStats.countryRank ?? null,
    instituteRank: liveStats.instituteRank ?? null,
    codingScore: liveStats.codingScore ?? null,
    monthlyScore: liveStats.monthlyScore ?? null,
    solved,
    easy,
    medium,
    hard,
    streak: liveStats.currentStreak ?? liveStats.streak ?? null,
    lastSubmission: liveStats.lastSubmission ?? null,
    todayProblems: Array.isArray(liveStats.todayProblems) ? liveStats.todayProblems : [],
    activity: liveStats.activity || {},
    monthlySeries: Array.isArray(liveStats.monthlySeries) ? liveStats.monthlySeries : [],
    contestHistory: Array.isArray(liveStats.contestHistory) ? liveStats.contestHistory : [],
    contestCount: contests,
    ratingChange: liveStats.ratingChange ?? null,
    rankLabel: liveStats.rankLabel ?? null,
    maxRank: liveStats.maxRank ?? null,
    stars: liveStats.stars ?? null,
    source: liveStats.source || 'Live',
    available: true
  };
};

const generateActivity = (profiles, problemHistory, statsByPlatform = {}) => {
  const activity = [];
  for (let index = 119; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = localDateKey(date);
    const entry = { date: key, combined: 0 };

    PLATFORMS.forEach((platform) => {
      const fromHistory = problemHistory.filter((problem) => problem.platform === platform.id && problem.date === key).length;
      const fromLive = Number(statsByPlatform[platform.id]?.activity?.[key] || 0);
      entry[platform.id] = Math.max(fromHistory, fromLive);
      entry.combined += entry[platform.id];
    });

    activity.push(entry);
  }
  return activity;
};

const lastSixMonthKeys = () => Array.from({ length: 6 }, (_, index) => {
  const date = new Date();
  date.setMonth(date.getMonth() - (5 - index));
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
});

const combineMonthlySeries = (statsByPlatform = {}) => {
  const byMonth = new Map(lastSixMonthKeys().map((month) => [month, { month, solved: 0, contests: 0, rating: 0, ratingCount: 0 }]));

  Object.values(statsByPlatform).forEach((stats) => {
    (stats.monthlySeries || []).forEach((row) => {
      if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month, solved: 0, contests: 0, rating: 0, ratingCount: 0 });
      const target = byMonth.get(row.month);
      target.solved += Number(row.solved || 0);
      target.contests += Number(row.contests || 0);
      if (row.rating !== null && row.rating !== undefined) {
        target.rating += Number(row.rating || 0);
        target.ratingCount += 1;
      }
    });
  });

  return Array.from(byMonth.values()).map((row) => ({
    month: row.month,
    solved: row.solved,
    contests: row.contests,
    rating: row.ratingCount ? Math.round(row.rating / row.ratingCount) : 0
  }));
};

const formatDateTime = (date) => date.toLocaleString([], {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const countdown = (date) => {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Starting now';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

const Coding = () => {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}_${user?.id || user?._id || user?.email || 'guest'}`;
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [profileInputs, setProfileInputs] = useState({});
  const [liveStats, setLiveStats] = useState({});
  const [activeHeatmap, setActiveHeatmap] = useState('combined');
  const [contestFilter, setContestFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyPlatform, setHistoryPlatform] = useState('all');
  const [historyDifficulty, setHistoryDifficulty] = useState('all');
  const [theme, setTheme] = useState('dark');
  const [contests, setContests] = useState([]);
  const [contestsLoading, setContestsLoading] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', platform: 'leetcode', current: 0, target: 100 });
  const [newProblem, setNewProblem] = useState({
    platform: 'leetcode',
    name: '',
    difficulty: 'Medium',
    tags: '',
    status: 'Accepted',
    language: 'JavaScript',
    link: ''
  });

  const [refreshingPlatforms, setRefreshingPlatforms] = useState({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  // Compare friends state
  const [friendPlatform, setFriendPlatform] = useState('leetcode');
  const [friendUsername, setFriendUsername] = useState('');
  const [friendStats, setFriendStats] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    const localDashboard = saved ? normalizeDashboard(JSON.parse(saved)) : emptyDashboard();
    setDashboard(localDashboard);
    setProfileInputs(Object.fromEntries(localDashboard.profiles.map((profile) => [profile.platform, profile.username || profile.url || ''])));

    if (!user) return;
    API.get('/api/user/coding-dashboard')
      .then((res) => {
        const remote = normalizeDashboard(res.data || {});
        const next = normalizeDashboard({ ...localDashboard, ...remote });
        setDashboard(next);
        setProfileInputs(Object.fromEntries(next.profiles.map((profile) => [profile.platform, profile.username || profile.url || ''])));
        localStorage.setItem(storageKey, JSON.stringify(next));
      })
      .catch(() => {});
  }, [storageKey, user]);

  const persist = useCallback((next) => {
    setDashboard(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (user) {
      API.put('/api/user/coding-dashboard', next).catch(() => {});
    }
  }, [storageKey, user]);

  const refreshProfile = useCallback(async (profile) => {
    if (!profile.connected || !profile.username) return;
    setRefreshingPlatforms((current) => ({ ...current, [profile.platform]: true }));
    try {
      const stats = await fetchPlatformStats(profile.platform, profile.username);
      if (stats) setLiveStats((current) => ({ ...current, [profile.platform]: stats }));
    } catch {
      setLiveStats((current) => ({ ...current, [profile.platform]: null }));
    } finally {
      setRefreshingPlatforms((current) => ({ ...current, [profile.platform]: false }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshingAll(true);
    try {
      const promises = dashboard.profiles.map(refreshProfile);
      setContestsLoading(true);
      const contestsPromise = fetchUpcomingContests()
        .then(setContests)
        .catch(() => setContests([]))
        .finally(() => setContestsLoading(false));
      await Promise.all([...promises, contestsPromise]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingAll(false);
    }
    persist({ ...dashboard, lastRefreshedAt: new Date().toISOString() });
  }, [dashboard, persist, refreshProfile]);

  useEffect(() => {
    dashboard.profiles.forEach(refreshProfile);
  }, [dashboard.profiles, refreshProfile]);

  useEffect(() => {
    setContestsLoading(true);
    fetchUpcomingContests()
      .then(setContests)
      .catch(() => setContests([]))
      .finally(() => setContestsLoading(false));
  }, []);

  const statsByPlatform = useMemo(() => Object.fromEntries(
    dashboard.profiles.map((profile) => [profile.platform, buildStats(profile, liveStats[profile.platform])])
  ), [dashboard.profiles, liveStats]);

  const totals = useMemo(() => {
    const stats = Object.values(statsByPlatform).filter((item) => item.available);
    return {
      solved: stats.reduce((sum, item) => sum + item.solved, 0),
      contests: stats.reduce((sum, item) => sum + Number(item.contestCount || 0), 0),
      accepted: dashboard.problemHistory.filter((problem) => problem.status === 'Accepted').length + stats.reduce((sum, item) => sum + item.solved, 0),
      activeDays: generateActivity(dashboard.profiles, dashboard.problemHistory, statsByPlatform).filter((day) => day.combined > 0).length,
      streak: Math.max(...stats.map((item) => Number(item.streak || 0)), 0),
      longestStreak: Math.max(...stats.map((item) => Number(item.streak || 0) + hashNumber(`${item.username}:best`, 2, 18)), 0),
      average: (stats.reduce((sum, item) => sum + item.solved, 0) / 120).toFixed(1),
      score: Math.round(stats.reduce((sum, item) => sum + Number(item.currentRating || item.codingScore || 0), 0) / Math.max(stats.length, 1))
    };
  }, [dashboard.profiles, dashboard.problemHistory, statsByPlatform]);

  const chartData = useMemo(() => PLATFORMS.map((platform) => ({
    platform: platform.name,
    solved: statsByPlatform[platform.id]?.solved || 0,
    rating: statsByPlatform[platform.id]?.currentRating || 0,
    contests: statsByPlatform[platform.id]?.contestCount || 0
  })), [statsByPlatform]);

  const monthlyData = useMemo(() => combineMonthlySeries(statsByPlatform), [statsByPlatform]);
  const activity = useMemo(() => generateActivity(dashboard.profiles, dashboard.problemHistory, statsByPlatform), [dashboard.profiles, dashboard.problemHistory, statsByPlatform]);

  const upcomingContests = useMemo(() => {
    return contests
      .map((contest) => ({ ...contest, start: new Date(contest.start) }))
      .filter((contest) => contestFilter === 'all' || contest.platform === contestFilter);
  }, [contestFilter, contests]);

  const contestHistory = useMemo(() => Object.values(statsByPlatform)
    .flatMap((stats) => stats.contestHistory || [])
    .filter((row) => row.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30), [statsByPlatform]);

  const todayProblems = useMemo(() => {
    const fromHistory = dashboard.problemHistory.filter((problem) => problem.date === todayKey());
    const fromLive = Object.entries(statsByPlatform).flatMap(([platform, stats]) => (
      stats.todayProblems || []
    ).map((problem, index) => ({
      id: problem.id || `${platform}-live-${index}`,
      platform,
      name: problem.name || problem.title || 'Untitled problem',
      difficulty: problem.difficulty || 'N/A',
      time: problem.time || problem.submissionTime || 'N/A',
      status: problem.status || 'Accepted',
      language: problem.language || 'N/A',
      link: problem.link || `https://${platformById(platform).host}`
    })));
    return [...fromHistory, ...fromLive];
  }, [dashboard.problemHistory, statsByPlatform]);

  const filteredHistory = useMemo(() => dashboard.problemHistory.filter((problem) => {
    const matchesSearch = problem.name.toLowerCase().includes(historySearch.toLowerCase()) || problem.tags.toLowerCase().includes(historySearch.toLowerCase());
    const matchesPlatform = historyPlatform === 'all' || problem.platform === historyPlatform;
    const matchesDifficulty = historyDifficulty === 'all' || problem.difficulty === historyDifficulty;
    return matchesSearch && matchesPlatform && matchesDifficulty;
  }), [dashboard.problemHistory, historyDifficulty, historyPlatform, historySearch]);

  const connectProfile = (platformId) => {
    const username = usernameFromInput(platformId, profileInputs[platformId] || '');
    if (!/^[a-zA-Z0-9_.-]{2,40}$/.test(username)) {
      window.alert('Enter a valid username or profile link.');
      return;
    }

    const profiles = dashboard.profiles.map((profile) => profile.platform === platformId
      ? { ...profile, username, url: profileUrl(platformId, username), connected: true, status: 'Connected' }
      : profile);
    persist({ ...dashboard, profiles, lastRefreshedAt: new Date().toISOString() });
  };

  const removeProfile = (platformId) => {
    const profiles = dashboard.profiles.map((profile) => profile.platform === platformId
      ? { ...profile, username: '', url: '', connected: false, status: 'Not connected' }
      : profile);
    setProfileInputs((current) => ({ ...current, [platformId]: '' }));
    persist({ ...dashboard, profiles });
  };

  const addGoal = () => {
    if (!newGoal.title.trim() || Number(newGoal.target) <= 0) return;
    const goal = { ...newGoal, id: `goal-${Date.now()}`, current: Number(newGoal.current), target: Number(newGoal.target) };
    persist({ ...dashboard, goals: [goal, ...dashboard.goals] });
    setNewGoal({ title: '', platform: 'leetcode', current: 0, target: 100 });
  };

  const removeGoal = (goalId) => {
    persist({ ...dashboard, goals: dashboard.goals.filter((goal) => goal.id !== goalId) });
  };

  const addProblem = () => {
    if (!newProblem.name.trim()) return;
    const problem = {
      ...newProblem,
      id: `problem-${Date.now()}`,
      name: newProblem.name.trim(),
      tags: newProblem.tags.trim(),
      date: todayKey(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    persist({ ...dashboard, problemHistory: [problem, ...dashboard.problemHistory] });
    setNewProblem({ platform: 'leetcode', name: '', difficulty: 'Medium', tags: '', status: 'Accepted', language: 'JavaScript', link: '' });
  };

  const exportCsv = () => {
    const rows = [
      ['Platform', 'Problem', 'Difficulty', 'Tags', 'Date', 'Status', 'Language'],
      ...dashboard.problemHistory.map((problem) => [
        platformById(problem.platform).name,
        problem.name,
        problem.difficulty,
        problem.tags,
        problem.date,
        problem.status,
        problem.language
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'coding-tracker-history.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const pageClass = theme === 'dark'
    ? 'text-white'
    : 'text-neutral-950 [&_.glass-panel]:bg-white/90 [&_.glass-panel]:border-neutral-200 [&_.input-field]:bg-white [&_.input-field]:text-neutral-950 [&_.text-textMuted]:text-neutral-600 [&_.text-white]:text-neutral-950';

  return (
    <div className={`space-y-6 ${pageClass}`}>
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.26),transparent_34%),linear-gradient(135deg,rgba(23,23,23,0.96),rgba(10,10,10,0.92))] p-5 shadow-2xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
              <ShieldCheck size={14} /> Coding Tracker
            </div>
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">Competitive coding command center</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-textMuted">
              Connect LeetCode, GeeksforGeeks, Codeforces, and CodeChef, then track ratings, solved problems, contests, goals, reports, and daily activity from one responsive dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn-secondary inline-flex w-auto items-center gap-2 px-4">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button onClick={refreshAll} className="btn-primary inline-flex w-auto items-center gap-2 px-4" disabled={isRefreshingAll}>
              <RefreshCw size={16} className={isRefreshingAll ? 'animate-spin' : ''} /> Refresh Data
            </button>
            <button onClick={exportCsv} className="btn-secondary inline-flex w-auto items-center gap-2 px-4">
              <Download size={16} /> CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Code2} label="Total Problems" value={totals.solved.toLocaleString()} />
          <Metric icon={Trophy} label="Total Contests" value={totals.contests} />
          <Metric icon={TrendingUp} label="Overall Rating" value={totals.score} />
          <Metric icon={Flame} label="Current Streak" value={`${totals.streak} days`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {dashboard.profiles.map((profile) => (
          <ProfileConnector
            key={profile.platform}
            profile={profile}
            input={profileInputs[profile.platform] || ''}
            onInput={(value) => setProfileInputs((current) => ({ ...current, [profile.platform]: value }))}
            onConnect={() => connectProfile(profile.platform)}
            onRemove={() => removeProfile(profile.platform)}
            onRefresh={() => refreshProfile(profile)}
            isRefreshing={refreshingPlatforms[profile.platform]}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {dashboard.profiles.map((profile) => (
          <PlatformCard
            key={profile.platform}
            profile={profile}
            stats={statsByPlatform[profile.platform]}
            series={statsByPlatform[profile.platform]?.monthlySeries?.length ? statsByPlatform[profile.platform].monthlySeries : []}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ActivityHeatmap activity={activity} active={activeHeatmap} onActive={setActiveHeatmap} />
        <UpcomingContests contests={upcomingContests} filter={contestFilter} onFilter={setContestFilter} loading={contestsLoading} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AnalyticsCharts chartData={chartData} monthlyData={monthlyData} />
        <TodayProblems problems={todayProblems} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ProblemHistory
          problems={filteredHistory}
          search={historySearch}
          platform={historyPlatform}
          difficulty={historyDifficulty}
          onSearch={setHistorySearch}
          onPlatform={setHistoryPlatform}
          onDifficulty={setHistoryDifficulty}
          newProblem={newProblem}
          setNewProblem={setNewProblem}
          onAdd={addProblem}
        />
        <GoalTracker goals={dashboard.goals} newGoal={newGoal} setNewGoal={setNewGoal} onAdd={addGoal} onRemove={removeGoal} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ContestHistory rows={contestHistory} />
        <Notifications
          preferences={dashboard.notificationPreferences}
          onToggle={(key) => persist({
            ...dashboard,
            notificationPreferences: {
              ...dashboard.notificationPreferences,
              [key]: !dashboard.notificationPreferences[key]
            }
          })}
          totals={totals}
        />
      </section>

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <ActionTile icon={Share2} title="Public profile" text="Shareable portfolio-ready coding summary." onClick={() => setActiveModal('public_profile')} />
        <ActionTile icon={GitCompare} title="Compare friends" text="Search users and compare ratings, solved counts, and growth." onClick={() => setActiveModal('compare_friends')} />
        <ActionTile icon={Globe2} title="Weekly reports" text="Export PDF-ready weekly and monthly progress snapshots." onClick={() => setActiveModal('weekly_reports')} />
      </section>

      {activeModal === 'public_profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 shadow-2xl relative border border-white/10 bg-neutral-900/95 text-white">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-textMuted hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Share2 className="text-sky-300" /> Share Public Profile</h2>
            <p className="text-sm text-textMuted mb-4">
              Share your programming journey with friends, recruiters, and peers.
            </p>
            <div className="bg-black/40 border border-white/10 p-3 rounded-lg mb-4 flex items-center justify-between gap-3">
              <code className="text-xs text-emerald-400 select-all truncate break-all">
                {window.location.origin}/#/public/{user?._id || user?.id || 'user'}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/#/public/${user?._id || user?.id || 'user'}`);
                  alert('Link copied to clipboard!');
                }}
                className="btn-primary py-1.5 px-3 text-xs shrink-0"
              >
                Copy Link
              </button>
            </div>
            
            <div className="border border-white/10 rounded-xl bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-sky-200 uppercase tracking-wider mb-3">Profile Preview</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-textMuted block">Total Solved</span>
                  <strong className="text-lg">{totals.solved.toLocaleString()}</strong>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-textMuted block">Streak</span>
                  <strong className="text-lg">{totals.streak} days</strong>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-textMuted block">Contests Taken</span>
                  <strong className="text-lg">{totals.contests}</strong>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-textMuted block">Connected Platforms</span>
                  <strong className="text-lg">{dashboard.profiles.filter(p => p.connected).length} / 4</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'compare_friends' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl p-6 shadow-2xl relative border border-white/10 bg-neutral-900/95 text-white">
            <button onClick={() => { setActiveModal(null); setFriendStats(null); setFriendUsername(''); setCompareError(''); }} className="absolute top-4 right-4 text-textMuted hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><GitCompare className="text-sky-300" /> Compare with Friend</h2>
            
            <div className="grid gap-3 sm:grid-cols-3 items-end mb-4">
              <div>
                <label className="text-xs text-textMuted block mb-1">Platform</label>
                <select 
                  className="input-field w-full py-2 text-sm bg-neutral-800 text-white border border-white/10 rounded" 
                  value={friendPlatform} 
                  onChange={(e) => setFriendPlatform(e.target.value)}
                >
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-textMuted block mb-1">Friend's Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field min-w-0 flex-1 py-2 text-sm"
                    placeholder="Enter friend's username"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                  />
                  <button 
                    onClick={async () => {
                      if (!friendUsername) return;
                      setCompareLoading(true);
                      setCompareError('');
                      setFriendStats(null);
                      try {
                        const stats = await fetchPlatformStats(friendPlatform, friendUsername);
                        if (stats) {
                          setFriendStats(stats);
                        } else {
                          setCompareError('Could not find stats for this user.');
                        }
                      } catch {
                        setCompareError('Failed to fetch friend stats.');
                      } finally {
                        setCompareLoading(false);
                      }
                    }}
                    className="btn-primary py-2 px-4 text-sm"
                    disabled={compareLoading}
                  >
                    {compareLoading ? 'Fetching...' : 'Compare'}
                  </button>
                </div>
              </div>
            </div>

            {compareError && <p className="text-red-400 text-xs mb-4">{compareError}</p>}

            {friendStats && (
              <div className="mt-4 border border-white/10 rounded-xl bg-white/[0.02] p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-center" style={{ color: platformById(friendPlatform).accent }}>
                  {platformById(friendPlatform).name} Comparison
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-b border-white/10 pb-2 mb-2 font-semibold">
                  <div className="text-left text-textMuted">Metric</div>
                  <div>You ({dashboard.profiles.find(p => p.platform === friendPlatform)?.username || 'Not Connected'})</div>
                  <div>Friend ({friendUsername})</div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                    <div className="text-left text-textMuted">Solved</div>
                    <div>{buildStats(dashboard.profiles.find(p => p.platform === friendPlatform) || {}, liveStats[friendPlatform]).solved || 0}</div>
                    <div>{friendStats.solvedProblem || friendStats.solved || 0}</div>
                  </div>
                  
                  {friendPlatform !== 'geeksforgeeks' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                      <div className="text-left text-textMuted">Rating</div>
                      <div>{buildStats(dashboard.profiles.find(p => p.platform === friendPlatform) || {}, liveStats[friendPlatform]).currentRating || 'N/A'}</div>
                      <div>{friendStats.currentRating || 'N/A'}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                    <div className="text-left text-textMuted">Easy</div>
                    <div>{buildStats(dashboard.profiles.find(p => p.platform === friendPlatform) || {}, liveStats[friendPlatform]).easy ?? 'N/A'}</div>
                    <div>{friendStats.easySolved ?? friendStats.easy ?? 'N/A'}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                    <div className="text-left text-textMuted">Medium</div>
                    <div>{buildStats(dashboard.profiles.find(p => p.platform === friendPlatform) || {}, liveStats[friendPlatform]).medium ?? 'N/A'}</div>
                    <div>{friendStats.mediumSolved ?? friendStats.medium ?? 'N/A'}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                    <div className="text-left text-textMuted">Hard</div>
                    <div>{buildStats(dashboard.profiles.find(p => p.platform === friendPlatform) || {}, liveStats[friendPlatform]).hard ?? 'N/A'}</div>
                    <div>{friendStats.hardSolved ?? friendStats.hard ?? 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModal === 'weekly_reports' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-6 shadow-2xl relative border border-white/10 bg-neutral-900/95 text-white max-h-[90vh] overflow-y-auto">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-textMuted hover:text-white print:hidden">
              <X size={20} />
            </button>
            
            <div className="print-report">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2"><Globe2 className="text-sky-300" /> Weekly Coding Progress Snapshot</h2>
              <p className="text-xs text-textMuted mb-6">Generated on {new Date().toLocaleDateString()} for placement prep tracking</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Overall Performance</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm flex justify-between"><span>Total Solved:</span> <strong className="text-sky-300">{totals.solved}</strong></p>
                    <p className="text-sm flex justify-between"><span>Contests Logged:</span> <strong className="text-sky-300">{totals.contests}</strong></p>
                    <p className="text-sm flex justify-between"><span>Max Streak:</span> <strong className="text-sky-300">{totals.streak} days</strong></p>
                  </div>
                </div>
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider">Platform Breakdown</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    {dashboard.profiles.map(p => {
                      const stats = statsByPlatform[p.platform];
                      return (
                        <p key={p.platform} className="flex justify-between">
                          <span>{platformById(p.platform).name}:</span>
                          <strong>{stats?.solved || 0} solved</strong>
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Recent Activities & Milestones</h4>
                <div className="space-y-2 text-xs">
                  <p>✓ Tracked {todayProblems.length} solved problems today.</p>
                  <p>✓ Successfully sustained a {totals.streak}-day consistent practice streak.</p>
                  <p>✓ Contests rating score at {totals.score} average across sites.</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end print:hidden">
                <button onClick={() => window.print()} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-2">
                  <Download size={16} /> Print or Save PDF
                </button>
                <button onClick={() => setActiveModal(null)} className="btn-secondary py-2 px-4 text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
    <Icon size={18} className="mb-3 text-sky-300" />
    <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

const ProfileConnector = ({ profile, input, onInput, onConnect, onRemove, onRefresh, isRefreshing }) => {
  const platform = platformById(profile.platform);
  return (
    <div className={`glass-panel bg-gradient-to-br ${platform.bg} p-4`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: platform.accent }}>{platform.name}</p>
          <h2 className="mt-1 text-lg font-bold">{profile.connected ? profile.username : 'Connect profile'}</h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs ${profile.connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-textMuted'}`}>
          {profile.status}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          className="input-field min-w-0 flex-1 py-2 text-sm"
          placeholder={`${platform.name} username or link`}
          value={input}
          onChange={(event) => onInput(event.target.value)}
        />
        <button className="btn-primary inline-flex w-10 shrink-0 items-center justify-center px-0" onClick={onConnect} title={profile.connected ? 'Update' : 'Connect'}>
          <Link2 size={16} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={onRefresh} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-textMuted hover:bg-white/10" disabled={isRefreshing}>
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
        </button>
        {profile.connected && (
          <div className="flex gap-2">
            <a href={profile.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-textMuted hover:bg-white/10" title="Open profile">
              <ExternalLink size={14} />
            </a>
            <button onClick={onRemove} className="rounded-lg border border-white/10 p-2 text-textMuted hover:bg-red-500/15 hover:text-red-300" title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlatformCard = ({ profile, stats, series }) => {
  const platform = platformById(profile.platform);
  const gfgDifficultyUnavailable = profile.platform === 'geeksforgeeks'
    && stats.available
    && stats.easy === null
    && stats.medium === null
    && stats.hard === null;
  const rows = profile.platform === 'geeksforgeeks'
    ? [['Coding Score', stats.codingScore], ['Problems Solved', stats.solved], ['Institute Rank', stats.instituteRank ? `#${stats.instituteRank}` : null], ['Current Streak', stats.streak !== null ? `${stats.streak}d` : null], ['Monthly Score', stats.monthlyScore]]
    : profile.platform === 'codeforces'
      ? [['Current Rating', stats.currentRating], ['Max Rating', stats.highestRating], ['Rank', stats.rankLabel], ['Max Rank', stats.maxRank], ['Contest Count', stats.contestCount], ['Rating Change', stats.ratingChange]]
      : profile.platform === 'codechef'
        ? [['Current Rating', stats.currentRating], ['Highest Rating', stats.highestRating], ['Star Rating', stats.stars ? `${stats.stars} star` : null], ['Global Rank', stats.globalRank ? `#${stats.globalRank}` : null], ['Country Rank', stats.countryRank ? `#${stats.countryRank}` : null], ['Contest Count', stats.contestCount]]
        : [['Contest Rating', stats.currentRating], ['Highest Rating', stats.highestRating], ['Global Rank', stats.globalRank ? `#${stats.globalRank}` : null], ['Current Streak', stats.streak ? `${stats.streak}d` : null], ['Last Submission', stats.lastSubmission]];

  return (
    <article className="glass-panel flex min-h-[340px] flex-col p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: platform.accent }}>{platform.name}</p>
          <h3 className="mt-1 text-xl font-bold">{stats.username}</h3>
        </div>
        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-textMuted">{stats.source}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Solved" value={stats.solved} />
        <MiniStat label="Easy" value={stats.easy} />
        <MiniStat label="Medium" value={stats.medium} />
        <MiniStat label="Hard" value={stats.hard} />
      </div>
      {gfgDifficultyUnavailable && (
        <p className="mt-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          GFG public profile exposes total solved, score, rank, and streak, but not a reliable Easy/Medium/Hard split for this profile.
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
            <span className="text-textMuted">{label}</span>
            <strong>{formatStat(value)}</strong>
          </div>
        ))}
      </div>
      <div className="mt-auto h-24 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <Area type="monotone" dataKey="rating" stroke={platform.accent} fill={platform.accent} fillOpacity={0.18} strokeWidth={2} />
            <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

const MiniStat = ({ label, value }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-center">
    <p className="text-[11px] text-textMuted">{label}</p>
    <p className="text-lg font-bold">{formatStat(value)}</p>
  </div>
);

const formatStat = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return value;
};

const ActivityHeatmap = ({ activity, active, onActive }) => {
  const tabs = [{ id: 'combined', name: 'Combined' }, ...PLATFORMS.map((platform) => ({ id: platform.id, name: platform.name }))];
  const activeTotal = activity.reduce((sum, day) => sum + Number(day[active] || 0), 0);
  const maxCount = Math.max(...activity.map((day) => Number(day[active] || 0)), 1);
  const supportsLiveActivity = active === 'combined' || active === 'leetcode' || active === 'codeforces' || activeTotal > 0;

  const platformContributions = useMemo(() => {
    return PLATFORMS.map(platform => {
      const total = activity.reduce((sum, day) => sum + Number(day[platform.id] || 0), 0);
      return { ...platform, total };
    });
  }, [activity]);

  const cellColor = (count) => {
    if (count <= 0) return 'rgba(255,255,255,0.06)';
    if (count === 1) return 'rgba(34,197,94,0.34)';
    if (count === 2) return 'rgba(34,197,94,0.52)';
    if (count <= 4) return 'rgba(34,197,94,0.74)';
    return 'rgba(34,197,94,0.98)';
  };

  return (
    <div className="glass-panel p-5 flex flex-col h-full justify-between gap-4">
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><Activity size={20} className="text-sky-300" /> Activity Heatmap</h2>
            <p className="mt-1 text-xs text-textMuted">
              {activeTotal} accepted submissions in the last 120 days
              {!supportsLiveActivity ? ' • this platform depends on manual history because public daily activity is not exposed reliably' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => onActive(tab.id)} className={`rounded-lg px-3 py-1.5 text-xs ${active === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-textMuted hover:bg-white/10'}`}>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
          {activity.map((day) => {
            const count = day[active] || 0;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${count} accepted submission${count === 1 ? '' : 's'}`}
                className="h-4 w-4 shrink-0 rounded-[4px] border border-white/5"
                style={{ backgroundColor: cellColor(count) }}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-textMuted">
          <span>Oldest to newest, grouped by week</span>
          <div className="flex items-center gap-2">
            <span>Less</span>
            {[0, 1, 2, Math.min(4, maxCount), Math.max(5, maxCount)].map((count, index) => (
              <span key={`${count}-${index}`} className="h-3 w-3 rounded-[3px] border border-white/5" style={{ backgroundColor: cellColor(count) }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-textMuted mb-3">120-Day Platform Contribution Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {platformContributions.map(pc => (
            <div key={pc.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] text-textMuted uppercase tracking-wider">{pc.name}</span>
              <strong className="text-base font-bold mt-1" style={{ color: pc.accent }}>{pc.total} <span className="text-xs font-normal text-textMuted">solved</span></strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UpcomingContests = ({ contests, filter, onFilter, loading }) => (
  <div className="glass-panel p-5">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarClock size={20} className="text-amber-300" /> Upcoming Contests</h2>
      <select className="input-field w-auto py-2 text-sm" value={filter} onChange={(event) => onFilter(event.target.value)}>
        <option value="all">All Platforms</option>
        {PLATFORMS.filter((platform) => platform.id !== 'geeksforgeeks').map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
      </select>
    </div>
    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-textMuted">
          Fetching upcoming contests...
        </div>
      )}
      {!loading && contests.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-textMuted">
          No upcoming contests are available for this platform right now.
        </div>
      )}
      {contests.map((contest) => (
        <a key={`${contest.platform}-${contest.name}`} href={contest.link} target="_blank" rel="noreferrer" className={`block rounded-xl border p-3 transition hover:bg-white/5 ${contest.urgent ? 'border-amber-400/40 bg-amber-400/10' : 'border-white/10 bg-white/[0.03]'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: platformById(contest.platform).accent }}>{platformById(contest.platform).name}</p>
              <h3 className="mt-1 font-semibold">{contest.name}</h3>
              <p className="mt-1 text-xs text-textMuted">{formatDateTime(contest.start)} local time • {contest.duration}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{countdown(contest.start)}</span>
          </div>
        </a>
      ))}
    </div>
  </div>
);

const TodayProblems = ({ problems }) => (
  <div className="glass-panel p-5">
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><CheckCircle2 size={20} className="text-emerald-300" /> Daily Solved Problems</h2>
    <div className="grid gap-4 md:grid-cols-2">
      {PLATFORMS.map((platform) => {
        const rows = problems.filter((problem) => problem.platform === platform.id);
        return (
          <div key={platform.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <h3 className="mb-3 font-semibold" style={{ color: platform.accent }}>Today's {platform.name}</h3>
            {rows.length === 0 ? <p className="text-sm text-textMuted">No accepted submissions tracked today.</p> : rows.map((problem) => (
              <a key={problem.id} href={problem.link || '#'} target="_blank" rel="noreferrer" className="mb-2 block rounded-lg bg-black/20 p-3 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{problem.name}</strong>
                  <span className="text-xs text-emerald-300">{problem.status}</span>
                </div>
                <p className="mt-1 text-xs text-textMuted">{problem.difficulty} • {problem.time} • {problem.language}</p>
              </a>
            ))}
          </div>
        );
      })}
    </div>
  </div>
);

const AnalyticsCharts = ({ chartData, monthlyData }) => (
  <div className="glass-panel p-5">
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><BarChart3 size={20} className="text-violet-300" /> Rating Analytics</h2>
    <div className="grid gap-4 md:grid-cols-2">
      <ChartPanel title="Platform Comparison">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="platform" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
          <Bar dataKey="solved" radius={[6, 6, 0, 0]}>{chartData.map((entry, index) => <Cell key={entry.platform} fill={PLATFORMS[index].accent} />)}</Bar>
        </BarChart>
      </ChartPanel>
      <ChartPanel title="Monthly Growth">
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="month" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
          <Line type="monotone" dataKey="rating" stroke="#38bdf8" strokeWidth={2} />
          <Line type="monotone" dataKey="solved" stroke="#22c55e" strokeWidth={2} />
        </LineChart>
      </ChartPanel>
      <ChartPanel title="Difficulty Distribution">
        <PieChart>
          <Pie data={[{ name: 'Easy', value: 45 }, { name: 'Medium', value: 39 }, { name: 'Hard', value: 16 }]} dataKey="value" innerRadius={42} outerRadius={72}>
            {['#22c55e', '#f59e0b', '#ef4444'].map((color) => <Cell key={color} fill={color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
        </PieChart>
      </ChartPanel>
      <ChartPanel title="Contest Frequency">
        <AreaChart data={monthlyData}>
          <Area type="monotone" dataKey="contests" stroke="#c084fc" fill="#c084fc" fillOpacity={0.2} />
          <XAxis dataKey="month" tick={{ fill: '#a3a3a3', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} />
        </AreaChart>
      </ChartPanel>
    </div>
  </div>
);

const ChartPanel = ({ title, children }) => (
  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
    <h3 className="mb-2 text-sm font-semibold text-textMuted">{title}</h3>
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  </div>
);

const ProblemHistory = ({ problems, search, platform, difficulty, onSearch, onPlatform, onDifficulty, newProblem, setNewProblem, onAdd }) => (
  <div className="glass-panel p-5">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Search size={20} className="text-sky-300" /> Problem History</h2>
      <div className="flex flex-wrap gap-2">
        <input className="input-field w-48 py-2 text-sm" placeholder="Search name or tags" value={search} onChange={(event) => onSearch(event.target.value)} />
        <select className="input-field w-auto py-2 text-sm" value={platform} onChange={(event) => onPlatform(event.target.value)}>
          <option value="all">All Platforms</option>
          {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="input-field w-auto py-2 text-sm" value={difficulty} onChange={(event) => onDifficulty(event.target.value)}>
          <option value="all">All Difficulty</option>
          {['Easy', 'Medium', 'Hard', 'A', 'B', 'C'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
    </div>
    <div className="mb-4 grid gap-2 md:grid-cols-6">
      <select className="input-field py-2 text-sm" value={newProblem.platform} onChange={(event) => setNewProblem({ ...newProblem, platform: event.target.value })}>
        {PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <input className="input-field py-2 text-sm md:col-span-2" placeholder="Problem name" value={newProblem.name} onChange={(event) => setNewProblem({ ...newProblem, name: event.target.value })} />
      <input className="input-field py-2 text-sm" placeholder="Tags" value={newProblem.tags} onChange={(event) => setNewProblem({ ...newProblem, tags: event.target.value })} />
      <input className="input-field py-2 text-sm" placeholder="Link" value={newProblem.link} onChange={(event) => setNewProblem({ ...newProblem, link: event.target.value })} />
      <button onClick={onAdd} className="btn-primary inline-flex items-center justify-center gap-2 py-2 text-sm"><Plus size={15} /> Add</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-textMuted">
          <tr><th className="py-2">Platform</th><th>Problem</th><th>Difficulty</th><th>Tags</th><th>Date</th><th>Status</th><th>Language</th></tr>
        </thead>
        <tbody>
          {problems.length === 0 ? (
            <tr><td colSpan="7" className="py-8 text-center text-textMuted">Add solved problems to build a searchable history.</td></tr>
          ) : problems.map((problem) => (
            <tr key={problem.id} className="border-t border-white/10">
              <td className="py-3" style={{ color: platformById(problem.platform).accent }}>{platformById(problem.platform).name}</td>
              <td><a href={problem.link || '#'} target="_blank" rel="noreferrer" className="font-medium hover:underline">{problem.name}</a></td>
              <td>{problem.difficulty}</td><td className="text-textMuted">{problem.tags}</td><td>{problem.date}</td><td className="text-emerald-300">{problem.status}</td><td>{problem.language}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const GoalTracker = ({ goals, newGoal, setNewGoal, onAdd, onRemove }) => (
  <div className="glass-panel p-5">
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Target size={20} className="text-emerald-300" /> Goal Tracker</h2>
    <div className="mb-4 grid gap-2">
      <input className="input-field py-2 text-sm" placeholder="Reach Codeforces rating 1600" value={newGoal.title} onChange={(event) => setNewGoal({ ...newGoal, title: event.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <select className="input-field py-2 text-sm" value={newGoal.platform} onChange={(event) => setNewGoal({ ...newGoal, platform: event.target.value })}>
          {PLATFORMS.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
        </select>
        <input className="input-field py-2 text-sm" type="number" value={newGoal.current} onChange={(event) => setNewGoal({ ...newGoal, current: event.target.value })} />
        <input className="input-field py-2 text-sm" type="number" value={newGoal.target} onChange={(event) => setNewGoal({ ...newGoal, target: event.target.value })} />
      </div>
      <button onClick={onAdd} className="btn-primary inline-flex items-center justify-center gap-2 py-2 text-sm"><Plus size={15} /> Add Goal</button>
    </div>
    <div className="space-y-3">
      {goals.map((goal) => {
        const percent = Math.min(100, Math.round((Number(goal.current) / Math.max(Number(goal.target), 1)) * 100));
        return (
          <div key={goal.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{goal.title}</h3>
                <p className="text-xs text-textMuted">{platformById(goal.platform).name} • {goal.current}/{goal.target}</p>
              </div>
              <button onClick={() => onRemove(goal.id)} className="rounded-lg p-1 text-textMuted hover:bg-red-500/15 hover:text-red-300"><X size={15} /></button>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-right text-xs text-textMuted">{percent}% complete</p>
          </div>
        );
      })}
    </div>
  </div>
);

const ContestHistory = ({ rows }) => (
  <div className="glass-panel p-5">
    <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Award size={20} className="text-amber-300" /> Contest History</h2>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-textMuted">
          <tr><th className="py-2">Platform</th><th>Contest</th><th>Date</th><th>Rank</th><th>Old</th><th>New</th><th>Change</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="7" className="py-8 text-center text-textMuted">Contest history appears after connected platforms return rating history.</td></tr>
          ) : rows.map((row) => (
            <tr key={`${row.platform}-${row.contest}`} className="border-t border-white/10">
              <td className="py-3" style={{ color: platformById(row.platform).accent }}>{platformById(row.platform).name}</td>
              <td>{row.contest}</td><td>{row.date}</td><td>#{row.rank}</td><td>{row.oldRating}</td><td>{row.newRating}</td>
              <td className={row.change >= 0 ? 'text-emerald-300' : 'text-red-300'}>{row.change >= 0 ? '+' : ''}{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Notifications = ({ preferences, onToggle, totals }) => {
  const items = [
    ['upcomingContests', 'Upcoming contests', 'Remind before contests begin.'],
    ['streakReminders', 'Daily streak reminders', 'Nudge when no problem is solved.'],
    ['goalCompletion', 'Goal completion', 'Celebrate progress milestones.'],
    ['contestResults', 'New contest results', 'Notify when rating changes land.']
  ];

  return (
    <div className="glass-panel p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Bell size={20} className="text-sky-300" /> Notifications</h2>
      <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm">
        <strong>{totals.accepted.toLocaleString()}</strong> accepted submissions tracked across connected profiles.
      </div>
      <div className="space-y-3">
        {items.map(([key, title, text]) => (
          <button key={key} onClick={() => onToggle(key)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]">
            <span><strong className="block">{title}</strong><span className="text-xs text-textMuted">{text}</span></span>
            <span className={`h-6 w-11 rounded-full p-1 transition ${preferences[key] ? 'bg-primary' : 'bg-white/15'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${preferences[key] ? 'translate-x-5' : ''}`} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ActionTile = ({ icon: Icon, title, text, onClick }) => (
  <button onClick={onClick} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full">
    <Icon size={20} className="mb-3 text-sky-300" />
    <h3 className="font-semibold text-white">{title}</h3>
    <p className="mt-1 text-sm text-textMuted">{text}</p>
  </button>
);

export default Coding;
