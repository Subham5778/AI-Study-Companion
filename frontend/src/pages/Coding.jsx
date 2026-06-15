import { useState, useEffect, useCallback } from 'react';
import { 
  Flame, Award, Activity, Target, ChevronLeft, ChevronRight, 
  Plus, Trash2, Edit2, ExternalLink, RefreshCw, Code2, Play, Award as AwardIcon, CheckCircle2, Circle
} from 'lucide-react';
import API from '../api/axios';

const DAILY_GOAL = 5;
const STORAGE_KEY = 'codestreak_data';
const SOLVED_PROBLEMS_KEY = 'solved_coding_questions';

const QUOTES = [
  "Every expert was once a beginner. Keep coding! 💻",
  "The only way to learn is to code. Solve one more! 🚀",
  "Small daily improvements lead to stunning results. 🌟",
  "Code is like humor. When you have to explain it, it's bad. 😄",
  "Don't count the days, make the days count! ⚡",
  "Your future self will thank you for coding today. 🔮",
  "It's not about being the best, it's about being better than yesterday. 📈",
  "One problem at a time, one day at a time. You got this! 💪",
  "Great developers aren't born, they're compiled. 🛠️",
  "Stay hungry, stay foolish, stay coding! 🧠",
  "The best time to solve a problem was yesterday. The next best time is now. ⏰",
  "Debug your limits. Compile your dreams. 🌈",
  "Consistency beats talent when talent doesn't show up. 🏆",
  "Write code like the world depends on it. Because it does. 🌍",
  "You're not just solving problems — you're building your future. 🏗️",
];

const Coding = () => {
  const [appData, setAppData] = useState({ days: {} });
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [quote, setQuote] = useState(QUOTES[0]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [motivationText, setMotivationText] = useState('');
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [expandedProblemId, setExpandedProblemId] = useState(null);

  // Keep track of today's key in a state to trigger updates when the day transitions
  const [todayKey, setTodayKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Daily leetcode scratchpad questions lifted state
  const [questions, setQuestions] = useState(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastDate = localStorage.getItem('leetcode_notes_date');
    
    if (lastDate && lastDate !== today) {
      const reset = Array(5).fill({ link: '', name: '', explanation: '' });
      localStorage.setItem('leetcode_notes', JSON.stringify(reset));
      localStorage.setItem('leetcode_notes_date', today);
      return reset;
    }
    
    localStorage.setItem('leetcode_notes_date', today);
    const saved = localStorage.getItem('leetcode_notes');
    if (saved) return JSON.parse(saved);
    return Array(5).fill({ link: '', name: '', explanation: '' });
  });

  // Edit Solved Problem State
  const [editingProblemId, setEditingProblemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editExplanation, setEditExplanation] = useState('');

  // Get date key in YYYY-MM-DD format
  const getTodayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Load data from LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setAppData(JSON.parse(raw));
      }
      const savedSolved = localStorage.getItem(SOLVED_PROBLEMS_KEY);
      if (savedSolved) {
        setSolvedProblems(JSON.parse(savedSolved));
      }
    } catch (e) {
      console.error('Failed to load coding streak data:', e);
    }
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  // Save data helper
  const saveData = (newData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setAppData(newData);
    } catch (e) {
      console.error('Failed to save coding streak data:', e);
    }
  };

  // Update todayKey every minute in case day changes (e.g. past midnight)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTodayKey = getTodayKey();
      if (currentTodayKey !== todayKey) {
        setTodayKey(currentTodayKey);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [todayKey]);

  // Sync questions clear when todayKey changes
  useEffect(() => {
    const lastDate = localStorage.getItem('leetcode_notes_date');
    if (lastDate && lastDate !== todayKey) {
      const reset = Array(5).fill({ link: '', name: '', explanation: '' });
      setQuestions(reset);
      localStorage.setItem('leetcode_notes', JSON.stringify(reset));
    }
    localStorage.setItem('leetcode_notes_date', todayKey);
  }, [todayKey]);

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
    localStorage.setItem('leetcode_notes', JSON.stringify(updated));
  };

  const handleClearQuestions = () => {
    if (window.confirm("Clear all daily challenge notes?")) {
      const reset = Array(5).fill({ link: '', name: '', explanation: '' });
      setQuestions(reset);
      localStorage.setItem('leetcode_notes', JSON.stringify(reset));
    }
  };

  const startEditing = (problem, event) => {
    if (event) event.stopPropagation();
    setEditingProblemId(problem.id);
    setExpandedProblemId(problem.id); // Expand card to show editing fields
    setEditName(problem.name || '');
    setEditLink(problem.link || '');
    setEditExplanation(problem.explanation || '');
  };

  const handleCancelEdit = (event) => {
    if (event) event.stopPropagation();
    setEditingProblemId(null);
  };

  const handleSaveEdit = (problemId, event) => {
    if (event) event.stopPropagation();
    
    const name = editName.trim();
    const link = editLink.trim();
    const explanation = editExplanation.trim();

    if (!name && !link && !explanation) {
      window.alert('Add a problem name, link, or notes before saving.');
      return;
    }

    const updatedProblems = solvedProblems.map(problem => {
      if (problem.id === problemId) {
        // If it's a today's problem, sync it to the scratchpad questions!
        if (problem.dateKey === todayKey) {
          const updatedQs = [...questions];
          updatedQs[problem.questionIndex] = {
            name: name || `Question ${problem.questionIndex + 1}`,
            link,
            explanation
          };
          setQuestions(updatedQs);
          localStorage.setItem('leetcode_notes', JSON.stringify(updatedQs));
        }

        return {
          ...problem,
          name: name || `Question ${problem.questionIndex + 1}`,
          link,
          explanation,
        };
      }
      return problem;
    });

    saveSolvedProblems(updatedProblems);
    setEditingProblemId(null);
  };

  const todayCount = appData.days[todayKey] || 0;
  const solvedTodayQuestionIds = solvedProblems
    .filter(problem => problem.dateKey === todayKey)
    .map(problem => problem.questionIndex);

  const saveSolvedProblems = (updated) => {
    setSolvedProblems(updated);
    localStorage.setItem(SOLVED_PROBLEMS_KEY, JSON.stringify(updated));
  };

  // Add / Increment problem
  const addProblem = (dateKey = todayKey) => {
    const updatedDays = { ...appData.days };
    const current = updatedDays[dateKey] || 0;
    updatedDays[dateKey] = current + 1;
    const newData = { ...appData, days: updatedDays };
    
    saveData(newData);

    if (dateKey === todayKey && updatedDays[dateKey] === DAILY_GOAL) {
      setShowCelebration(true);
    }
  };

  const submitChallengeQuestion = (question, questionIndex) => {
    const name = question.name?.trim();
    const explanation = question.explanation?.trim();
    const link = question.link?.trim();

    if (!name && !link && !explanation) {
      window.alert('Add a problem name, link, or notes before submitting.');
      return;
    }

    const now = new Date();
    const submittedAt = now.toISOString();
    const existingIndex = solvedProblems.findIndex(
      problem => problem.dateKey === todayKey && problem.questionIndex === questionIndex
    );
    const savedProblem = {
      id: existingIndex >= 0 ? solvedProblems[existingIndex].id : `${todayKey}-${questionIndex}-${now.getTime()}`,
      questionIndex,
      dateKey: todayKey,
      submittedAt,
      name: name || `Question ${questionIndex + 1}`,
      link,
      explanation,
    };

    const updatedProblems = existingIndex >= 0
      ? solvedProblems.map((problem, index) => index === existingIndex ? savedProblem : problem)
      : [savedProblem, ...solvedProblems];

    saveSolvedProblems(updatedProblems);
    setExpandedProblemId(savedProblem.id);

    if (existingIndex < 0) {
      addProblem(todayKey);
    }
  };

  const removeSolvedProblem = (problemToRemove) => {
    const updatedProblems = solvedProblems.filter(problem => problem.id !== problemToRemove.id);
    saveSolvedProblems(updatedProblems);
    if (expandedProblemId === problemToRemove.id) {
      setExpandedProblemId(null);
    }

    const updatedDays = { ...appData.days };
    const current = updatedDays[problemToRemove.dateKey] || 0;
    if (current > 1) {
      updatedDays[problemToRemove.dateKey] = current - 1;
    } else {
      delete updatedDays[problemToRemove.dateKey];
    }
    saveData({ ...appData, days: updatedDays });
  };

  // Undo / Decrement problem
  const undoProblem = () => {
    const updatedDays = { ...appData.days };
    const current = updatedDays[todayKey] || 0;
    if (current > 0) {
      updatedDays[todayKey] = current - 1;
      if (updatedDays[todayKey] === 0) {
        delete updatedDays[todayKey];
      }
      const newData = { ...appData, days: updatedDays };
      saveData(newData);
    }
  };

  // Reset progress helper
  const resetStreakHistory = () => {
    if (window.confirm('Are you sure you want to clear all challenge history? This cannot be undone.')) {
      saveData({ days: {} });
    }
  };

  // Dynamic Motivation Text
  useEffect(() => {
    if (todayCount === 0) {
      setMotivationText(`"${quote}"`);
    } else if (todayCount < DAILY_GOAL) {
      const remaining = DAILY_GOAL - todayCount;
      setMotivationText(`🔥 ${remaining} more to go! You're ${Math.round((todayCount / DAILY_GOAL) * 100)}% there. Keep pushing!`);
    } else {
      setMotivationText(`🏆 Goal crushed! You've solved ${todayCount} problems today. Absolute legend!`);
    }
  }, [todayCount, quote]);

  // Statistics calculation
  const calculateStats = () => {
    const days = Object.entries(appData.days);
    const totalSolved = days.reduce((sum, [, count]) => sum + count, 0);
    const goalsHit = days.filter(([, count]) => count >= DAILY_GOAL).length;
    const avgDaily = days.length > 0 ? (totalSolved / days.length).toFixed(1) : '0';

    // Calculate current streak
    let streak = 0;
    const today = new Date();
    
    let checkDate = new Date(today);
    if (!appData.days[todayKey] || appData.days[todayKey] === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (appData.days[key] && appData.days[key] >= DAILY_GOAL) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate best streak
    let bestStreak = 0;
    if (days.length > 0) {
      const sortedDays = days
        .filter(([, count]) => count >= DAILY_GOAL)
        .map(([date]) => new Date(date))
        .sort((a, b) => a - b);

      let tempStreak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const diff = (sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24);
        if (Math.round(diff) === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      if (sortedDays.length === 0) bestStreak = 0;
    }

    bestStreak = Math.max(bestStreak, streak);

    return { totalSolved, goalsHit, avgDaily, streak, bestStreak };
  };

  const stats = calculateStats();

  // Calendar Heatmap Color Level Helper
  const getLevel = (count) => {
    if (count === 0) return 'bg-[#1a1a2e] text-textMuted';
    if (count === 1) return 'bg-[#1e3a5f] text-white/80';
    if (count === 2) return 'bg-[#2563eb] text-white';
    if (count === 3) return 'bg-[#6366f1] text-white';
    if (count === 4) return 'bg-[#8b5cf6] text-white';
    return 'bg-[#a78bfa] text-white font-bold';
  };

  // Calendar Month Navigation
  const changeMonth = (delta) => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentCalendarDate(d);
  };

  const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];

    // Week day labels
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Empty offset cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent" />);
    }

    // Days cells
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const count = appData.days[key] || 0;
      const bgClass = getLevel(count);
      const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

      cells.push(
        <div 
          key={`day-${day}`} 
          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative group transition-all duration-200 ${bgClass} ${isToday ? 'ring-2 ring-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`}
        >
          <span>{day}</span>
          {count > 0 && (
            <span className="text-[9px] opacity-75 mt-0.5">{count} solved</span>
          )}
          {count > 0 && (
            <div className="absolute bottom-full mb-2 hidden group-hover:flex bg-neutral-900 border border-white/10 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap z-30 shadow-lg pointer-events-none">
              {count} problem{count !== 1 ? 's' : ''} solved
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Activity Heatmap</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-white min-w-[120px] text-center">
              {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {dayNames.map(name => (
            <div key={name} className="text-center text-[10px] text-textMuted uppercase font-semibold py-1">
              {name}
            </div>
          ))}
          {cells}
        </div>

        <div className="flex justify-end items-center gap-2 text-[10px] text-textMuted mt-2">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-[#1a1a2e]" />
          <div className="w-3 h-3 rounded bg-[#1e3a5f]" />
          <div className="w-3 h-3 rounded bg-[#2563eb]" />
          <div className="w-3 h-3 rounded bg-[#6366f1]" />
          <div className="w-3 h-3 rounded bg-[#8b5cf6]" />
          <div className="w-3 h-3 rounded bg-[#a78bfa]" />
          <span>More</span>
        </div>
      </div>
    );
  };

  // Activity Log Renderer
  const renderActivityLog = () => {
    const days = Object.entries(appData.days)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 14);

    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">Recent Coding Activity</h3>
          <button 
            onClick={resetStreakHistory} 
            className="text-xs text-danger hover:text-red-400 bg-danger/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            Reset Streak
          </button>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {days.length === 0 ? (
            <p className="text-sm text-textMuted italic text-center py-8">No activity logged yet. Start solving today! 🚀</p>
          ) : (
            days.map(([dateStr, count]) => {
              const date = new Date(dateStr + 'T00:00:00');
              const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const isGoalMet = count >= DAILY_GOAL;
              const isToday = dateStr === todayKey;

              return (
                <div key={dateStr} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{isToday ? '📌 Today' : formatted}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isGoalMet ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                      {count} solved
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isGoalMet ? 'text-success' : 'text-textMuted'}`}>
                    {isGoalMet ? '✅ Goal Met' : `${count}/${DAILY_GOAL}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSolvedProblems = () => {
    const sortedProblems = [...solvedProblems].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return (
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={22} className="text-success" />
              Problems Solved
            </h2>
            <p className="text-sm text-textMuted mt-1">Submitted challenge questions are saved here with the date.</p>
          </div>
          <span className="text-xs text-textMuted bg-white/5 px-3 py-1.5 rounded-lg">{sortedProblems.length} saved</span>
        </div>

        {sortedProblems.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-xl p-8 text-center text-sm text-textMuted">
            No solved questions saved yet. Submit a daily challenge question to build your archive.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedProblems.map(problem => {
              const isExpanded = expandedProblemId === problem.id;
              const isEditing = editingProblemId === problem.id;
              const date = new Date(problem.submittedAt);
              const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={problem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!isEditing) {
                      setExpandedProblemId(isExpanded ? null : problem.id);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setExpandedProblemId(isExpanded ? null : problem.id);
                    }
                  }}
                  className={`text-left rounded-xl border bg-black/30 hover:bg-black/40 transition-all p-4 ${
                    isExpanded ? 'lg:col-span-2 border-primary/50 shadow-[0_0_18px_rgba(59,130,246,0.18)]' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[11px] uppercase tracking-widest text-success font-bold">
                        Editing Question {problem.questionIndex + 1}
                      </p>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-primary font-bold block mb-1">
                          Question Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-field text-sm p-2 bg-black/40 border-white/10 w-full"
                          placeholder="Problem Name"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-primary font-bold block mb-1">
                          Problem Link
                        </label>
                        <input
                          type="text"
                          value={editLink}
                          onChange={(e) => setEditLink(e.target.value)}
                          className="input-field text-sm p-2 bg-black/40 border-white/10 w-full"
                          placeholder="Problem Link"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] uppercase tracking-widest text-primary font-bold block mb-1">
                          Explanation / Notes
                        </label>
                        <textarea
                          value={editExplanation}
                          onChange={(e) => setEditExplanation(e.target.value)}
                          className="input-field text-sm p-2 h-32 resize-none custom-scrollbar bg-black/40 border-white/10 w-full"
                          placeholder="Explanation / Solution Notes..."
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={(e) => handleSaveEdit(problem.id, e)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-success hover:bg-success/90 text-white transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={(e) => handleCancelEdit(e)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-widest text-success font-bold mb-1">
                            Question {problem.questionIndex + 1} • {formattedDate}
                          </p>
                          <h3 className="text-white font-bold text-base truncate">{problem.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-primary">{isExpanded ? 'Collapse' : 'View'}</span>
                          <button
                            onClick={(event) => startEditing(problem, event)}
                            className="p-1 rounded-md text-textMuted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit solved problem"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              removeSolvedProblem(problem);
                            }}
                            className="p-1 rounded-md text-textMuted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Remove saved problem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {problem.link && (
                        <a
                          href={problem.link.startsWith('http') ? problem.link : 'https://' + problem.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-[#FFA116] hover:text-white mt-3"
                        >
                          <ExternalLink size={13} /> Open Problem
                        </a>
                      )}

                      <div className={`mt-3 text-sm leading-relaxed text-textMuted whitespace-pre-wrap ${
                        isExpanded ? 'min-h-[180px] max-h-[520px] overflow-y-auto pr-2 custom-scrollbar text-[15px]' : 'max-h-16 overflow-hidden'
                      }`}>
                        {problem.explanation || 'No explanation saved yet.'}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Progress Ring Calculations
  const circumference = 2 * Math.PI * 85;
  const progressPercent = Math.min(todayCount / DAILY_GOAL, 1);
  const strokeOffset = circumference * (1 - progressPercent);
  const isCompleted = todayCount >= DAILY_GOAL;

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto space-y-8">
      
      {/* Page Header */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Code2 size={32} className="text-primary" />
            DSA Coding Challenges
          </h1>
          <p className="text-textMuted">Push yourself. Master data structures & algorithms daily.</p>
        </div>
      </header>

      {/* Main Grid: Challenge & Heatmap/Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Daily Progress Ring Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-5 relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-white leading-tight">Daily Coding Challenge</h2>
              <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Flame size={14} className="animate-pulse" />
                <span className="font-bold text-xs whitespace-nowrap">{stats.streak} Day Streak</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* SVG Progress Ring */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle className="text-neutral-800" cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="10" fill="transparent" />
                  <circle 
                    className={`transition-all duration-700 ease-in-out ${isCompleted ? 'text-success' : 'text-primary'}`} 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    stroke="currentColor" 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-3xl font-extrabold font-mono ${isCompleted ? 'text-success' : 'text-white'}`}>{todayCount}</span>
                  <span className="text-textMuted text-[10px] mt-1 uppercase tracking-widest font-semibold">/ 5 Solved</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => addProblem()} 
                  className={`flex-1 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 transform active:scale-95 ${
                    isCompleted 
                      ? 'bg-success hover:bg-success/90 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                      : 'bg-primary hover:bg-primaryDark text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                  }`}
                >
                  <span>+</span> {isCompleted ? 'Bonus Solved!' : 'Problem Solved!'}
                </button>
                <button 
                  onClick={undoProblem} 
                  disabled={todayCount === 0}
                  className="px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-textMuted hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo last solved"
                >
                  Undo
                </button>
              </div>

              {/* Indicator Dots */}
              <div className="flex gap-2">
                {[...Array(DAILY_GOAL)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                      i < todayCount 
                        ? (isCompleted ? 'bg-success border-success shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-primary border-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]')
                        : 'border-white/10 bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-primary" />
              <h3 className="text-base font-bold text-white">DSA Mindset</h3>
            </div>
            <p className="text-sm text-textMuted leading-relaxed">
              {motivationText}
            </p>
            <p className="text-sm text-textMuted leading-relaxed mt-3">
              Every problem you struggle through improves your pattern recognition. Stay patient, write the brute force first, then optimize one idea at a time.
            </p>
          </div>
        </div>

        {/* Middle/Right: Heatmap and Activity Log */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel p-6">
            {renderCalendar()}
          </div>
          {renderActivityLog()}
        </div>

      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-panel p-5 text-center flex flex-col justify-center">
          <div className="text-xl mb-1">📊</div>
          <span className="text-2xl font-mono font-bold text-white">{stats.totalSolved}</span>
          <span className="text-[11px] text-textMuted uppercase font-semibold mt-1">Total Solved</span>
        </div>
        <div className="glass-panel p-5 text-center flex flex-col justify-center">
          <div className="text-xl mb-1">🏆</div>
          <span className="text-2xl font-mono font-bold text-white">{stats.bestStreak}</span>
          <span className="text-[11px] text-textMuted uppercase font-semibold mt-1">Best Streak</span>
        </div>
        <div className="glass-panel p-5 text-center flex flex-col justify-center">
          <div className="text-xl mb-1">📈</div>
          <span className="text-2xl font-mono font-bold text-white">{stats.avgDaily}</span>
          <span className="text-[11px] text-textMuted uppercase font-semibold mt-1">Avg / Day</span>
        </div>
        <div className="glass-panel p-5 text-center flex flex-col justify-center">
          <div className="text-xl mb-1">🎯</div>
          <span className="text-2xl font-mono font-bold text-white">{stats.goalsHit}</span>
          <span className="text-[11px] text-textMuted uppercase font-semibold mt-1">Goals Hit</span>
        </div>
      </div>

      <ManualGoals />

      {/* Daily Notes section */}
      <DailyLeetCodeNotes 
        questions={questions}
        onChange={handleQuestionChange}
        onClear={handleClearQuestions}
        onSubmit={submitChallengeQuestion} 
        solvedTodayQuestionIds={solvedTodayQuestionIds} 
      />

      {renderSolvedProblems()}

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-white/10 p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Daily Goal Crushed!</h2>
            <p className="text-textMuted mb-6">You solved 5 problems today. Absolute Legend! 🚀</p>
            <button 
              onClick={() => setShowCelebration(false)} 
              className="btn-primary w-full py-3"
            >
              Keep Going! 💪
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// ── Move components from Dashboard.jsx ──

const DailyLeetCodeNotes = ({ questions, onChange, onClear, onSubmit, solvedTodayQuestionIds }) => {
  return (
    <div className="glass-panel p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="24" height="24" className="text-[#FFA116]">
            <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.939 5.939 0 0 0 1.271 1.543l3.995 3.906a5.304 5.304 0 0 0 3.794 1.507 5.24 5.24 0 0 0 3.69-1.465 5.306 5.306 0 0 0 1.51-3.792 5.24 5.24 0 0 0-1.464-3.69l-3.32-3.245-1.996-1.951-1.393-1.36-1.554-1.517-1.411-1.379 4.394-4.704a1.385 1.385 0 0 0-.022-1.961 1.376 1.376 0 0 0-1.958.021l-4.757 5.09-1.413 1.381-1.554 1.518-1.395 1.362-1.996 1.95 2.87 2.805a3.3 3.3 0 0 1-2.316-1.026 3.267 3.267 0 0 1-.955-2.32 3.3 3.3 0 0 1 1.027-2.315l1.64-1.756 3.854-4.125 4.896-5.239a3.298 3.298 0 0 1 4.673-.05 3.268 3.268 0 0 1 .049 4.636l-1.411 1.51-4.757 5.089 1.411 1.38 1.555 1.518 1.393 1.361 1.997 1.951a3.298 3.298 0 0 1 0 4.672 3.268 3.268 0 0 1-4.637 0l-3.995-3.906a3.896 3.896 0 0 1-1.026-1.636 3.966 3.966 0 0 1-.027-2.039 3.908 3.908 0 0 1 1.258-1.74l3.32-3.245 4.757-5.089a1.374 1.374 0 0 0 .438-.961 1.384 1.384 0 0 0-1.384-1.384h-.001z"/>
          </svg>
          Daily Coding Challenges (5 Questions Details)
        </h2>
        <button onClick={onClear} className="text-xs text-textMuted hover:text-white transition-colors">
          Clear All
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {questions.map((q, idx) => (
          <div key={idx} className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/20 transition-all min-h-[360px]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-white text-sm">Question {idx + 1}</h3>
              {solvedTodayQuestionIds.includes(idx) && (
                <span className="inline-flex items-center gap-1 text-[10px] text-success bg-success/10 px-2 py-1 rounded-full">
                  <CheckCircle2 size={11} /> Saved
                </span>
              )}
            </div>
            <input 
              type="text" 
              placeholder="Problem Name" 
              className="input-field text-sm p-2 bg-black/40 border-white/10"
              value={q.name}
              onChange={(e) => onChange(idx, 'name', e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Problem Link" 
              className="input-field text-sm p-2 bg-black/40 border-white/10"
              value={q.link}
              onChange={(e) => onChange(idx, 'link', e.target.value)}
            />
            <textarea 
              placeholder="Explanation / Solution Notes..." 
              className="input-field text-sm p-2 h-40 resize-none custom-scrollbar bg-black/40 border-white/10 flex-1"
              value={q.explanation}
              onChange={(e) => onChange(idx, 'explanation', e.target.value)}
            />
            <button
              type="button"
              onClick={() => onSubmit(q, idx)}
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                solvedTodayQuestionIds.includes(idx)
                  ? 'bg-success/15 text-success hover:bg-success/25'
                  : 'bg-primary hover:bg-primaryDark text-white'
              }`}
            >
              {solvedTodayQuestionIds.includes(idx) ? 'Update Saved' : 'Submit'}
            </button>
            {q.link && (
              <a href={q.link} target="_blank" rel="noreferrer" className="text-xs text-[#FFA116] hover:underline mt-1 block">
                Open Problem →
              </a>
            )}
          </div>
        ))}
      </div>
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
            className="btn-primary py-1.5 text-sm w-full font-semibold">
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

const ManualGoals = () => {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('manual_goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [newGoal, setNewGoal] = useState("");

  const handleAdd = () => {
    if (!newGoal.trim()) return;
    const updated = [...goals, { id: Date.now(), text: newGoal, done: false }];
    setGoals(updated);
    setNewGoal("");
    localStorage.setItem('manual_goals', JSON.stringify(updated));
  };

  const handleToggle = (id) => {
    const updated = goals.map(g => g.id === id ? { ...g, done: !g.done } : g);
    setGoals(updated);
    localStorage.setItem('manual_goals', JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    localStorage.setItem('manual_goals', JSON.stringify(updated));
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Target size={20} className="text-primary" />
        Manual Goals
      </h2>
      <div className="flex gap-2 mb-4">
        <input 
          type="text" 
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Set a new goal..." 
          className="input-field flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className="btn-primary py-2 px-4" onClick={handleAdd}>Add</button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[300px]">
        {goals.length === 0 ? (
          <p className="text-sm text-textMuted italic">No manual goals set yet.</p>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 group hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => handleToggle(goal.id)}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${goal.done ? 'bg-primary border-primary' : 'border-textMuted'}`}>
                  {goal.done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <p className={`text-sm font-medium break-words ${goal.done ? 'line-through text-textMuted' : 'text-white'}`}>{goal.text}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }} className="text-textMuted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Coding;
