import { useState } from 'react';
import { BookOpen, Plus, Circle, CheckCircle2, Trash2, ChevronDown } from 'lucide-react';

const HRRound = () => {
  const [questions, setQuestions] = useState(() => {
    const saved = localStorage.getItem('hr_questions');
    return saved ? JSON.parse(saved) : [];
  });
  const [newQuestion, setNewQuestion] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const handleAdd = () => {
    if (!newQuestion.trim() || !newSolution.trim()) return;
    const updated = [...questions, { id: Date.now(), question: newQuestion, solution: newSolution, done: false }];
    setQuestions(updated);
    setNewQuestion('');
    setNewSolution('');
    localStorage.setItem('hr_questions', JSON.stringify(updated));
  };

  const handleToggle = (id) => {
    const updated = questions.map(q => q.id === id ? { ...q, done: !q.done } : q);
    setQuestions(updated);
    localStorage.setItem('hr_questions', JSON.stringify(updated));
  };

  const handleDelete = (id) => {
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    localStorage.setItem('hr_questions', JSON.stringify(updated));
  };

  return (
    <div className="animate-fade-in pb-10 max-w-4xl mx-auto space-y-8">
      <header className="mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex shrink-0 items-center justify-center sm:h-14 sm:w-14">
          <BookOpen className="text-pink-500" size={30} /> 
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 sm:text-3xl">HR Round Preparation</h1>
          <p className="text-textMuted text-sm">Prepare and track your interview answers</p>
        </div>
      </header>

      <div className="glass-panel p-6 mb-5 border-pink-500/10 bg-pink-500/5">
        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-4">Add HR Question</h3>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="e.g. Tell me about yourself"
            className="input-field w-full p-3"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
          />
          <textarea
            placeholder="Your solution/answer..."
            className="input-field w-full h-32 resize-none text-sm custom-scrollbar p-3"
            value={newSolution}
            onChange={(e) => setNewSolution(e.target.value)}
          />
          <button
            onClick={handleAdd}
            disabled={!newQuestion.trim() || !newSolution.trim()}
            className="btn-primary bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center gap-2 px-8 py-3 self-start text-sm font-semibold"
          >
            <Plus size={18} /> Add Question
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="glass-panel p-10 text-center text-textMuted flex flex-col items-center">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p>No HR questions added yet. Start preparing!</p>
          </div>
        ) : (
          questions.map(q => (
            <div key={q.id} className="glass-panel overflow-hidden border border-white/5 hover:border-pink-500/30 transition-all">
              <div className="p-4 flex items-center gap-3 sm:gap-4 sm:p-5">
                <button
                  onClick={() => handleToggle(q.id)}
                  className={`shrink-0 transition-all duration-200 ${q.done ? 'text-pink-500' : 'text-white/20 hover:text-pink-500'}`}
                >
                  {q.done ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                  <p className={`break-words font-medium text-base transition-all sm:text-lg ${q.done ? 'line-through text-textMuted' : 'text-white'}`}>
                    {q.question}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 sm:gap-4">
                  <button onClick={() => handleDelete(q.id)} className="text-textMuted hover:text-danger p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="text-textMuted hover:text-white p-2 transition-colors">
                    <ChevronDown size={22} className={`transform transition-transform ${expandedId === q.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {expandedId === q.id && (
                <div className="border-t border-white/5 bg-black/40 p-5">
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{q.solution}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HRRound;
