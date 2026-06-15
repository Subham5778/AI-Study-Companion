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
    <aside className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-surface/95 px-2 py-2 shadow-2xl backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-64 md:border-r md:border-t-0 md:border-white/5 md:px-4 md:pb-4 md:pt-8">
      <div className="hidden items-center gap-3 px-2 mb-10 md:flex">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primaryDark flex items-center justify-center text-white font-bold text-xl shadow-lg">
          AI
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-tight">Study<br/>Companion</h1>
        </div>
      </div>

      <div className="mb-8 hidden px-4 py-3 rounded-2xl bg-white/5 border border-white/5 items-center gap-4 md:flex">
        <img src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'study'}`} alt="Avatar" className="w-12 h-12 rounded-full bg-black/50" />
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-white truncate">{user?.name || 'Guest User'}</p>
          <div className="flex items-center gap-1 text-xs text-warning mt-1">
            <Award size={12} />
            <span>Lvl {user?.level || 1} </span>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-[env(safe-area-inset-bottom)] md:flex-1 md:flex-col md:gap-0 md:space-y-2 md:overflow-visible md:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[10px] transition-all duration-300 md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-left md:text-base ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'text-textMuted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} className={`shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span className="line-clamp-2 font-medium leading-tight md:line-clamp-none md:truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[10px] font-medium leading-tight text-textMuted transition-colors hover:bg-danger/10 hover:text-danger md:hidden"
        >
          <LogOut size={20} className="shrink-0" />
          Logout
        </button>
      </nav>

      <button onClick={logout} className="mt-auto hidden w-full items-center gap-3 rounded-xl px-4 py-3 text-textMuted transition-colors hover:bg-danger/10 hover:text-danger md:flex">
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
