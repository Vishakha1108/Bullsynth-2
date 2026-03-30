import { Monitor, UserCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { ModeToggle } from './mode-toggle';

export function Navbar() {
  const navigate = useNavigate();

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
      </div>
    </nav>
  );
}
