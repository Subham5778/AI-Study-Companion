import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Coding from './pages/Coding';
import StudyPlans from './pages/StudyPlans';
import HRRound from './pages/HRRound';
import MockTests from './pages/MockTests';
import FocusMode from './pages/FocusMode';
import Auth from './pages/Auth';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
     return <div className="min-h-screen bg-background flex justify-center items-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  if (!user) {
     return <Auth />;
  }

  return (
    <div className="flex bg-background min-h-screen text-textMain font-sans">
      <Sidebar />
      <main className="flex-1 p-8 ml-64 overflow-y-auto h-screen relative">
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
