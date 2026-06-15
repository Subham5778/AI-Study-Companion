import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Flame, Target, BookOpen, BrainCircuit, Rocket, Briefcase, RefreshCw, ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const motivationQuotes = [
  "Consistency is the key to success. Keep learning and growing every single day!",
  "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.",
  "Great things are done by a series of small things brought together.",
  "The secret of getting ahead is getting started.",
  "Your focus determines your reality. Stay focused on your goals.",
  "Mastery is not a destination, it is a continuous journey of learning."
];

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(motivationQuotes[0]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [todayPlan, setTodayPlan] = useState([]);
  const [newTaskTopic, setNewTaskTopic] = useState("");
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [todayCodingCount, setTodayCodingCount] = useState(0);
  const [codingStreak, setCodingStreak] = useState(0);
  const [aiInsight, setAiInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [chartData, setChartData] = useState([
    { name: 'Mon', hours: 0 },
    { name: 'Tue', hours: 0 },
    { name: 'Wed', hours: 0 },
    { name: 'Thu', hours: 0 },
    { name: 'Fri', hours: 0 },
    { name: 'Sat', hours: 0 },
    { name: 'Sun', hours: 0 },
  ]);

  const fetchData = useCallback(async () => {
    setStatsLoading(true);
    try {
        const [analyticsRes, planRes] = await Promise.all([
          API.get('/api/user/analytics').catch(() => ({ data: [] })),
          API.get('/api/plan/daily').catch(() => ({ data: [] }))
        ]);
        
        const analytics = analyticsRes.data || [];
        const plan = planRes.data || [];
        
        setTodayPlan(plan);
        setAnalyticsData(analytics);
        
        let tasks = 0;
        let mins = 0;
        analytics.forEach(a => {
           tasks += a.tasksCompleted || 0;
           mins += a.studyMinutes || 0;
        });
        setTotalTasks(tasks);
        setTotalHours((mins / 60).toFixed(1));
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const orderedChartData = [];
        const todayDate = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayDate);
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split('T')[0];
            const record = analytics.find(a => a.date === dateString);
            const dayName = days[d.getDay()];
            
            orderedChartData.push({
                name: dayName,
                hours: record ? +(record.studyMinutes / 60).toFixed(1) : 0
            });
        }
        setChartData(orderedChartData);

        // Fetch AI Insights using real data
        try {
          setInsightLoading(true);
          const insightRes = await API.post(
            '/api/ai/generate-insights',
            { analytics, todayPlan: plan, userName: user?.name }
          );
          setAiInsight(insightRes.data.insight);
        } catch (e) {
          setAiInsight('Keep studying consistently — every session brings you closer to your dream company!');
        } finally {
          setInsightLoading(false);
        }

      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setStatsLoading(false);
      }
  }, [user]);

  useEffect(() => {
    fetchData();
    setQuote(motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)]);

    // Load coding streak details
    try {
      const raw = localStorage.getItem('codestreak_data');
      if (raw) {
        const data = JSON.parse(raw);
        const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        setTodayCodingCount(data.days?.[todayKey] || 0);
        
        let streak = 0;
        let checkDate = new Date();
        if (!data.days?.[todayKey] || data.days[todayKey] === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (true) {
          const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          if (data.days?.[key] && data.days[key] >= 5) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        setCodingStreak(streak);
      }
    } catch (e) {
      console.error('Failed to load coding streak stats in Dashboard:', e);
    }
  }, [fetchData]);

  const handleToggleTask = async (id, currentStatus) => {
     try {
         const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
         await API.patch(`/api/plan/task/${id}`, { status: newStatus });
         
         setTodayPlan(prev => prev.map(p => p._id === id ? { ...p, status: newStatus } : p));
         
         if (newStatus === 'completed') {
             setTotalTasks(prev => prev + 1);
             await refreshUser(); // Sync XP and level in sidebar
         } else {
             setTotalTasks(prev => Math.max(0, prev - 1));
         }
     } catch(err) {
         console.error("Failed to update task", err);
     }
  };

  const handleAddTask = async () => {
     if (!newTaskTopic.trim()) return;
     try {
         const res = await API.post('/api/plan/task', { topic: newTaskTopic });
         setTodayPlan(prev => [...prev, res.data]);
         setNewTaskTopic("");
     } catch (err) {
         console.error("Failed to add task", err);
     }
  };

  return (
    <div className="animate-fade-in pb-10">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Welcome back, {user?.name?.split(' ')[0] || 'Scholar'} 👋
          </h1>
          <p className="text-textMuted">Let's crush your placement goals today.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/focus')}>
          Start Focus Session
        </button>
      </header>

      {/* Motivational Banner */}
      <div className="relative overflow-hidden glass-panel p-6 mb-8 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent border border-white/5 shadow-highlight">
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <Briefcase size={120} />
         </div>
         <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10 w-full">
             <div className="flex-1">
                 <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2 flex items-center gap-2">
                    <Rocket size={14} /> Destination: Dream Company
                 </div>
                 <h2 className="text-lg md:text-xl font-medium text-white italic">"{quote}"</h2>
             </div>
             
             <div className="flex items-center flex-wrap gap-4 text-textMuted font-bold text-lg opacity-80 md:pl-8 md:border-l border-white/10">
                 <span className="hover:text-blue-400 hover:scale-110 transition-all cursor-default drop-shadow-md">Google</span>
                 <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden md:block"></span>
                 <span className="hover:text-blue-500 hover:scale-110 transition-all cursor-default drop-shadow-md">Microsoft</span>
                 <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden md:block"></span>
                 <span className="hover:text-amber-500 hover:scale-110 transition-all cursor-default drop-shadow-md">Amazon</span>
                 <span className="w-1.5 h-1.5 rounded-full bg-white/20 hidden md:block"></span>
                 <span className="hover:text-yellow-400 hover:scale-110 transition-all cursor-default drop-shadow-md">Rippling</span>
             </div>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-textMuted">Your real-time progress</p>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
                if (window.confirm('Are you sure you want to reset all your progress? This cannot be undone.')) {
                    try {
                        await API.delete('/api/user/reset');
                        await fetchData();
                        await refreshUser();
                    } catch(err) {
                        console.error('Failed to reset progress', err);
                    }
                }
            }}
            className="flex items-center gap-1.5 text-xs text-danger hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            title="Restart Progress"
          >
            Restart
          </button>
          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 text-xs text-textMuted hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            title="Refresh stats"
          >
            <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Flame} label="Current Streak" value={`${user?.streak?.count || 0} Days`} color="text-warning" />
        <StatCard icon={Target} label="Tasks Completed" value={totalTasks.toString()} color="text-success" />
        <StatCard icon={BookOpen} label="Total Study Hours" value={`${totalHours}h`} color="text-primary" />
        <StatCard icon={Activity} label="XP Points" value={`${user?.xp || 0} XP`} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Weekly Activity</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#525252" tick={{fill: '#a3a3a3'}} />
                <YAxis stroke="#525252" tick={{fill: '#a3a3a3'}} ticks={[0, 6, 12, 18, 24]} domain={[0, 24]} />
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Tasks & AI Insights */}
        <div className="space-y-8">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-white mb-4">Today's Plan</h2>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newTaskTopic}
                onChange={(e) => setNewTaskTopic(e.target.value)}
                placeholder="Add a new task..." 
                className="input-field flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
              />
              <button 
                className="btn-primary py-2 px-4" 
                onClick={handleAddTask}
                disabled={!newTaskTopic.trim()}
              >
                Add
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {todayPlan.length === 0 ? (
                 <p className="text-sm text-textMuted italic">No tasks scheduled for today. Generate a new timetable!</p>
              ) : (
                todayPlan.map(task => (
                  <TaskItem 
                     key={task._id}
                     topic={task.topic} 
                     time={task.difficulty === 'Easy' ? '30 mins' : task.difficulty === 'Medium' ? '1 hour' : '2 hours'} 
                     completed={task.status === 'completed'} 
                     onClick={() => handleToggleTask(task._id, task.status)}
                  />
                ))
              )}
            </div>
            <button className="w-full text-center text-primary text-sm font-medium mt-4 hover:underline">
              View Full Plan
            </button>
          </div>

          <div className="glass-panel p-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="text-primary" size={24} />
              <h2 className="text-xl font-bold text-white">AI Insights</h2>
            </div>
            {insightLoading ? (
              <div className="flex items-center gap-3 text-textMuted text-sm">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                Analyzing your study patterns...
              </div>
            ) : (
              <p className="text-sm text-textMuted leading-relaxed italic">"{aiInsight}"</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
         <CodingPlatformSlider />
         <div className="lg:col-span-2">
            <DailyCodingStatus count={todayCodingCount} streak={codingStreak} />
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="glass-panel p-6 flex items-start justify-between group hover:border-white/20 transition-all">
    <div>
      <p className="text-textMuted text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
  </div>
);

const TaskItem = ({ topic, time, completed, onClick }) => (
  <div 
     className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:border-white/20 transition-colors"
     onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${completed ? 'bg-primary border-primary' : 'border-textMuted'}`}>
        {completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <div>
        <p className={`text-sm font-medium ${completed ? 'line-through text-textMuted' : 'text-white'}`}>{topic}</p>
        <p className="text-xs text-textMuted">{time}</p>
      </div>
    </div>
  </div>
);

const DailyCodingStatus = ({ count, streak }) => {
  const navigate = useNavigate();
  const pct = Math.min((count / 5) * 100, 100);
  
  return (
    <div className="glass-panel p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="text-warning animate-pulse" size={22} />
            Daily Coding Goal
          </h2>
          <span className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded-md">{streak} Day Streak</span>
        </div>
        
        <p className="text-sm text-textMuted mb-6 leading-relaxed">
          Solve 5 coding problems today to keep your streak alive! You've completed <span className="text-white font-bold">{count}/5</span> problems today.
        </p>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-xs font-semibold">
            <span className={pct >= 100 ? 'text-success' : 'text-primary'}>
              {pct >= 100 ? 'Goal Crushed! 🎉' : `${Math.round(pct)}% Completed`}
            </span>
            <span className="text-textMuted">5 Problems Goal</span>
          </div>
          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-primary'}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
        </div>
      </div>

      <button 
        onClick={() => navigate('/coding')} 
        className="w-full text-center text-sm font-semibold text-primary hover:text-white bg-primary/10 hover:bg-primary/20 py-2.5 rounded-xl transition-all border border-primary/20 hover:border-primary/40"
      >
        Track Daily Challenge Notes & Heatmap →
      </button>
    </div>
  );
};

const PLATFORM_COLORS = {
  leetcode: { bg: 'bg-[#FFA116]/10', border: 'border-[#FFA116]/30', accent: '#FFA116', label: 'LeetCode' },
  hackerrank: { bg: 'bg-[#00EA64]/10', border: 'border-[#00EA64]/30', accent: '#00EA64', label: 'HackerRank' },
  codeforces: { bg: 'bg-[#1F8ACB]/10', border: 'border-[#1F8ACB]/30', accent: '#1F8ACB', label: 'Codeforces' },
  codechef: { bg: 'bg-[#7B4F2E]/10', border: 'border-[#7B4F2E]/30', accent: '#c8a876', label: 'CodeChef' },
  geeksforgeeks: { bg: 'bg-[#2F8D46]/10', border: 'border-[#2F8D46]/30', accent: '#2F8D46', label: 'GFG' },
  default: { bg: 'bg-primary/10', border: 'border-primary/30', accent: '#3b82f6', label: 'Platform' },
};

const getPlatformKey = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('leetcode')) return 'leetcode';
  if (n.includes('hackerrank')) return 'hackerrank';
  if (n.includes('codeforces')) return 'codeforces';
  if (n.includes('codechef')) return 'codechef';
  if (n.includes('geeks') || n.includes('gfg')) return 'geeksforgeeks';
  return 'default';
};

const extractLeetcodeUsername = (url = '') => {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'u' && parts[1]) return parts[1];
    if (parts[0]) return parts[0];
  } catch {}
  return null;
};

const LeetCodeStatsBadge = ({ url }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const username = extractLeetcodeUsername(url);

  useEffect(() => {
    if (!username) { setLoading(false); return; }
    setLoading(true);
    fetch(`https://alfa-leetcode-api.onrender.com/${username}/solved`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[#FFA116]/30 border-t-[#FFA116] rounded-full animate-spin" /></div>;
  if (!stats || !stats.solvedProblem) return <p className="text-xs text-textMuted text-center py-2">Stats unavailable</p>;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-end justify-between bg-black/30 p-3 rounded-xl border border-white/5">
        <span className="text-textMuted text-xs">Total Solved</span>
        <span className="text-2xl font-bold text-white">{stats.solvedProblem}</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center">
          <span className="text-[10px] text-[#00b8a3]">Easy</span>
          <span className="text-base font-bold text-white">{stats.easySolved}</span>
        </div>
        <div className="flex-1 bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center">
          <span className="text-[10px] text-[#ffc01e]">Med</span>
          <span className="text-base font-bold text-white">{stats.mediumSolved}</span>
        </div>
        <div className="flex-1 bg-black/30 p-2 rounded-xl border border-white/5 flex flex-col items-center">
          <span className="text-[10px] text-[#ef4743]">Hard</span>
          <span className="text-base font-bold text-white">{stats.hardSolved}</span>
        </div>
      </div>
    </div>
  );
};

const CodingPlatformSlider = () => {
  const [platforms, setPlatforms] = useState(() => {
    const saved = localStorage.getItem('coding_platforms');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'LeetCode', url: 'https://leetcode.com/u/Subham57/' }
    ];
  });
  const [current, setCurrent] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const save = (updated) => {
    setPlatforms(updated);
    localStorage.setItem('coding_platforms', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const updated = [...platforms, { id: Date.now(), name: newName.trim(), url: newUrl.trim() }];
    save(updated);
    setCurrent(updated.length - 1);
    setNewName(''); setNewUrl(''); setShowAdd(false);
  };

  const handleDelete = (id) => {
    const updated = platforms.filter(p => p.id !== id);
    save(updated);
    setCurrent(c => Math.min(c, Math.max(0, updated.length - 1)));
  };

  const prev = () => setCurrent(c => (c - 1 + platforms.length) % platforms.length);
  const next = () => setCurrent(c => (c + 1) % platforms.length);

  const platform = platforms[current];
  const pKey = platform ? getPlatformKey(platform.name) : 'default';
  const pStyle = PLATFORM_COLORS[pKey];
  const isLeetCode = pKey === 'leetcode';

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Coding Platforms</h2>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 text-xs text-primary hover:text-white bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/10 flex flex-col gap-2">
          <input
            type="text" placeholder="Platform name (e.g. HackerRank)"
            className="input-field text-sm py-2"
            value={newName} onChange={e => setNewName(e.target.value)}
          />
          <input
            type="url" placeholder="Your profile URL"
            className="input-field text-sm py-2"
            value={newUrl} onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={!newName.trim() || !newUrl.trim()}
            className="btn-primary py-1.5 text-sm w-full">
            Save Platform
          </button>
        </div>
      )}

      {/* Slider */}
      {platforms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-textMuted text-sm">
          No platforms added yet.
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Slide card */}
          <div className={`flex-1 rounded-xl border ${pStyle.border} ${pStyle.bg} p-4 flex flex-col`}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: pStyle.accent }}>{pStyle.label}</p>
                <h3 className="text-white font-bold text-base">{platform.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <a href={platform.url.startsWith('http') ? platform.url : 'https://' + platform.url}
                  target="_blank" rel="noreferrer"
                  className="text-textMuted hover:text-white transition-colors p-1" title="Open Profile">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => handleDelete(platform.id)}
                  className="text-textMuted hover:text-red-400 transition-colors p-1" title="Remove">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-textMuted truncate mb-2">{platform.url}</p>

            {isLeetCode ? (
              <LeetCodeStatsBadge url={platform.url} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <a href={platform.url.startsWith('http') ? platform.url : 'https://' + platform.url}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: pStyle.accent + '20', color: pStyle.accent }}>
                  <ExternalLink size={14} /> Visit Profile
                </a>
              </div>
            )}
          </div>

          {/* Navigation */}
          {platforms.length > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button onClick={prev} className="text-textMuted hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1.5">
                {platforms.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === current ? 'bg-primary w-4' : 'bg-white/20'
                    }`} />
                ))}
              </div>
              <button onClick={next} className="text-textMuted hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
