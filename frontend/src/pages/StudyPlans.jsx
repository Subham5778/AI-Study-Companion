import { useState, useEffect } from 'react';
import {
  Sparkles, Calendar as CalendarIcon, ChevronDown, ChevronRight,
  Play, Award, BookOpen, PenTool, BrainCircuit, ListTodo,
  CheckCircle2, Circle, Trash2, Plus, FolderOpen, X, ExternalLink,
  Target, GraduationCap, Flame, ArrowRight, BookOpenCheck
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const defaultPlacementTracks = [
  {
    id: "default-dsa-100",
    title: "100 Days DSA Plan", type: "Placement", value: 450, unit: "Questions",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
    link: "https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z"
  },
  {
    id: "default-fullstack-30",
    title: "Full Stack Preparation", type: "Full Stack", value: "30", unit: "Days Plan",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10",
    subTracks: [
      { title: "Frontend Prep (15 Days)", value: "11 hr 15 min", unit: "of video", link: "https://www.youtube.com/watch?v=3LRZRSIh_KE" },
      { title: "Backend Prep (15 Days)", value: "8 hr 23 min", unit: "of video", link: "https://www.youtube.com/watch?v=0IciwnJ6PJI" }
    ]
  },
  {
    id: "default-sysdesign-40",
    title: "System Design Playlist", type: "Architecture", value: 40, unit: "videos",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10",
    link: "https://www.youtube.com/watch?v=AK0hu0Zxua4&list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT"
  }
];

const StudyPlans = () => {
  const { refreshUser, user } = useAuth();

  /* -- Tabs System for Mobile & Desktop Organization -- */
  const [activeTab, setActiveTab] = useState('overview');

  /* -- Placement Tracks State (Prepopulated + localStorage) -- */
  const [placementTracks, setPlacementTracks] = useState([]);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackType, setNewTrackType] = useState('Placement');
  const [newTrackValue, setNewTrackValue] = useState('');
  const [newTrackUnit, setNewTrackUnit] = useState('');
  const [newTrackLink, setNewTrackLink] = useState('');
  const [newTrackColor, setNewTrackColor] = useState('blue');
  const [newTrackSubTracks, setNewTrackSubTracks] = useState([]);
  
  // Temp fields for adding sub-tracks to the new track
  const [tempSubTitle, setTempSubTitle] = useState('');
  const [tempSubValue, setTempSubValue] = useState('');
  const [tempSubUnit, setTempSubUnit] = useState('');
  const [tempSubLink, setTempSubLink] = useState('');

  /* -- Generator state -- */
  const [syllabus, setSyllabus] = useState('');
  const [days, setDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [genError, setGenError] = useState('');
  const [genWarning, setGenWarning] = useState('');

  /* -- Plan data -- */
  const [aiGroups, setAiGroups] = useState([]);
  const [manualGroups, setManualGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [expandedManualGroup, setExpandedManualGroup] = useState(null);
  const [expandedTrack, setExpandedTrack] = useState(null);

  /* -- Manual create form -- */
  const [manualGroupName, setManualGroupName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('Medium');
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  /* -- Notes -- */
  const [dailyNotes, setDailyNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNoteTopic, setNewNoteTopic] = useState('');
  const [newNoteImportant, setNewNoteImportant] = useState('');

  /* ---------- helpers ---------- */
  const groupAiPlans = (plans) => {
    const ai = plans.filter(p => p.source === 'ai');
    const groupMap = {};
    ai.forEach(p => {
      const key = p.groupId || 'ungrouped';
      if (!groupMap[key]) groupMap[key] = { groupId: key, groupName: p.groupName || 'AI Plan', tasks: [] };
      groupMap[key].tasks.push(p);
    });
    return Object.values(groupMap);
  };

  const groupManualPlans = (plans) => {
    const manual = plans.filter(p => p.source === 'manual' || (!p.source && !(p.subtopics?.length)));
    const groupMap = {};
    manual.forEach(p => {
      const key = p.groupId || 'ungrouped';
      if (!groupMap[key]) groupMap[key] = { groupId: key, groupName: p.groupName || 'Ungrouped Tasks', tasks: [] };
      groupMap[key].tasks.push(p);
    });
    return Object.values(groupMap);
  };

  const splitAndSet = (plans) => {
    setAiGroups(groupAiPlans(plans));
    setManualGroups(groupManualPlans(plans));
  };

  /* ---------- fetch & init ---------- */
  useEffect(() => {
    // Load local tracks
    const stored = localStorage.getItem('custom_placement_tracks');
    let customTracks = [];
    if (stored) {
      try {
        customTracks = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse custom tracks", e);
      }
    }
    setPlacementTracks([...defaultPlacementTracks, ...customTracks]);

    const fetchAll = async () => {
      try {
        const [notesRes, plansRes] = await Promise.all([
          API.get('/api/user/notes'),
          API.get('/api/plan/all')
        ]);
        setDailyNotes(notesRes.data || []);
        splitAndSet(plansRes.data || []);
      } catch (err) {
        console.error('Failed to fetch', err);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ---------- delete handlers ---------- */
  const handleDeleteTask = async (id, isAi, gId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await API.delete(`/api/plan/task/${id}`);
      if (isAi) {
        setAiGroups(prev => prev.map(g => g.groupId === gId ? { ...g, tasks: g.tasks.filter(t => t._id !== id) } : g).filter(g => g.tasks.length > 0));
      } else {
        setManualGroups(prev => prev.map(g => g.groupId === gId ? { ...g, tasks: g.tasks.filter(t => t._id !== id) } : g).filter(g => g.tasks.length > 0));
      }
    } catch (err) {
      console.error('Delete task failed', err);
    }
  };

  const handleDeleteGroup = async (gId, isAi) => {
    if (!window.confirm('Are you sure you want to delete this entire plan?')) return;
    try {
      await API.delete(`/api/plan/group/${gId}`);
      if (isAi) {
        setAiGroups(prev => prev.filter(g => g.groupId !== gId));
        if (expandedGroup === gId) setExpandedGroup(null);
      } else {
        setManualGroups(prev => prev.filter(g => g.groupId !== gId));
        if (expandedManualGroup === gId) setExpandedManualGroup(null);
      }
    } catch (err) {
      console.error('Delete group failed', err);
    }
  };

  /* ---------- toggle task ---------- */
  const handleToggle = async (id, currentStatus, isAi, gId) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await API.patch(`/api/plan/task/${id}`, { status: newStatus });
      if (isAi) {
        setAiGroups(prev => prev.map(g => g.groupId === gId ? { ...g, tasks: g.tasks.map(t => t._id === id ? { ...t, status: newStatus } : t) } : g));
      } else {
        setManualGroups(prev => prev.map(g => g.groupId === gId ? { ...g, tasks: g.tasks.map(t => t._id === id ? { ...t, status: newStatus } : t) } : g));
      }
      if (newStatus === 'completed') await refreshUser();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  /* ---------- add manual task ---------- */
  const handleAddManual = async () => {
    if (!newTopic.trim()) return;
    setAddingTask(true);
    try {
      let gId = null;
      let gName = manualGroupName.trim();
      if (gName) {
        const existingGroup = manualGroups.find(g => g.groupName?.toLowerCase() === gName.toLowerCase());
        if (existingGroup && existingGroup.groupId !== 'ungrouped') {
          gId = existingGroup.groupId;
          gName = existingGroup.groupName;
        } else {
          gId = Math.random().toString(36).substring(7);
        }
      }
      await API.post('/api/plan/task', {
        topic: newTopic,
        difficulty: newDifficulty,
        linkName: newLinkName.trim(),
        linkUrl: newLinkUrl.trim(),
        groupId: gId,
        groupName: gName
      });
      const plansRes = await API.get('/api/plan/all');
      splitAndSet(plansRes.data || []);
      setNewTopic('');
      setNewDifficulty('Medium');
      setNewLinkName('');
      setNewLinkUrl('');
    } catch (err) {
      console.error('Add task failed', err);
    } finally {
      setAddingTask(false);
    }
  };

  /* ---------- generate AI plan ---------- */
  const handleGenerate = async () => {
    if (!syllabus.trim()) return;
    setIsGenerating(true);
    setGenError('');
    setGenWarning('');
    try {
      const res = await API.post('/api/ai/generate-timetable', { syllabus, days: parseInt(days) });
      const generatedPlans = Array.isArray(res.data) ? res.data : res.data?.plans;
      if (generatedPlans && generatedPlans.length > 0) {
        setGeneratedPreview(generatedPlans);
        const plansRes = await API.get('/api/plan/all');
        splitAndSet(plansRes.data || []);
        setSyllabus('');
        if (res.data?.warning && !/quota|rate limit/i.test(res.data.warning)) {
          setGenWarning(res.data.warning);
        }
      } else {
        setGenError('Failed to generate plan. Check API keys.');
      }
    } catch (err) {
      console.error(err);
      setGenError(err.response?.data?.message || 'Error generating timetable. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTopic.trim()) return;
    try {
      const res = await API.post('/api/user/notes', { topics: newNoteTopic, important: newNoteImportant });
      setDailyNotes([res.data, ...dailyNotes]);
      setNewNoteTopic('');
      setNewNoteImportant('');
    } catch (err) {
      console.error('Note failed', err);
    }
  };

  /* ---------- Placement Resource Handlers ---------- */
  const handleAddSubTrack = () => {
    if (!tempSubTitle.trim()) return;
    setNewTrackSubTracks([...newTrackSubTracks, {
      title: tempSubTitle.trim(),
      value: tempSubValue.trim() || 'N/A',
      unit: tempSubUnit.trim() || '',
      link: tempSubLink.trim()
    }]);
    setTempSubTitle('');
    setTempSubValue('');
    setTempSubUnit('');
    setTempSubLink('');
  };

  const handleRemoveSubTrackTemp = (idx) => {
    setNewTrackSubTracks(newTrackSubTracks.filter((_, i) => i !== idx));
  };

  const handleCreateTrackSubmit = () => {
    if (!newTrackTitle.trim()) return;

    const colorConfig = {
      blue: "text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10",
      purple: "text-purple-400 border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10",
      cyan: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10",
      emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10",
      orange: "text-orange-400 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
    };

    const newTrack = {
      id: 'custom-' + Date.now(),
      title: newTrackTitle.trim(),
      type: newTrackType,
      value: newTrackValue.trim() || (newTrackSubTracks.length > 0 ? newTrackSubTracks.length : "Link"),
      unit: newTrackUnit.trim() || (newTrackSubTracks.length > 0 ? "topics" : "Resource"),
      color: colorConfig[newTrackColor] || colorConfig.blue,
      link: newTrackLink.trim() || undefined,
      subTracks: newTrackSubTracks.length > 0 ? newTrackSubTracks : undefined
    };

    // Save to localStorage
    const stored = localStorage.getItem('custom_placement_tracks');
    let customTracks = [];
    if (stored) {
      try { customTracks = JSON.parse(stored); } catch (e) {}
    }
    const updatedCustom = [...customTracks, newTrack];
    localStorage.setItem('custom_placement_tracks', JSON.stringify(updatedCustom));

    setPlacementTracks([...defaultPlacementTracks, ...updatedCustom]);

    // Reset Form
    setNewTrackTitle('');
    setNewTrackType('Placement');
    setNewTrackValue('');
    setNewTrackUnit('');
    setNewTrackLink('');
    setNewTrackColor('blue');
    setNewTrackSubTracks([]);
    setShowAddTrackModal(false);
  };

  const handleDeleteCustomTrack = (id) => {
    if (!window.confirm("Are you sure you want to delete this placement resource track?")) return;
    const stored = localStorage.getItem('custom_placement_tracks');
    let customTracks = [];
    if (stored) {
      try { customTracks = JSON.parse(stored); } catch (e) {}
    }
    const updatedCustom = customTracks.filter(t => t.id !== id);
    localStorage.setItem('custom_placement_tracks', JSON.stringify(updatedCustom));
    setPlacementTracks([...defaultPlacementTracks, ...updatedCustom]);
  };

  /* ---------- Sub-components ---------- */
  const TaskRow = ({ task, isAi, gId }) => (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/5 transition-all duration-200 group border border-transparent hover:border-white/5">
      <button
        onClick={() => handleToggle(task._id, task.status, isAi, gId)}
        className={`shrink-0 transition-all duration-200 ${task.status === 'completed' ? 'text-primary' : 'text-white/20 hover:text-primary'}`}
      >
        {task.status === 'completed'
          ? <CheckCircle2 size={20} className="drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
          : <Circle size={20} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate transition-all ${task.status === 'completed' ? 'line-through text-textMuted' : 'text-white'}`}>
          {task.topic}
        </p>
        {isAi && task.subtopics?.length > 0 && (
          <p className="text-xs text-textMuted mt-0.5 truncate opacity-60">
            {task.subtopics.slice(0, 3).join(' · ')}
          </p>
        )}
        {!isAi && task.linkUrl && (
          <a
            href={task.linkUrl.startsWith('http') ? task.linkUrl : `https://${task.linkUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1 text-xs text-primary/80 hover:text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors"
          >
            <Play size={10} className="ml-0.5" />
            {task.linkName || 'Open Link'}
          </a>
        )}
      </div>
      <span className={`text-xs font-semibold shrink-0 ${task.difficulty === 'Hard' ? 'text-red-400' : task.difficulty === 'Easy' ? 'text-green-400' : 'text-yellow-400'}`}>
        {task.difficulty}
      </span>
      <span className="text-xs text-textMuted shrink-0 hidden sm:block">
        {new Date(task.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task._id, isAi, gId); }}
        className="shrink-0 text-white/20 hover:text-red-400 transition-colors ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100"
        title="Delete Task"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  /* Statistics and summaries */
  const totalTasks = [...manualGroups, ...aiGroups].reduce((acc, g) => acc + g.tasks.length, 0);
  const completedTasks = [...manualGroups, ...aiGroups].reduce((acc, g) => acc + g.tasks.filter(t => t.status === 'completed').length, 0);
  const taskProgressPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="animate-fade-in pb-16 max-w-6xl mx-auto space-y-8">

      {/* PAGE HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="text-primary animate-pulse" size={32} />
            Study Companion &amp; Plans
          </h1>
          <p className="text-textMuted text-sm mt-1">
            Build custom paths, generate smart AI plans, track resources, and write reports.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface/50 border border-white/5 px-3 py-1.5 rounded-full shrink-0">
          <Flame className="text-warning fill-warning" size={18} />
          <span className="text-sm font-bold text-white">Level {user?.level || 1}</span>
          <span className="text-xs text-textMuted">({user?.xp || 0} XP)</span>
        </div>
      </header>

      {/* STATS HERO SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-textMuted">Daily Study Progress</span>
            <div className="text-2xl font-black text-white mt-1">{taskProgressPct}% Completed</div>
            <div className="text-xs text-textMuted mt-1">{completedTasks} of {totalTasks} goals achieved</div>
          </div>
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
            <BookOpenCheck className="text-primary" size={24} />
          </div>
        </div>

        <div className="glass-panel p-5 bg-gradient-to-br from-warning/10 to-transparent border-warning/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-textMuted">Active Playlists</span>
            <div className="text-2xl font-black text-white mt-1">{manualGroups.length + aiGroups.length} Active</div>
            <div className="text-xs text-textMuted mt-1">Grouped learning schedules</div>
          </div>
          <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center">
            <FolderOpen className="text-warning" size={24} />
          </div>
        </div>

        <div className="glass-panel p-5 bg-gradient-to-br from-purple-100/5 to-transparent border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-textMuted">Curated Resources</span>
            <div className="text-2xl font-black text-white mt-1">{placementTracks.length} Materials</div>
            <div className="text-xs text-textMuted mt-1">Placement sheets &amp; tracks</div>
          </div>
          <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
            <Award className="text-purple-400" size={24} />
          </div>
        </div>
      </div>

      {/* RESPONSIVE SEGMENTED TABS BAR */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-surface/80 backdrop-blur border border-white/5 rounded-xl no-scrollbar">
        {[
          { id: 'overview', label: 'Dashboard', icon: Target },
          { id: 'manual', label: 'My Plan', icon: ListTodo, badge: manualGroups.length },
          { id: 'ai', label: 'AI Timetable', icon: BrainCircuit, badge: aiGroups.length },
          { id: 'resources', label: 'Placement Materials', icon: BookOpen, badge: placementTracks.length },
          { id: 'notes', label: 'Daily Reports', icon: PenTool, badge: dailyNotes.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 translate-y-[-1px]'
                  : 'text-textMuted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-bold ml-1 ${isActive ? 'bg-white text-primary' : 'bg-white/10 text-textMuted'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW & QUICK ACTIONS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <div className="space-y-6">
            <div className="glass-panel p-6 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles size={20} className="text-primary" /> Welcome Back!
              </h2>
              <p className="text-sm text-textMuted leading-relaxed">
                Stay on top of your learning curves. You can use the AI Timetable builder to break down hard syllabi, or check off your manual task schedules. Set target milestones to complete tasks and earn XP to level up!
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setActiveTab('manual')} className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3">
                  View Tasks <ArrowRight size={14} />
                </button>
                <button onClick={() => setActiveTab('resources')} className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3">
                  Placement Kits <Award size={14} />
                </button>
              </div>
            </div>

            {/* Quick Summary of Pending Goals */}
            <div className="glass-panel p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <ListTodo size={18} className="text-warning" /> Upcoming Goals
              </h3>
              {totalTasks === 0 ? (
                <p className="text-xs text-textMuted">No pending tracks found. Start by generating or adding custom plans!</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {[...manualGroups, ...aiGroups].slice(0, 2).map((g) => (
                    <div key={g.groupId} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-xs font-bold text-textMuted mb-2">
                        <span className="truncate max-w-[70%]">{g.groupName}</span>
                        <span>{g.tasks.filter(t => t.status === 'completed').length}/{g.tasks.length} Completed</span>
                      </div>
                      <div className="space-y-1.5">
                        {g.tasks.slice(0, 2).map(task => (
                          <div key={task._id} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-primary' : 'bg-neutral-600'}`} />
                            <span className={`truncate ${task.status === 'completed' ? 'line-through opacity-50' : 'text-white'}`}>{task.topic}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Daily Reports preview & quick note */}
          <div className="space-y-6">
            <div className="glass-panel p-6 bg-warning/5 border-warning/10">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <PenTool className="text-warning" size={18} /> Write Today's Report
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="What did you study today? (e.g. React Hooks, DP)"
                  className="input-field w-full text-sm py-2 px-3"
                  value={newNoteTopic}
                  onChange={(e) => setNewNoteTopic(e.target.value)}
                />
                <textarea
                  placeholder="Key notes, takeaways, tricky bits..."
                  className="input-field w-full h-20 resize-none text-xs py-2 px-3"
                  value={newNoteImportant}
                  onChange={(e) => setNewNoteImportant(e.target.value)}
                />
                <button
                  className="btn-primary w-full py-2 text-xs font-bold"
                  onClick={handleAddNote}
                  disabled={!newNoteTopic.trim()}
                >
                  Save Daily Report
                </button>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h4 className="text-sm font-bold text-white mb-3">Recent Reports</h4>
              {dailyNotes.length === 0 ? (
                <p className="text-xs text-textMuted">No reports added recently.</p>
              ) : (
                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                  {dailyNotes.slice(0, 2).map((note, idx) => (
                    <div key={idx} className="p-3 bg-black/20 rounded-xl border border-white/5 text-xs relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-warning rounded-l" />
                      <div className="text-textMuted mb-1 font-bold">{note.date}</div>
                      <div className="text-white font-semibold">{note.topics}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. MY MANUAL PLAN */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-fade-in">
          {/* Add task form */}
          <div className="glass-panel p-5 border-warning/10 bg-warning/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ListTodo size={16} className="text-warning" /> ADD NEW MANUAL TASK
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="File / Plan Name (e.g. Next.js Course)"
                className="input-field text-sm"
                value={manualGroupName}
                onChange={(e) => setManualGroupName(e.target.value)}
                list="manual-groups"
              />
              <datalist id="manual-groups">
                {manualGroups.filter(g => g.groupId !== 'ungrouped').map(g => (
                  <option key={g.groupId} value={g.groupName} />
                ))}
              </datalist>

              <input
                type="text"
                placeholder="Topic name, e.g. React Hooks"
                className="input-field text-sm"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
              />

              <select
                className="input-field text-sm"
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Link name (e.g. YT Tutorial)"
                  className="input-field text-sm flex-1"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                />
                <input
                  type="url"
                  placeholder="https://..."
                  className="input-field text-sm flex-1"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleAddManual}
              disabled={!newTopic.trim() || addingTask}
              className="btn-primary flex items-center gap-2 mt-4 px-6 py-2.5 self-start text-sm"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>

          {manualGroups.length === 0 ? (
            <div className="glass-panel p-10 text-center text-textMuted">
              <ListTodo size={40} className="mx-auto mb-3 opacity-20" />
              <p>No manual tasks yet. Add one above to create your syllabus checklist!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {manualGroups.map((group) => {
                const isOpen = expandedManualGroup === group.groupId;
                const done = group.tasks.filter(t => t.status === 'completed').length;
                const pct = group.tasks.length ? Math.round((done / group.tasks.length) * 100) : 0;
                return (
                  <div key={group.groupId} className="glass-panel overflow-hidden border border-white/5 hover:border-warning/30 transition-all duration-200">
                    <button
                      onClick={() => setExpandedManualGroup(isOpen ? null : group.groupId)}
                      className="w-full p-4 sm:p-5 flex items-center gap-3 sm:gap-4 text-left"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                        <FolderOpen size={20} className="text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm sm:text-base truncate">{group.groupName}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="h-1.5 w-24 sm:w-32 bg-white/5 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-2xs sm:text-xs text-textMuted">{done}/{group.tasks.length} done</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-2xs sm:text-xs text-textMuted bg-white/5 px-2 py-1 rounded-md">{group.tasks.length} tasks</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.groupId, false); }}
                          className="text-white/20 hover:text-red-400 transition-colors p-1"
                          title="Delete Group"
                        >
                          <Trash2 size={16} />
                        </button>
                        {isOpen ? <ChevronDown size={18} className="text-textMuted" /> : <ChevronRight size={18} className="text-textMuted" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-white/5 px-2 py-2 max-h-96 overflow-y-auto custom-scrollbar bg-black/20">
                        {group.tasks.map(task => (
                          <TaskRow key={task._id} task={task} isAi={false} gId={group.groupId} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. AI TIMETABLE */}
      {activeTab === 'ai' && (
        <div className="space-y-8 animate-fade-in">
          {/* AI Generator Tool */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 space-y-5 md:col-span-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-primary animate-pulse" size={20} /> AI Plan Builder
              </h3>
              <p className="text-xs text-textMuted leading-relaxed">
                Provide your core curriculum topics, specify the targeted time framework, and our AI model will compile a structured day-by-day course plan file for you.
              </p>

              {genError && <div className="text-red-400 bg-red-400/10 p-3 rounded-lg text-xs font-semibold">{genError}</div>}
              {genWarning && <div className="text-amber-300 bg-amber-400/10 p-3 rounded-lg text-xs font-semibold">{genWarning}</div>}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textMuted mb-2">Target Study Days</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="7"
                    max="180"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="w-full accent-primary"
                  />
                  <span className="text-primary font-bold text-xl min-w-[3rem] text-center">{days} Days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-textMuted mb-2">Curriculum / Topics</label>
                <textarea
                  className="input-field w-full h-32 resize-none font-mono text-sm"
                  placeholder={"e.g. NextJS Course \u2013 Server Components, Server Actions, API Routes, SSR vs ISR\nThe first line sets the file label."}
                  value={syllabus}
                  onChange={(e) => setSyllabus(e.target.value)}
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !syllabus.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-bold"
              >
                {isGenerating
                  ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : <><Sparkles size={16} /> Generate Interactive Track</>}
              </button>
            </div>

            <div className="glass-panel p-6 bg-primary/5 border-primary/10 flex flex-col justify-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon size={32} className="text-primary" />
              </div>
              <h4 className="text-white font-bold text-base mb-1">Generated Files</h4>
              <p className="text-textMuted text-xs leading-relaxed max-w-xs mx-auto">
                Each generation generates custom modules automatically mapped to your dashboard checklist. Delete completed plans anytime to clean up your board.
              </p>
            </div>
          </div>

          {generatedPreview && (
            <div className="glass-panel p-4 border-primary/30 bg-primary/5 flex items-center justify-between">
              <div>
                <div className="text-primary font-bold text-xs flex items-center gap-1.5">
                  <Sparkles size={14} /> Playbook Saved Successfully!
                </div>
                <div className="text-2xs text-textMuted mt-1">
                  Added {generatedPreview.length} checklist items to your AI plans index below.
                </div>
              </div>
              <button onClick={() => setGeneratedPreview(null)} className="text-xs text-textMuted hover:text-white font-bold">Dismiss</button>
            </div>
          )}

          {/* AI Groups Index */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider">YOUR GENERATED TIMETABLES</h3>
            {aiGroups.length === 0 ? (
              <div className="glass-panel p-8 text-center text-textMuted">
                <BrainCircuit size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No AI plan files generated yet. Use the tool above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiGroups.map((group) => {
                  const isOpen = expandedGroup === group.groupId;
                  const done = group.tasks.filter(t => t.status === 'completed').length;
                  const pct = group.tasks.length ? Math.round((done / group.tasks.length) * 100) : 0;
                  return (
                    <div key={group.groupId} className="glass-panel overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-200">
                      <button
                        onClick={() => setExpandedGroup(isOpen ? null : group.groupId)}
                        className="w-full p-4 sm:p-5 flex items-center gap-3 sm:gap-4 text-left"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FolderOpen size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-sm sm:text-base truncate">{group.groupName}</h3>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="h-1.5 w-24 sm:w-32 bg-white/5 rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-2xs sm:text-xs text-textMuted">{done}/{group.tasks.length} done</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-2xs sm:text-xs text-textMuted bg-white/5 px-2 py-1 rounded-md">{group.tasks.length} tasks</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.groupId, true); }}
                            className="text-white/20 hover:text-red-400 transition-colors p-1"
                            title="Delete Plan"
                          >
                            <Trash2 size={16} />
                          </button>
                          {isOpen ? <ChevronDown size={18} className="text-textMuted" /> : <ChevronRight size={18} className="text-textMuted" />}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 px-2 py-2 max-h-96 overflow-y-auto custom-scrollbar bg-black/20">
                          {group.tasks.map(task => (
                            <TaskRow key={task._id} task={task} isAi={true} gId={group.groupId} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. PLACEMENT MATERIALS / RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="text-primary" size={22} /> Curator &amp; Placement Tracks
            </h2>
            <button
              onClick={() => setShowAddTrackModal(true)}
              className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Plus size={14} /> Add Resource
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placementTracks.map((track, idx) => {
              const isCustom = track.id && track.id.startsWith('custom-');
              return (
                <div key={track.id || idx} className={`glass-panel border flex flex-col hover:border-primary/40 transition-all duration-200 overflow-hidden ${track.color}`}>
                  <div
                    className={`p-5 flex items-center justify-between gap-3 ${track.subTracks ? 'cursor-pointer' : ''}`}
                    onClick={() => track.subTracks && setExpandedTrack(expandedTrack === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Award size={20} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">{track.type}</span>
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{track.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right text-xs shrink-0 hidden xs:block">
                        <div className="font-bold text-white">{track.value}</div>
                        <div className="text-[10px] text-textMuted leading-tight">{track.unit}</div>
                      </div>

                      {track.link ? (
                        <a
                          href={track.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <ChevronDown size={16} className={`text-textMuted transform transition-transform ${expandedTrack === idx ? 'rotate-180' : ''}`} />
                      )}

                      {isCustom && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomTrack(track.id); }}
                          className="text-white/20 hover:text-red-400 transition-colors p-1"
                          title="Delete Custom Track"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {track.subTracks && expandedTrack === idx && (
                    <div className="border-t border-white/5 bg-black/40 text-textMain divide-y divide-white/5">
                      {track.subTracks.map((sub, sIdx) => (
                        <div key={sIdx} className="px-5 py-3 flex items-center justify-between hover:bg-white/5 gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{sub.title}</div>
                            <div className="text-[10px] text-textMuted mt-0.5">{sub.value} {sub.unit}</div>
                          </div>
                          {sub.link && (
                            <a
                              href={sub.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-colors shrink-0"
                            >
                              <Play size={12} className="ml-0.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. DAILY REPORTS */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-1">
            <div className="glass-panel p-6 bg-warning/5 border-warning/10 sticky top-4">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <PenTool className="text-warning" size={18} /> New Daily Report
              </h3>
              <p className="text-xs text-textMuted mb-4">
                Maintain consistent feedback loops. Summarize daily achievements, algorithms covered, and challenging blocker bugs.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Topics Studied</label>
                  <input
                    type="text"
                    placeholder="e.g., Dijkstra Algorithm, Grid layouts"
                    className="input-field w-full text-xs"
                    value={newNoteTopic}
                    onChange={(e) => setNewNoteTopic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">takeaways &amp; details</label>
                  <textarea
                    placeholder="e.g. Tricky part was priority queues..."
                    className="input-field w-full h-32 resize-none text-xs"
                    value={newNoteImportant}
                    onChange={(e) => setNewNoteImportant(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary w-full py-2.5 text-xs font-bold"
                  onClick={handleAddNote}
                  disabled={!newNoteTopic.trim()}
                >
                  Save Daily Log
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider">PREVIOUS STUDY LOGS</h3>
            {dailyNotes.length === 0 ? (
              <div className="glass-panel p-10 text-center text-textMuted">
                <PenTool size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No report logs saved yet. Submit your first one!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {dailyNotes.map((note, idx) => (
                  <div key={idx} className="glass-panel p-5 relative overflow-hidden border border-white/5 hover:border-warning/30 transition-all">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-warning" />
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-2xs font-bold uppercase tracking-wider text-textMuted">{note.date}</div>
                        <h4 className="text-white font-bold text-base mt-1">{note.topics}</h4>
                      </div>
                    </div>
                    {note.important && (
                      <div className="mt-3 bg-black/30 p-3 rounded-lg border border-white/5 text-xs text-textMuted leading-relaxed">
                        <span className="text-warning font-bold block mb-1">Key takeaways:</span>
                        {note.important}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD PLACEMENT RESOURCE MODAL */}
      {showAddTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel border-primary/20 w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-surface/80">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <BookOpen size={18} className="text-primary" /> ADD PLACEMENT TRACK
              </h3>
              <button
                onClick={() => setShowAddTrackModal(false)}
                className="text-textMuted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Strivers SDE Sheet"
                    className="input-field w-full text-xs"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Type / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. DSA, Frontend"
                    className="input-field w-full text-xs"
                    value={newTrackType}
                    onChange={(e) => setNewTrackType(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Qty (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 180"
                    className="input-field w-full text-xs"
                    value={newTrackValue}
                    onChange={(e) => setNewTrackValue(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Unit (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Questions, vids"
                    className="input-field w-full text-xs"
                    value={newTrackUnit}
                    onChange={(e) => setNewTrackUnit(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Color Theme</label>
                  <select
                    className="input-field w-full text-xs"
                    value={newTrackColor}
                    onChange={(e) => setNewTrackColor(e.target.value)}
                  >
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="cyan">Cyan</option>
                    <option value="emerald">Emerald</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-textMuted uppercase mb-1">Direct URL Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="input-field w-full text-xs"
                  value={newTrackLink}
                  onChange={(e) => setNewTrackLink(e.target.value)}
                />
              </div>

              {/* Sub tracks builder if no single URL is used */}
              <div className="border-t border-white/5 pt-4">
                <span className="block text-2xs font-bold text-textMuted uppercase mb-2">Build Playlist Modules (Optional)</span>
                
                <div className="space-y-2 mb-3">
                  {newTrackSubTracks.map((sub, sIdx) => (
                    <div key={sIdx} className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-lg text-xs">
                      <span className="truncate max-w-[60%] font-semibold text-white">{sub.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-textMuted text-2xs">{sub.value} {sub.unit}</span>
                        <button
                          onClick={() => handleRemoveSubTrackTemp(sIdx)}
                          className="text-textMuted hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Module Title (e.g. DP Part 1)"
                    className="input-field w-full text-[11px] py-1.5"
                    value={tempSubTitle}
                    onChange={(e) => setTempSubTitle(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Duration/Quantity (e.g. 5 hours, 10 vids)"
                    className="input-field w-full text-[11px] py-1.5"
                    value={tempSubValue}
                    onChange={(e) => setTempSubValue(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Module URL https://..."
                    className="input-field flex-1 text-[11px] py-1.5"
                    value={tempSubLink}
                    onChange={(e) => setTempSubLink(e.target.value)}
                  />
                  <button
                    onClick={handleAddSubTrack}
                    className="btn-secondary py-1.5 px-3 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Module
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-surface/90 flex justify-end gap-2">
              <button
                onClick={() => setShowAddTrackModal(false)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTrackSubmit}
                disabled={!newTrackTitle.trim()}
                className="btn-primary text-xs py-2 px-5"
              >
                Create Resource Track
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudyPlans;
