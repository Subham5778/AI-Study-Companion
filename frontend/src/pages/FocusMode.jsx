import { useState } from 'react';
import { Timer as TimerIcon, Play, Pause, RotateCcw, Coffee, Check } from 'lucide-react';
import { useFocusTimer } from '../context/FocusTimerContext';

const FocusMode = () => {
  const [isSettingsMode, setIsSettingsMode] = useState(false);
  const {
    modes,
    modeIdx,
    currentMode,
    timeLeft,
    isActive,
    sessionCount,
    sessionLogged,
    switchMode,
    toggleTimer,
    resetTimer,
    updateDuration,
  } = useFocusTimer();

  const progress = ((currentMode.defaultDuration - timeLeft) / currentMode.defaultDuration) * 100;

  const handleUpdateDuration = (idx, increment) => {
    updateDuration(idx, increment);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const strokeLen = 301.59;
  const strokeOffset = strokeLen - (strokeLen * progress) / 100;

  const ringColor = modeIdx === 0 ? '#3b82f6' : modeIdx === 1 ? '#4ade80' : '#a855f7';

  return (
    <div className="animate-fade-in pb-10 flex min-h-[80vh] flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-3 sm:text-4xl">Focus Mode</h1>
        <p className="text-textMuted max-w-md mx-auto">Distraction-free Pomodoro session. Put on your headphones and get into the zone.</p>
      </div>

      {/* Timer / Settings Toggle */}
      <div className="flex gap-4 mb-8">
         <button 
            onClick={() => setIsSettingsMode(false)}
            className={`pb-2 px-1 font-medium transition-colors border-b-2 ${!isSettingsMode ? 'text-primary border-primary' : 'text-textMuted border-transparent hover:text-white'}`}
         >
            Timer Mode
         </button>
         <button 
            onClick={() => setIsSettingsMode(true)}
            className={`pb-2 px-1 font-medium transition-colors border-b-2 ${isSettingsMode ? 'text-primary border-primary' : 'text-textMuted border-transparent hover:text-white'}`}
         >
            Timer Settings
         </button>
      </div>

      {!isSettingsMode ? (
        <>
          {/* Mode Switcher */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 bg-surface/60 p-1.5 rounded-2xl border border-white/10 sm:rounded-full">
            {modes.map((m, i) => (
              <button
                key={i}
                onClick={() => switchMode(i)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  modeIdx === i ? 'bg-white/10 text-white shadow' : 'text-textMuted hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

      {/* Timer Ring */}
      <div className="relative w-64 h-64 mb-10 sm:h-72 sm:w-72">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle className="text-surface stroke-current" strokeWidth="4" cx="50" cy="50" r="48" fill="transparent" />
          <circle
            stroke={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            cx="50" cy="50" r="48"
            fill="transparent"
            strokeDasharray={strokeLen}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center h-full w-full">
          <div className="text-5xl font-black text-white font-mono tracking-tighter sm:text-6xl">
            {formatTime(timeLeft)}
          </div>
          <div className={`mt-2 flex items-center gap-1 font-medium text-sm ${currentMode.color}`}>
            <TimerIcon size={14} /> {currentMode.label}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mb-8">
        <button
          onClick={toggleTimer}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-110 shadow-xl ${
            isActive ? 'bg-red-500/20 text-red-400 border border-red-500/50' : `bg-primary border border-primary/50`
          }`}
        >
          {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-surface border border-white/10 text-textMuted hover:text-white transition-colors"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      </>
      ) : (
        <div className="glass-panel p-8 max-w-sm w-full mb-10 flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-6">Timer Settings</h2>
            <div className="w-full space-y-6">
                {modes.map((m, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-textMuted">{m.label} Duration (min)</label>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleUpdateDuration(idx, false)} 
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center text-xl font-bold bg-black/40 rounded-xl py-2 border border-white/5">
                        {Math.round(m.defaultDuration / 60)}
                      </div>
                      <button 
                        onClick={() => handleUpdateDuration(idx, true)} 
                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
            </div>
        </div>
      )}

      {/* Session Summary */}
      {sessionCount > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 text-textMuted px-6 py-3 rounded-full bg-surface border border-white/10">
            <Coffee size={18} className="text-warning" />
            <span>Completed <strong className="text-white">{sessionCount}</strong> focus session{sessionCount > 1 ? 's' : ''} today!</span>
          </div>
          {sessionLogged && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Check size={14} /> Time logged to your study hours successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FocusMode;
