import { useState, useEffect, useRef } from 'react';
import { Target, ShieldAlert, Loader2, CheckCircle, XCircle, History, Clock, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import API from '../api/axios';

const MockTests = () => {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('MCQ');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState(null);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [testHistory, setTestHistory] = useState([]);
  
  // Exam Mode States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await API.get('/api/tests/history');
        setTestHistory(response.data);
      } catch (err) {
        console.error("Error fetching test history", err);
      }
    };
    fetchHistory();
  }, []);

  const handleGenerateTest = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError('');
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScore(0);
    try {
        const normalizedTopic = topic.trim().toLowerCase();
        const previousQuestions = testHistory
            .filter(test => test.topic?.trim().toLowerCase() === normalizedTopic)
            .flatMap(test => test.questions || [])
            .map(question => question.question)
            .filter(Boolean)
            .slice(0, 25);
        const payload = { topic, difficulty: 'Medium', type, questionCount, previousQuestions };
        const response = await API.post('/api/ai/generate-test', payload);

        if (response.data && response.data.length > 0) {
            setGeneratedTest(response.data);
        } else if (response.data.questions) {
            setGeneratedTest(response.data.questions);
        } else {
            setError("Failed to generate test format.");
        }
    } catch (err) {
        console.error(err);
        setError("Error generating test. Check backend connection or API keys.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleOptionSelect = (qIdx, option) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: option
    }));
  };

  const handleSubmitTest = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let currentScore = 0;
    generatedTest.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        currentScore += 1;
      }
    });
    setScore(currentScore);
    setIsSubmitted(true);

    try {
        await API.post('/api/tests', {
            topic,
            questions: generatedTest,
            score: currentScore,
            timeTaken: (questionCount * 60) - Math.max(0, timeLeft)
        });
        const response = await API.get('/api/tests/history');
        setTestHistory(response.data);
    } catch (err) {
        console.error("Failed to save test", err);
    }
  };

  useEffect(() => {
    if (generatedTest && !isSubmitted) {
      // 1 minute per question
      const totalTime = generatedTest.length * 60;
      setTimeLeft(totalTime);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generatedTest, isSubmitted]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Mock Tests & Assessment</h1>
        <p className="text-textMuted">Identify weak areas automatically and get AI-suggested topics.</p>
      </header>

      {generatedTest ? (
         <div className="space-y-6">
            {/* Exam Header */}
            <div className="flex flex-col gap-4 bg-surface/50 backdrop-blur-md p-5 rounded-2xl border border-white/5 sm:flex-row sm:items-center sm:justify-between sm:p-6 shadow-lg">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-1">Test: {topic}</h2>
                   <p className="text-textMuted text-sm font-medium">Mode: <span className="text-white">{type}</span> &bull; {generatedTest.length} Questions</p>
                </div>
                <div className="flex items-center gap-4">
                    {!isSubmitted && (
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                            <Clock className={timeLeft < 60 ? "text-danger animate-pulse" : "text-primary"} size={20} />
                            <span className={`font-mono text-xl font-bold ${timeLeft < 60 ? "text-danger" : "text-white"}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>
                    )}
                    {isSubmitted && (
                        <div className="bg-primary/20 border border-primary/30 px-4 py-2 rounded-xl">
                            <span className="text-primary font-bold">Score: {score} / {generatedTest.length}</span>
                        </div>
                    )}
                    <button onClick={() => { setGeneratedTest(null); if (timerRef.current) clearInterval(timerRef.current); }} className="btn-secondary text-sm px-4 py-2">
                       Exit
                    </button>
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Question Area */}
                <div className="flex-1 space-y-6">
                   {/* We only render the current question */}
                   {(() => {
                       const idx = currentQuestionIdx;
                       const q = generatedTest[idx];
                       return (
                           <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                                   <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((idx + 1) / generatedTest.length) * 100}%` }} />
                               </div>
                               <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
                                   <span className="text-primary mr-2">Q{idx + 1}.</span> {q.question}
                               </h3>
                               {q.options && q.options.length > 0 && (
                                   <div className="grid grid-cols-1 gap-4">
                                       {q.options.map((opt, oIdx) => {
                                           const isSelected = selectedAnswers[idx] === opt;
                                           const isCorrect = isSubmitted && opt === q.correctAnswer;
                                           const isWrong = isSubmitted && isSelected && opt !== q.correctAnswer;
                                           
                                           let optionClass = "text-left bg-black/40 border border-white/10 p-4 rounded-xl text-textMuted transition-all duration-200 flex justify-between items-center group";
                                           
                                           if (!isSubmitted) {
                                               if (isSelected) {
                                                   optionClass += " border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)] text-white bg-primary/10 scale-[1.01]";
                                               } else {
                                                   optionClass += " hover:border-white/30 hover:text-white hover:bg-white/5";
                                               }
                                           } else {
                                               if (isCorrect) {
                                                   optionClass += " border-green-500 text-green-400 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                                               } else if (isWrong) {
                                                   optionClass += " border-red-500 text-red-400 bg-red-500/10";
                                               } else if (isSelected) {
                                                   optionClass += " border-white/20 opacity-50";
                                               } else {
                                                   optionClass += " opacity-50";
                                               }
                                           }

                                           return (
                                               <button 
                                                 key={oIdx} 
                                                 className={optionClass}
                                                 onClick={() => handleOptionSelect(idx, opt)}
                                                 disabled={isSubmitted}
                                               >
                                                   <span className="flex items-center gap-3">
                                                       <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${isSelected ? 'bg-primary text-white' : 'bg-white/10 text-textMuted'}`}>
                                                           {String.fromCharCode(65 + oIdx)}
                                                       </span>
                                                       <span className="text-base font-medium">{opt}</span>
                                                   </span>
                                                   {isSubmitted && isCorrect && <CheckCircle size={22} className="text-green-500" />}
                                                   {isSubmitted && isWrong && <XCircle size={22} className="text-red-500" />}
                                               </button>
                                           );
                                       })}
                                   </div>
                               )}
                               {type === 'Coding' && (
                                   <div>
                                     <textarea 
                                        className="w-full h-48 bg-black/50 border border-white/10 mt-4 rounded-xl p-4 font-mono text-sm text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all custom-scrollbar" 
                                        placeholder="Write your solution here..."
                                        disabled={isSubmitted}
                                     />
                                     {isSubmitted && q.correctAnswer && (
                                         <div className="mt-6 p-5 bg-green-500/5 border border-green-500/20 rounded-xl">
                                             <h4 className="text-sm text-green-400 font-bold mb-3 flex items-center gap-2"><CheckCircle size={16}/> Expected Answer / Logic:</h4>
                                             <p className="text-sm text-textMuted whitespace-pre-wrap font-mono bg-black/40 p-4 rounded-lg">{q.correctAnswer}</p>
                                         </div>
                                     )}
                                   </div>
                               )}
                           </div>
                       );
                   })()}

                   {/* Navigation Controls */}
                   <div className="flex items-center justify-between mt-6">
                       <button 
                           onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                           disabled={currentQuestionIdx === 0}
                           className="btn-secondary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                           <ChevronLeft size={18} /> Previous
                       </button>

                       {!isSubmitted && currentQuestionIdx === generatedTest.length - 1 ? (
                           <button onClick={handleSubmitTest} className="btn-primary px-8 py-2.5 font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                               Submit Exam
                           </button>
                       ) : (
                           <button 
                               onClick={() => setCurrentQuestionIdx(prev => Math.min(generatedTest.length - 1, prev + 1))}
                               disabled={currentQuestionIdx === generatedTest.length - 1}
                               className="btn-secondary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                               Next <ChevronRight size={18} />
                           </button>
                       )}
                   </div>
                </div>

                {/* Sidebar Navigation Grid */}
                <div className="w-full lg:w-72 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                            <LayoutGrid size={18} className="text-primary" />
                            <h3 className="font-bold text-white">Question Navigator</h3>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {generatedTest.map((_, idx) => {
                                const isAnswered = selectedAnswers[idx] !== undefined;
                                const isCurrent = currentQuestionIdx === idx;
                                let btnClass = "w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-200 border ";
                                
                                if (isCurrent) {
                                    btnClass += "border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-110";
                                } else if (isSubmitted) {
                                    const isCorrect = generatedTest[idx].correctAnswer === selectedAnswers[idx];
                                    if (isCorrect) btnClass += "border-green-500/50 bg-green-500/20 text-green-400";
                                    else btnClass += "border-red-500/50 bg-red-500/20 text-red-400";
                                } else if (isAnswered) {
                                    btnClass += "border-primary/50 bg-primary/10 text-white";
                                } else {
                                    btnClass += "border-white/10 bg-black/40 text-textMuted hover:border-white/30";
                                }
                                
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => setCurrentQuestionIdx(idx)}
                                        className={btnClass}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {isSubmitted && (
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <h4 className="text-white font-bold mb-4">Performance</h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-textMuted">Accuracy</span>
                                            <span className="text-white font-bold">{Math.round((score / generatedTest.length) * 100)}%</span>
                                        </div>
                                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full" style={{ width: `${(score / generatedTest.length) * 100}%` }} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-center text-sm">
                                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg py-2">
                                            <span className="block text-green-400 font-bold text-lg">{score}</span>
                                            <span className="text-textMuted text-xs uppercase">Correct</span>
                                        </div>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg py-2">
                                            <span className="block text-red-400 font-bold text-lg">{generatedTest.length - score}</span>
                                            <span className="text-textMuted text-xs uppercase">Incorrect</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
         </div>
      ) : (
      <div className="mb-12">
        {/* Generate Custom Test */}
        <div className="relative overflow-hidden glass-panel p-8 max-w-4xl mx-auto flex flex-col items-center text-center rounded-3xl border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10" />
          
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] transform rotate-3">
             <Target className="text-primary" size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-4 drop-shadow-sm">Custom AI Mock Test</h2>
          <p className="text-textMuted text-lg mb-10 max-w-2xl leading-relaxed">Simulate a high-pressure interview environment instantly. Enter any topic, and let AI generate a hyper-specific, challenging assessment.</p>
          
          {error && (
             <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl mb-6 w-full max-w-2xl">
                <XCircle size={18} /> {error}
             </div>
          )}

          <div className="w-full max-w-2xl bg-black/40 p-8 rounded-2xl border border-white/5 space-y-8 backdrop-blur-sm">
              <div className="text-left space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-textMuted">Focus Topic</label>
                  <input 
                     type="text" 
                     placeholder="e.g. System Design, React Hooks, Dynamic Programming..." 
                     className="input-field w-full text-lg py-4 px-5 bg-white/5 border-white/10 focus:border-primary focus:ring-1 focus:ring-primary shadow-inner" 
                     value={topic}
                     onChange={(e) => setTopic(e.target.value)}
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-2">
                      <label className="text-sm font-bold uppercase tracking-wider text-textMuted">Question Type</label>
                      <div className="flex bg-black/50 p-1.5 rounded-xl border border-white/10 shadow-inner">
                        <button 
                           className={`flex-1 rounded-lg py-2.5 font-bold text-sm transition-all duration-300 ${type === 'MCQ' ? 'bg-white text-black shadow-md' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
                           onClick={() => setType('MCQ')}
                        >Multiple Choice</button>
                        <button 
                           className={`flex-1 rounded-lg py-2.5 font-bold text-sm transition-all duration-300 ${type === 'Coding' ? 'bg-white text-black shadow-md' : 'text-textMuted hover:text-white hover:bg-white/5'}`}
                           onClick={() => setType('Coding')}
                        >Coding Problem</button>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-textMuted">No. of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      className="input-field w-full text-center py-3 bg-white/5 border-white/10"
                      value={questionCount}
                      onChange={(e) => {
                        const value = Math.max(1, Math.min(Number(e.target.value) || 1, 15));
                        setQuestionCount(value);
                      }}
                    />
                  </div>
              </div>

              <button 
                 className="group relative w-full overflow-hidden btn-primary py-4 mt-4 text-lg font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 rounded-xl"
                 onClick={() => {
                     setCurrentQuestionIdx(0);
                     handleGenerateTest();
                 }}
                 disabled={isGenerating || !topic.trim()}
              >
                 <span className="relative z-10 flex items-center justify-center gap-3">
                     {isGenerating ? (
                         <><Loader2 size={24} className="animate-spin" /> Generating Assessment...</>
                     ) : (
                         <>Start Assessment <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                     )}
                 </span>
                 {!isGenerating && topic.trim() && (
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" style={{ transform: 'translateX(-100%)' }} />
                 )}
              </button>
          </div>
        </div>
      </div>
      )}
      
      {/* Weakness Identification */}
      {!generatedTest && (
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldAlert className="text-danger" size={24} />
          Identified Weaknesses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-5 border-danger/20 hover:border-danger/40 transition-colors">
            <h3 className="text-white font-medium mb-1">Dynamic Programming</h3>
            <p className="text-sm text-textMuted mb-4">Failed 3 tests recently.</p>
            <button className="text-danger text-sm font-medium hover:underline">Review Topic &rarr;</button>
          </div>
          <div className="glass-panel p-5 border-warning/20 hover:border-warning/40 transition-colors">
            <h3 className="text-white font-medium mb-1">React Context API</h3>
            <p className="text-sm text-textMuted mb-4">Low accuracy on MCQs.</p>
            <button className="text-warning text-sm font-medium hover:underline">Review Topic &rarr;</button>
          </div>
        </div>
      </div>
      )}
      
      {/* Test History */}
      {!generatedTest && testHistory.length > 0 && (
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <History className="text-primary" size={24} />
          Past Test Records
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testHistory.map((test) => (
            <div key={test._id} className="glass-panel p-5 border-white/5 hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="text-white font-medium truncate pr-2" title={test.topic}>{test.topic}</h3>
                 <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                   {test.results?.score || 0} / {test.questions?.length || 0}
                 </span>
              </div>
              <p className="text-sm text-textMuted mb-4">
                 Taken on: {new Date(test.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};

export default MockTests;
