import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, BrainCircuit, Timer, LogOut, Award, BookOpen, Code2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/coding', icon: Code2, label: 'DSA Coding Challenges' },
    { path: '/plans', icon: CalendarDays, label: 'Study Plans' },
    { path: '/hr-round', icon: BookOpen, label: 'HR Round Questions' },
    { path: '/tests', icon: BrainCircuit, label: 'Mock Tests' },
    { path: '/focus', icon: Timer, label: 'Focus Mode' },
  ];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 bg-surface border-r border-white/5 flex flex-col pt-8 pb-4 px-4 z-50">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primaryDark flex items-center justify-center text-white font-bold text-xl shadow-lg">
          AI
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">Study<br/>Companion</h1>
        </div>
      </div>

      <div className="mb-8 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
        <img src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'study'}`} alt="Avatar" className="w-12 h-12 rounded-full bg-black/50" />
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-white truncate">{user?.name || 'Guest User'}</p>
          <div className="flex items-center gap-1 text-xs text-warning mt-1">
            <Award size={12} />
            <span>Lvl {user?.level || 1} </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'text-textMuted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-primary' : ''} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-textMuted hover:text-danger hover:bg-danger/10 rounded-xl transition-colors mt-auto w-full">
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
};

export default Sidebar;
