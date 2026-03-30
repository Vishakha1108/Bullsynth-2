import { Activity, LogOut, Monitor, UserCircle, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ModeToggle } from './mode-toggle';
import useMarketStore from '../store/useMarketStore';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUserId = useMarketStore((state) => state.setUserId);

  const handleLogout = () => {
    setUserId(null);
    navigate('/');
  };

  return (
    <nav className="dash-navbar w-full h-14 flex items-center justify-between px-8 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <span className="text-base font-bold tracking-wider text-text-primary">NEXTBULL</span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <button
          onClick={() => navigate('/user/dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            location.pathname === '/user/dashboard' 
              ? 'bg-accent/10 text-accent border border-accent/20' 
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => navigate('/terminal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            location.pathname === '/terminal' 
              ? 'bg-accent/10 text-accent border border-accent/20' 
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Terminal
        </button>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            location.pathname === '/admin/dashboard' 
              ? 'bg-accent/10 text-accent border border-accent/20' 
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Admin
        </button>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <div className="h-5 w-px bg-border-subtle" />
        <button className="p-2 dash-nav-btn rounded transition-all cursor-pointer text-text-secondary hover:text-text-primary" title="Profile">
          <UserCircle className="w-5 h-5" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 dash-nav-btn rounded transition-all cursor-pointer text-text-secondary hover:text-text-primary"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
