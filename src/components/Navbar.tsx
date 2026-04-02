import { useEffect, useState } from 'react';
import { UserCircle, ShieldAlert, ChevronDown, Cpu, LayoutList, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ModeToggle } from './mode-toggle';
import { fetchBots, type Bot } from '../services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(false);
  const [botsError, setBotsError] = useState('');
  const menuItemClass = 'font-sans text-[15px] text-text-primary focus:bg-bg-terminal focus:text-text-primary';

  useEffect(() => {
    let cancelled = false;

    const loadBots = async () => {
      setIsLoadingBots(true);
      setBotsError('');
      try {
        const data = await fetchBots();
        if (!cancelled) {
          setBots(data);
        }
      } catch {
        if (!cancelled) {
          setBotsError('Unable to load bots');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBots(false);
        }
      }
    };

    loadBots();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="dash-navbar w-full h-16 flex items-center justify-between px-6 z-50 shrink-0">
      <div 
        className="flex items-center gap-2 text-text-primary hover:text-accent transition-colors cursor-pointer" 
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            <TrendingUp size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">NEXTBULL</span>
      </div>

      <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 gap-8 text-sm font-medium text-text-secondary">
        <button 
          onClick={() => navigate('/terminal')} 
          className={`dash-nav-btn transition-colors cursor-pointer ${isActive('/terminal') ? 'text-text-primary !font-bold' : ''}`}
        >
          Terminal
        </button>
        <button 
          onClick={() => navigate('/user/dashboard')} 
          className={`dash-nav-btn transition-colors cursor-pointer ${isActive('/user/dashboard') ? 'text-text-primary !font-bold' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => navigate('/admin/dashboard')} 
          className={`dash-nav-btn transition-colors cursor-pointer ${isActive('/admin/dashboard') ? 'text-text-primary !font-bold' : ''}`}
        >
          Bots
        </button>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <ModeToggle />
        <div className="h-5 w-px bg-border-subtle" />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="tv-glass-btn px-3 py-1.5 rounded-full text-text-secondary hover:text-text-primary cursor-pointer"
            title="Profile and bots"
          >
            <UserCircle className="w-4 h-4" />
            <ChevronDown className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 rounded-[10px] border border-border-subtle bg-bg-elevated p-2 font-sans text-text-primary shadow-[0_12px_30px_rgba(15,23,42,0.28)]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-sans text-[12px] font-medium tracking-wide text-text-secondary">
                Quick Navigation
              </DropdownMenuLabel>
              <DropdownMenuItem className={menuItemClass} onClick={() => navigate('/user/dashboard')}>
                <UserCircle className="w-4 h-4" />
                User Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass} onClick={() => navigate('/admin/dashboard')}>
                <LayoutList className="w-4 h-4" />
                Bots Dashboard
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border-subtle" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-sans text-[12px] font-medium tracking-wide text-text-secondary">
                Bots
              </DropdownMenuLabel>

              {isLoadingBots && (
                <DropdownMenuItem className={menuItemClass} disabled>
                  <Cpu className="w-4 h-4" />
                  Loading bots...
                </DropdownMenuItem>
              )}

              {!isLoadingBots && botsError && (
                <DropdownMenuItem className={menuItemClass} disabled>
                  <ShieldAlert className="w-4 h-4" />
                  {botsError}
                </DropdownMenuItem>
              )}

              {!isLoadingBots && !botsError && bots.length === 0 && (
                <DropdownMenuItem className={menuItemClass} disabled>
                  <Cpu className="w-4 h-4" />
                  No bots available
                </DropdownMenuItem>
              )}

              {!isLoadingBots && !botsError && bots.slice(0, 6).map((bot) => (
                <DropdownMenuItem className={menuItemClass} key={bot.id} onClick={() => navigate(`/admin/dashboard/bot/${bot.id}`)}>
                  <Cpu className="w-4 h-4" />
                  <span className="max-w-55 truncate">{bot.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            {!isLoadingBots && !botsError && bots.length > 6 && (
              <>
                <DropdownMenuSeparator className="bg-border-subtle" />
                <DropdownMenuItem className={menuItemClass} onClick={() => navigate('/admin/dashboard')}>
                  <LayoutList className="w-4 h-4" />
                  View all bots
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
