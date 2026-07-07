import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Coding from './pages/Coding';
import StudyPlans from './pages/StudyPlans';
import HRRound from './pages/HRRound';
import MockTests from './pages/MockTests';
import FocusMode from './pages/FocusMode';
import Auth from './pages/Auth';
import PublicCodingProfile from './pages/PublicCodingProfile';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FocusTimerProvider } from './context/FocusTimerContext';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [location.pathname, user]);
  
  if (loading) {
     return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  if (location.pathname.startsWith('/public/')) {
    return (
      <Routes>
        <Route path="/public/:userId" element={<PublicCodingProfile />} />
        <Route path="*" element={<Navigate to="/public/not-found" replace />} />
      </Routes>
    );
  }

  if (!user) {
     return <Auth />;
  }

  return (
    <FocusTimerProvider>
      <div className="bg-background min-h-screen text-textMain font-sans md:flex">
        <Sidebar />
        <main ref={mainRef} className="min-w-0 w-full flex-1 px-4 py-6 pb-28 sm:px-6 md:ml-64 md:h-screen md:overflow-y-auto md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/coding" element={<Coding />} />
            <Route path="/plans" element={<StudyPlans />} />
            <Route path="/hr-round" element={<HRRound />} />
            <Route path="/tests" element={<MockTests />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </FocusTimerProvider>
  );
};

function App() {
  return (
    <AuthProvider>
       <AppContent />
    </AuthProvider>
  );
}

export default App;
