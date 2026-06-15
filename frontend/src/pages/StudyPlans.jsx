import { useState, useEffect } from 'react';
import {
  Sparkles, Calendar as CalendarIcon, ChevronDown, ChevronRight,
  Play, Award, BookOpen, PenTool, BrainCircuit, ListTodo,
  CheckCircle2, Circle, Trash2, Plus, FolderOpen
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const placementTracks = [
  {
    title: "100 Days DSA Plan", type: "Placement", value: 450, unit: "Questions",
    color: "text-blue-500", bg: "bg-blue-500/10",
    link: "https://takeuforward.org/dsa/strivers-a2z-sheet-learn-dsa-a-to-z"
  },
  {
    title: "Full Stack Preparation", type: "Full Stack", value: "30", unit: "Days Plan",
    color: "text-cyan-500", bg: "bg-cyan-500/10",
    subTracks: [
      { title: "Frontend Prep (15 Days)", value: "11 hr 15 min", unit: "of video", link: "https://www.youtube.com/watch?v=3LRZRSIh_KE" },
      { title: "Backend Prep (15 Days)", value: "8 hr 23 min", unit: "of video", link: "https://www.youtube.com/watch?v=0IciwnJ6PJI" }
    ]
  },
  {
    title: "System Design Playlist", type: "Architecture", value: 40, unit: "videos",
    color: "text-purple-500", bg: "bg-purple-500/10",
    link: "https://www.youtube.com/watch?v=AK0hu0Zxua4&list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT"
  }
];

const StudyPlans = () => {
  const { refreshUser } = useAuth();

  /* -- Generator state -- */
  const [syllabus, setSyllabus] = useState('');
  const [days, setDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(null);
  const [genError, setGenError] = useState('');

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

  /* ---------- fetch ---------- */
  useEffect(() => {
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
    try {
      const res = await API.post('/api/ai/generate-timetable', { syllabus, days: parseInt(days) });
      if (res.data && res.data.length > 0) {
        setGeneratedPreview(res.data);
        const plansRes = await API.get('/api/plan/all');
        splitAndSet(plansRes.data || []);
        setSyllabus('');
      } else {
        setGenError('Failed to generate plan. Check API keys.');
      }
    } catch (err) {
      console.error(err);
      setGenError('Error connecting to AI. Make sure GEMINI_API_KEY is set.');
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

  /* ---------- sub-components ---------- */
  const TaskRow = ({ task, isAi, gId }) => (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
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
        className="shrink-0 text-white/20 hover:text-red-400 transition-colors ml-2"
        title="Delete Task"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  /* ============================== RENDER ============================== */
  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto space-y-10 sm:space-y-14">

      {/* PAGE HEADER */}
      <header>
        <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">Study Plans</h1>
        <p className="text-textMuted">Manage your manual tasks, AI-generated plans, and placement resources all in one place.</p>
      </header>

      {/* ── SECTION 1: MY MANUAL PLAN ── */}
      <section>
        <header className="mb-6 flex items-center gap-3">
          <ListTodo className="text-warning" size={26} />
          <div>
            <h2 className="text-2xl font-bold text-white">My Manual Plan</h2>
            <p className="text-textMuted text-sm">Tasks you add yourself, grouped into files</p>
          </div>
        </header>

        {/* Add task form */}
        <div className="glass-panel p-5 mb-5 border-warning/10 bg-warning/5">
          <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-4">Add a Task</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="File / Plan Name (e.g. Next.js Course)"
                className="input-field flex-1"
                value={manualGroupName}
                onChange={(e) => setManualGroupName(e.target.value)}
                list="manual-groups"
              />
              <datalist id="manual-groups">
                {manualGroups.filter(g => g.groupId !== 'ungrouped').map(g => (
                  <option key={g.groupId} value={g.groupName} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Topic name, e.g. React Hooks"
                className="input-field flex-1"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
              />
              <select
                className="input-field w-full sm:w-32"
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Link name (e.g. YouTube Tutorial)"
                className="input-field flex-1"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
              />
              <input
                type="url"
                placeholder="https://..."
                className="input-field flex-1"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddManual}
              disabled={!newTopic.trim() || addingTask}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 self-start"
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>

        {manualGroups.length === 0 ? (
          <div className="glass-panel p-10 text-center text-textMuted">
            <ListTodo size={40} className="mx-auto mb-3 opacity-20" />
            <p>No manual tasks yet. Add one above!</p>
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
                    className="w-full p-5 flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                      <FolderOpen size={22} className="text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base truncate">{group.groupName}</h3>
                      <div className="flex items-center gap-4 mt-1.5">
                        <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-warning rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-textMuted">{done}/{group.tasks.length} completed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded-md">{group.tasks.length} tasks</span>
                      <div
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.groupId, false); }}
                        className="text-white/20 hover:text-red-400 transition-colors p-1"
                        title="Delete Plan"
                      >
                        <Trash2 size={18} />
                      </div>
                      {isOpen ? <ChevronDown size={18} className="text-textMuted" /> : <ChevronRight size={18} className="text-textMuted" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 px-3 pb-3 max-h-96 overflow-y-auto custom-scrollbar">
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
      </section>

      <hr className="border-white/5" />

      {/* ── SECTION 2: AI GENERATED PLANS ── */}
      <section>
        <header className="mb-6 flex items-center gap-3">
          <BrainCircuit className="text-primary" size={26} />
          <div>
            <h2 className="text-2xl font-bold text-white">AI Generated Plans</h2>
            <p className="text-textMuted text-sm">{aiGroups.length} plan{aiGroups.length !== 1 ? 's' : ''} — click to expand</p>
          </div>
        </header>

        {aiGroups.length === 0 ? (
          <div className="glass-panel p-10 text-center text-textMuted">
            <BrainCircuit size={40} className="mx-auto mb-3 opacity-20" />
            <p>No AI plans yet. Generate one below!</p>
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
                    className="w-full p-5 flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderOpen size={22} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base truncate">{group.groupName}</h3>
                      <div className="flex items-center gap-4 mt-1.5">
                        <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-textMuted">{done}/{group.tasks.length} completed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-textMuted bg-white/5 px-2 py-1 rounded-md">{group.tasks.length} tasks</span>
                      <div
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.groupId, true); }}
                        className="text-white/20 hover:text-red-400 transition-colors p-1"
                        title="Delete Plan"
                      >
                        <Trash2 size={18} />
                      </div>
                      {isOpen ? <ChevronDown size={18} className="text-textMuted" /> : <ChevronRight size={18} className="text-textMuted" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 px-3 pb-3 max-h-96 overflow-y-auto custom-scrollbar">
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
      </section>

      <hr className="border-white/5" />

      {/* ── SECTION 3: AI TIMETABLE GENERATOR ── */}
      <section>
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Sparkles className="text-primary" size={24} /> AI Timetable Generator
          </h2>
          <p className="text-textMuted">Paste your syllabus and get a day-by-day plan. Each generation is saved as its own plan file above.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-5 space-y-6 sm:p-8">
            {genError && <div className="text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">{genError}</div>}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-2">Target Days</label>
              <div className="flex items-center gap-4">
                <input type="range" min="7" max="180" value={days}
                  onChange={(e) => setDays(e.target.value)} className="w-full accent-primary" />
                <span className="text-white font-bold text-xl min-w-[3rem]">{days}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textMuted mb-2">Syllabus or Topics</label>
              <textarea
                className="input-field w-full h-36 resize-none font-mono text-sm"
                placeholder={"e.g. DSA \u2013 Arrays, Linked List, Trees, DP\nThe first line becomes the plan's name."}
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
              />
              <p className="text-xs text-textMuted mt-1 opacity-60">💡 First line = plan name (e.g. "DSA Plan" or "Frontend")</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !syllabus.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
            >
              {isGenerating
                ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                : <><Sparkles size={20} /> Generate Plan</>}
            </button>
          </div>

          <div className="glass-panel p-5 border-primary/20 bg-primary/5 flex flex-col justify-center text-center sm:p-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon size={40} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Plans as Files</h3>
            <p className="text-textMuted leading-relaxed text-sm">
              Each time you generate a plan, it's saved as a separate plan file — DSA, Frontend, Backend — all stored individually so you can track each one separately.
            </p>
          </div>
        </div>

        {generatedPreview && (
          <div className="mt-6 glass-panel p-5 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-primary font-semibold flex items-center gap-2">
                <Sparkles size={16} /> Plan generated &amp; saved successfully!
              </p>
              <button onClick={() => setGeneratedPreview(null)} className="text-xs text-textMuted hover:text-white">Dismiss</button>
            </div>
            <p className="text-sm text-textMuted">
              <span className="text-white font-medium">{generatedPreview.length} tasks</span> added to your AI Generated Plans above.
            </p>
          </div>
        )}
      </section>

      <hr className="border-white/5" />

      {/* ── SECTION 4: Placement Resources + Daily Study Report ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <BookOpen className="text-primary" size={24} />
            Placement Resources
          </h2>
          <div className="space-y-4">
            {placementTracks.map((track, idx) => (
              <div key={idx} className="glass-panel flex flex-col hover:border-primary/50 transition-colors rounded-xl overflow-hidden">
                <div
                  className={`p-5 flex items-center justify-between ${track.subTracks ? 'cursor-pointer' : ''}`}
                  onClick={() => track.subTracks && setExpandedTrack(expandedTrack === idx ? null : idx)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${track.bg} ${track.color} rounded-xl flex items-center justify-center`}>
                      <Award size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-textMuted">{track.type}</div>
                      <h3 className="text-base font-bold text-white">{track.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-white">{track.value}</div>
                      <div className="text-xs text-textMuted">{track.unit}</div>
                    </div>
                    {track.link
                      ? <a href={track.link} target="_blank" rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-colors"
                          onClick={e => e.stopPropagation()}>
                          <Play size={16} className="ml-0.5" />
                        </a>
                      : <ChevronDown size={18} className={`text-textMuted transform transition-transform ${expandedTrack === idx ? 'rotate-180' : ''}`} />}
                  </div>
                </div>
                {track.subTracks && expandedTrack === idx && (
                  <div className="border-t border-white/5 bg-black/30">
                    {track.subTracks.map((sub, sIdx) => (
                      <div key={sIdx} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-white font-medium text-sm">{sub.title}</div>
                          <div className="text-xs text-textMuted mt-0.5">{sub.value} {sub.unit}</div>
                        </div>
                        {sub.link && (
                          <a href={sub.link} target="_blank" rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white hover:text-black flex items-center justify-center transition-colors">
                            <Play size={14} className="ml-0.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <PenTool className="text-warning" size={24} />
            Daily Study Report
          </h2>
          <div className="glass-panel p-6 mb-5 bg-warning/5 border-warning/10">
            <h3 className="text-base font-medium text-white mb-4">Write Today's Report</h3>
            <input type="text" placeholder="What did you study? (e.g. React Hooks, DP)"
              className="input-field mb-3 w-full" value={newNoteTopic}
              onChange={(e) => setNewNoteTopic(e.target.value)} />
            <textarea placeholder="Important points, tricky parts, takeaways..."
              className="input-field mb-4 w-full h-24 resize-none text-sm"
              value={newNoteImportant} onChange={(e) => setNewNoteImportant(e.target.value)} />
            <button className="btn-primary" onClick={handleAddNote} disabled={!newNoteTopic.trim()}>
              Save Report
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[450px] pr-1 custom-scrollbar">
            {dailyNotes.map((note, idx) => (
              <div key={idx} className="glass-panel p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-warning" />
                <div className="text-xs font-bold uppercase tracking-wider text-textMuted mb-1">{note.date}</div>
                <h4 className="text-white font-medium text-base mb-2">{note.topics}</h4>
                {note.important && (
                  <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm text-textMuted">
                    <span className="text-warning font-medium block mb-1">Important Note:</span>
                    {note.important}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default StudyPlans;
