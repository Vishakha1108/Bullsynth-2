import { Activity, LogOut } from "lucide-react";
import { ModeToggle } from './mode-toggle';

export function Navbar() {
  return (
    <nav className="w-full h-16 flex items-center justify-between px-8 bg-card border-b border-border shadow-2xl z-50">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-widest text-foreground">NEXTBULL</span>
      </div>
      <div className="flex items-center gap-6">
        <ModeToggle />
        <div className="h-6 w-px bg-border mx-2" />
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold tracking-wide text-foreground">Alex Carter</span>
          <button className="p-3 bg-background/50 hover:bg-primary/20 rounded-full transition-all cursor-pointer text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 shadow-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
