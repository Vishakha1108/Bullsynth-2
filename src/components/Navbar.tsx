import { Activity, LogOut, Monitor, UserCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { ModeToggle } from './mode-toggle';
import useMarketStore from '../store/useMarketStore';

export function Navbar() {
  const navigate = useNavigate();
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
          onClick={() => navigate('/terminal')}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text-primary dash-nav-btn rounded transition-all cursor-pointer"
        >
          <Monitor className="w-3.5 h-3.5" />
          Terminal
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
