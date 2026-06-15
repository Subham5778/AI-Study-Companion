import { useState, useEffect } from 'react';
import { Target, ShieldAlert, Loader2, CheckCircle, XCircle, History } from 'lucide-react';
import API from '../api/axios';

const MockTests = () => {
  const [topic, setTopic] = useState('');
  const [type, setType] = useState('MCQ');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState(null);
  const [error, setError] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [testHistory, setTestHistory] = useState([]);

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
        const payload = { topic, difficulty: 'Medium', type, questionCount: 5 };
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
            timeTaken: 0
        });
        const response = await API.get('/api/tests/history');
        setTestHistory(response.data);
    } catch (err) {
        console.error("Failed to save test", err);
    }
  };

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Mock Tests & Assessment</h1>
        <p className="text-textMuted">Identify weak areas automatically and get AI-suggested topics.</p>
      </header>

      {generatedTest ? (
         <div className="space-y-6">
            <div className="flex flex-col gap-4 bg-surface p-5 rounded-2xl border border-white/5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                   <h2 className="text-xl font-bold text-white sm:text-2xl">Generated Test: {topic}</h2>
                   <p className="text-textMuted">Mode: {type}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    {isSubmitted && (
                        <div className="text-xl font-bold text-primary">
                            Score: {score} / {generatedTest.length}
                        </div>
                    )}
                    <button onClick={() => setGeneratedTest(null)} className="btn-secondary text-sm px-4 py-2 sm:w-auto">
                       Back to Dashboard
                    </button>
                </div>
            </div>
            
            <div className="space-y-4">
               {generatedTest.map((q, idx) => (
                   <div key={idx} className="glass-panel p-6">
                      <h3 className="text-lg font-medium text-white mb-4">Q{idx + 1}. {q.question}</h3>
                      {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, oIdx) => {
                                  const isSelected = selectedAnswers[idx] === opt;
                                  const isCorrect = isSubmitted && opt === q.correctAnswer;
                                  const isWrong = isSubmitted && isSelected && opt !== q.correctAnswer;
                                  
                                  let optionClass = "text-left bg-black/40 border border-white/10 p-3 rounded-lg text-textMuted transition-colors flex justify-between items-center";
                                  
                                  if (!isSubmitted) {
                                      if (isSelected) {
                                          optionClass += " border-primary/50 text-white bg-primary/10";
                                      } else {
                                          optionClass += " hover:border-primary/50 hover:text-white";
                                      }
                                  } else {
                                      if (isCorrect) {
                                          optionClass += " border-green-500/50 text-green-400 bg-green-500/10";
                                      } else if (isWrong) {
                                          optionClass += " border-red-500/50 text-red-400 bg-red-500/10";
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
                                          <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                          {isSubmitted && isCorrect && <CheckCircle size={18} className="text-green-500" />}
                                          {isSubmitted && isWrong && <XCircle size={18} className="text-red-500" />}
                                      </button>
                                  );
                              })}
                          </div>
                      )}
                      {type === 'Coding' && (
                          <div>
                            <textarea className="w-full h-32 bg-black/50 border border-white/10 mt-4 rounded-lg p-3 font-mono text-sm text-white" placeholder="Write your code here..."></textarea>
                            {isSubmitted && q.correctAnswer && (
                                <div className="mt-4 p-4 bg-surface border border-white/10 rounded-lg">
                                    <h4 className="text-sm text-green-400 font-medium mb-2">Expected Answer / Logic:</h4>
                                    <p className="text-sm text-textMuted whitespace-pre-wrap">{q.correctAnswer}</p>
                                </div>
                            )}
                          </div>
                      )}
                   </div>
               ))}
            </div>

            {!isSubmitted && (
                <div className="flex justify-center pt-4">
                    <button 
                        onClick={handleSubmitTest}
                        className="btn-primary py-3 px-8 text-lg"
                    >
                        Submit Test
                    </button>
                </div>
            )}
         </div>
      ) : (
      <div className="mb-12">
        {/* Generate Custom Test */}
        <div className="glass-panel p-5 max-w-3xl mx-auto flex flex-col items-center text-center sm:p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-highlight">
             <Target className="text-primary" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Custom AI Mock Test</h2>
          <p className="text-textMuted mb-8 max-w-lg">Generate a hyper-specific test on any topic. Choose the difficulty and let AI simulate an interview environment instantly.</p>
          
          {error && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded mb-4 w-full">{error}</p>}

          <div className="w-full max-w-md space-y-4">
              <input 
                 type="text" 
                 placeholder="Topic (e.g. Docker, Dynamic Prop...)" 
                 className="input-field w-full" 
                 value={topic}
                 onChange={(e) => setTopic(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <button 
                   className={`border rounded-lg py-3 font-medium transition-colors ${type === 'MCQ' ? 'bg-white text-black border-white' : 'bg-surface border-white/20 text-white hover:bg-white/5'}`}
                   onClick={() => setType('MCQ')}
                >MCQ</button>
                <button 
                   className={`border rounded-lg py-3 font-medium transition-colors ${type === 'Coding' ? 'bg-white text-black border-white' : 'bg-surface border-white/20 text-white hover:bg-white/5'}`}
                   onClick={() => setType('Coding')}
                >Coding Problem</button>
              </div>
              <button 
                 className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-4"
                 onClick={handleGenerateTest}
                 disabled={isGenerating || !topic.trim()}
              >
                 {isGenerating ? <Loader2 size={20} className="animate-spin" /> : 'Start Assessment'}
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
