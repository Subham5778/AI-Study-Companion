/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import API from '../api/axios';
import { useAuth } from './AuthContext';

const defaultModes = [
  { label: 'Focus', defaultDuration: 25 * 60, color: 'text-primary', borderColor: 'border-primary' },
  { label: 'Short Break', defaultDuration: 5 * 60, color: 'text-green-400', borderColor: 'border-green-400' },
  { label: 'Long Break', defaultDuration: 15 * 60, color: 'text-purple-400', borderColor: 'border-purple-400' },
];

const FocusTimerContext = createContext(null);

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const FocusTimerProvider = ({ children }) => {
  const { user } = useAuth();
  const userStorageId = user?.id || user?._id || user?.email || 'guest';
  const focusModesStorageKey = `focus_modes_${userStorageId}`;
  const focusTimerStorageKey = `focus_timer_${userStorageId}`;
  const [modes, setModes] = useState(() => readJson(focusModesStorageKey, defaultModes));
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(modes[0].defaultDuration);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const sessionRef = useRef(null);
  const completionRef = useRef(false);

  const currentMode = modes[modeIdx] || modes[0];

  const clearStoredSession = useCallback(() => {
    sessionRef.current = null;
    completionRef.current = false;
    localStorage.removeItem(focusTimerStorageKey);
  }, [focusTimerStorageKey]);

  const playCompletionSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.5);
    } catch {
      // AudioContext may be blocked until the browser receives a user gesture.
    }
  }, []);

  const logStudyTime = useCallback(async (minutes) => {
    try {
      setIsLogging(true);
      await API.post('/api/user/analytics/log-time', { minutes });
      setSessionLogged(true);
      window.dispatchEvent(new CustomEvent('focus-time-logged'));
      setTimeout(() => setSessionLogged(false), 3000);
    } catch (err) {
      console.error('Failed to log study time', err);
    } finally {
      setIsLogging(false);
    }
  }, []);

  const completeSession = useCallback((session) => {
    if (!session || completionRef.current) return;
    completionRef.current = true;
    clearStoredSession();
    setIsActive(false);
    setTimeLeft(0);
    setSessionCount(c => c + 1);
    setSessionLogged(false);

    if (session.modeIdx === 0) {
      logStudyTime(Math.round(session.duration / 60));
    }

    playCompletionSound();
  }, [clearStoredSession, logStudyTime, playCompletionSound]);

  const syncTimeLeft = useCallback(() => {
    const session = sessionRef.current;
    if (!session || !session.isActive) return;

    const remaining = Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000));
    setTimeLeft(remaining);

    if (remaining <= 0) {
      completeSession(session);
    }
  }, [completeSession]);

  useEffect(() => {
    const nextModes = readJson(focusModesStorageKey, defaultModes);
    const savedSession = readJson(focusTimerStorageKey, null);

    setModes(nextModes);
    setSessionLogged(false);

    if (savedSession?.isActive && savedSession.endAt && savedSession.duration) {
      sessionRef.current = savedSession;
      completionRef.current = false;
      setModeIdx(savedSession.modeIdx || 0);
      setIsActive(true);
      syncTimeLeft();
      return;
    }

    sessionRef.current = null;
    completionRef.current = false;
    setModeIdx(0);
    setTimeLeft(nextModes[0].defaultDuration);
    setIsActive(false);
  }, [focusModesStorageKey, focusTimerStorageKey, syncTimeLeft]);

  useEffect(() => {
    if (!isActive) return undefined;

    syncTimeLeft();
    const interval = setInterval(syncTimeLeft, 1000);
    const handleVisibilityChange = () => syncTimeLeft();
    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, syncTimeLeft]);

  const startTimer = useCallback(() => {
    const duration = timeLeft > 0 ? timeLeft : currentMode.defaultDuration;
    const session = {
      modeIdx,
      duration,
      endAt: Date.now() + duration * 1000,
      isActive: true,
    };

    sessionRef.current = session;
    completionRef.current = false;
    localStorage.setItem(focusTimerStorageKey, JSON.stringify(session));
    setTimeLeft(duration);
    setIsActive(true);
    setSessionLogged(false);
  }, [currentMode.defaultDuration, focusTimerStorageKey, modeIdx, timeLeft]);

  const pauseTimer = useCallback(() => {
    const session = sessionRef.current;
    const remaining = session ? Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000)) : timeLeft;
    clearStoredSession();
    setTimeLeft(remaining);
    setIsActive(false);
  }, [clearStoredSession, timeLeft]);

  const toggleTimer = useCallback(() => {
    if (isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isActive, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    clearStoredSession();
    setIsActive(false);
    setTimeLeft(currentMode.defaultDuration);
    setSessionLogged(false);
  }, [clearStoredSession, currentMode.defaultDuration]);

  const switchMode = useCallback((idx) => {
    clearStoredSession();
    setModeIdx(idx);
    setTimeLeft((modes[idx] || modes[0]).defaultDuration);
    setIsActive(false);
    setSessionLogged(false);
  }, [clearStoredSession, modes]);

  const updateDuration = useCallback((idx, increment) => {
    setModes(prev => {
      const updated = prev.map((mode, modeIndex) => (
        modeIndex === idx
          ? { ...mode, defaultDuration: Math.max(60, mode.defaultDuration + (increment ? 60 : -60)) }
          : mode
      ));

      localStorage.setItem(focusModesStorageKey, JSON.stringify(updated));

      if (idx === modeIdx && !isActive) {
        setTimeLeft(updated[idx].defaultDuration);
      }

      return updated;
    });
  }, [focusModesStorageKey, isActive, modeIdx]);

  const value = useMemo(() => ({
    modes,
    modeIdx,
    currentMode,
    timeLeft,
    isActive,
    sessionCount,
    sessionLogged,
    isLogging,
    switchMode,
    toggleTimer,
    resetTimer,
    updateDuration,
  }), [
    modes,
    modeIdx,
    currentMode,
    timeLeft,
    isActive,
    sessionCount,
    sessionLogged,
    isLogging,
    switchMode,
    toggleTimer,
    resetTimer,
    updateDuration,
  ]);

  return (
    <FocusTimerContext.Provider value={value}>
      {children}
    </FocusTimerContext.Provider>
  );
};

export const useFocusTimer = () => {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error('useFocusTimer must be used inside FocusTimerProvider');
  }
  return context;
};
