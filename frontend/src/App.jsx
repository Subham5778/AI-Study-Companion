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
    <div className="bg-background min-h-screen text-textMain font-sans md:flex">
      <Sidebar />
      <main className="min-w-0 w-full flex-1 px-4 py-6 pb-28 sm:px-6 md:ml-64 md:h-screen md:overflow-y-auto md:p-8">
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
