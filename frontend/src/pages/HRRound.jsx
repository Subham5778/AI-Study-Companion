import { useEffect, useState } from 'react';
import { BookOpen, Plus, Circle, CheckCircle2, Trash2, ChevronDown, Play, X, Eye, FastForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_HR_QUESTIONS = [
  { id: 'def1', question: 'Tell me about yourself.', solution: 'Focus on present, past, and future. Start with your current role, highlight relevant past experiences, and end with what you are looking for in this role.', done: false },
  { id: 'def2', question: 'What is your greatest weakness?', solution: 'Share a real weakness but focus on how you are actively working to improve it. Avoid cliches like "I work too hard".', done: false },
  { id: 'def3', question: 'Where do you see yourself in 5 years?', solution: 'Align your goals with the company\'s growth. Show ambition but remain realistic and committed to the role you are applying for.', done: false },
  { id: 'def4', question: 'Why should we hire you?', solution: 'Highlight a unique combination of your skills, experience, and cultural fit. Match your strengths to the job description.', done: false },
];

const HRRound = () => {
  const { user } = useAuth();
  const userStorageId = user?.id || user?._id || user?.email || 'guest';
  const hrQuestionsStorageKey = `hr_questions_${userStorageId}`;
  
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem(hrQuestionsStorageKey);
    return saved ? JSON.parse(saved) : DEFAULT_HR_QUESTIONS;
  });
  const [newQuestion, setNewQuestion] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Practice Mode States
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [currentPracticeIdx, setCurrentPracticeIdx] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(hrQuestionsStorageKey);
    setQuestions(saved ? JSON.parse(saved) : []);
    setExpandedId(null);
  }, [hrQuestionsStorageKey]);

  const handleAdd = () => {
    if (!newQuestion.trim() || !newSolution.trim()) return;
    const updated = [...questions, { id: Date.now(), question: newQuestion, solution: newSolution, done: false }];
    setQuestions(updated);
    setNewQuestion('');
    setNewSolution('');
    localStorage.setItem(hrQuestionsStorageKey, JSON.stringify(updated));
  };

  const handleToggle = (id) => {
    const updated = questions.map(q => q.id === id ? { ...q, done: !q.done } : q);
    setQuestions(updated);
    localStorage.setItem(hrQuestionsStorageKey, JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    localStorage.setItem(hrQuestionsStorageKey, JSON.stringify(updated));
  };

  return (
    <div className="animate-fade-in pb-10 max-w-5xl mx-auto space-y-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 flex shrink-0 items-center justify-center border border-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.15)]">
              <BookOpen className="text-pink-500" size={30} /> 
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1 sm:text-3xl drop-shadow-md">HR Round Prep</h1>
              <p className="text-textMuted text-sm">Nail your behavioral interviews</p>
            </div>
        </div>
        {questions.length > 0 && !isPracticeMode && (
            <button 
                onClick={() => {
                    setIsPracticeMode(true);
                    setCurrentPracticeIdx(0);
                    setPracticeAnswer('');
                    setShowComparison(false);
                }}
                className="btn-primary bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white flex items-center justify-center gap-2 px-6 py-3 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all"
            >
                <Play size={18} /> Enter Practice Mode
            </button>
        )}
      </header>

      {isPracticeMode ? (
         <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-pink-500/20 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <div className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300" style={{ width: `${((currentPracticeIdx + 1) / questions.length) * 100}%` }} />
            </div>
            
            <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-bold text-pink-500 uppercase tracking-wider bg-pink-500/10 px-3 py-1 rounded-lg">Question {currentPracticeIdx + 1} of {questions.length}</span>
                <button onClick={() => setIsPracticeMode(false)} className="text-textMuted hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors">
                    <X size={20} />
                </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-relaxed">
                {questions[currentPracticeIdx].question}
            </h2>

            {!showComparison ? (
                <div className="space-y-6">
                    <textarea 
                        className="w-full h-48 sm:h-64 bg-black/40 border border-white/10 rounded-2xl p-5 text-base text-white focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all custom-scrollbar placeholder-white/20"
                        placeholder="Type your answer here as if you are speaking in an interview..."
                        value={practiceAnswer}
                        onChange={(e) => setPracticeAnswer(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setShowComparison(true)}
                            className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <Eye size={18} /> Compare Answer
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-textMuted uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Your Answer</h3>
                            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{practiceAnswer || <span className="text-white/30 italic">No answer provided.</span>}</p>
                        </div>
                        <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider mb-4 border-b border-pink-500/20 pb-2">Optimal Solution</h3>
                            <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{questions[currentPracticeIdx].solution}</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button 
                            onClick={() => {
                                if (currentPracticeIdx < questions.length - 1) {
                                    setCurrentPracticeIdx(prev => prev + 1);
                                    setPracticeAnswer('');
                                    setShowComparison(false);
                                } else {
                                    setIsPracticeMode(false);
                                }
                            }}
                            className="btn-primary bg-gradient-to-r from-pink-500 to-rose-600 text-white px-8 py-3 flex items-center gap-2 font-bold"
                        >
                            {currentPracticeIdx < questions.length - 1 ? (
                                <>Next Question <FastForward size={18} /></>
                            ) : (
                                <>Finish Practice <CheckCircle2 size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
         </div>
      ) : (
        <>
          <div className="glass-panel p-6 sm:p-8 mb-5 border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-[40px] -z-10" />
            <h3 className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-5">Add Custom Question</h3>
            <div className="flex flex-col gap-5">
              <input
                type="text"
                placeholder="e.g. Tell me about yourself"
                className="input-field w-full p-4 bg-black/40 border-white/10 focus:border-pink-500 text-base"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
              <textarea
                placeholder="Your solution/answer..."
                className="input-field w-full h-32 resize-none text-base custom-scrollbar p-4 bg-black/40 border-white/10 focus:border-pink-500"
                value={newSolution}
                onChange={(e) => setNewSolution(e.target.value)}
              />
              <button
                onClick={handleAdd}
                disabled={!newQuestion.trim() || !newSolution.trim()}
                className="btn-primary bg-white text-black hover:bg-gray-200 flex items-center justify-center gap-2 px-8 py-3.5 self-start text-sm font-bold transition-all disabled:opacity-50 disabled:bg-white/20 disabled:text-white"
              >
                <Plus size={18} /> Add to Bank
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="glass-panel p-10 text-center text-textMuted flex flex-col items-center border border-white/5 rounded-2xl">
                <BookOpen size={48} className="mb-4 opacity-20 text-pink-500" />
                <p>No HR questions found. Add some to start practicing!</p>
              </div>
            ) : (
              questions.map(q => (
                <div key={q.id} className="glass-panel overflow-hidden border border-white/5 hover:border-pink-500/30 transition-all duration-300 rounded-xl group bg-black/20">
                  <div className="p-4 flex items-center gap-3 sm:gap-4 sm:p-5">
                    <button
                      onClick={() => handleToggle(q.id)}
                      className={`shrink-0 transition-all duration-200 ${q.done ? 'text-pink-500 scale-110 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'text-white/20 hover:text-pink-500'}`}
                    >
                      {q.done ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                      <p className={`break-words font-semibold text-base transition-all sm:text-lg ${q.done ? 'line-through text-textMuted opacity-60' : 'text-white group-hover:text-pink-100'}`}>
                        {q.question}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 sm:gap-2">
                      <button onClick={() => handleDelete(q.id)} className="text-textMuted hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 size={18} />
                      </button>
                      <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className={`text-textMuted hover:text-white p-2 transition-colors rounded-lg hover:bg-white/10 ${expandedId === q.id ? 'bg-white/10 text-white' : ''}`}>
                        <ChevronDown size={20} className={`transform transition-transform duration-300 ${expandedId === q.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {expandedId === q.id && (
                    <div className="border-t border-white/5 bg-black/40 p-5 sm:p-6 animate-fade-in">
                      <h4 className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-3">Optimal Solution</h4>
                      <p className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap leading-relaxed">{q.solution}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HRRound;
