import { useEffect, useState } from 'react';
import { Activity, Monitor, UserCircle, ShieldAlert, ChevronDown, Cpu, LayoutList } from "lucide-react";
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
    <nav className="dash-navbar w-full h-14 flex items-center justify-between px-8 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <span className="inline-flex h-7 w-7 items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5 block"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000" />
              <path d="M6 16 L10 12 L13 14 L18 9" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.5 9H18V11.5" fill="none" stroke="#2962FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="mt-px text-base font-bold tracking-wider text-text-primary">NEXTBULL</span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <button
          onClick={() => navigate('/terminal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            isActive('/terminal')
              ? 'bg-[#2962ff]/12 text-[#2962ff] border border-[#2962ff]/30'
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          Terminal
        </button>
        <button
          onClick={() => navigate('/user/dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            isActive('/user/dashboard')
              ? 'bg-[#2962ff]/12 text-[#2962ff] border border-[#2962ff]/30'
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-all cursor-pointer ${
            isActive('/admin/dashboard')
              ? 'bg-[#2962ff]/12 text-[#2962ff] border border-[#2962ff]/30'
              : 'text-text-secondary hover:text-text-primary dash-nav-btn'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Bots Dashboard
        </button>
      </div>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <div className="h-5 w-px bg-border-subtle" />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1.5 px-2 py-1.5 dash-nav-btn rounded transition-all cursor-pointer text-text-secondary hover:text-text-primary"
            title="Profile and bots"
          >
            <UserCircle className="w-5 h-5" />
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
