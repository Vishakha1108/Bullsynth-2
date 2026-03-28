import { useState } from 'react';
import { TrendingUp, Flame, ChevronDown } from 'lucide-react';

interface Performer {
  id: string;
  symbol: string;
  name: string;
  value: string;
  changeValue: string;
  changePercentage: string;
  isPositive: boolean;
  symbolColor?: string;
}

interface MarketPerformersWidgetProps {
  performers: Performer[];
}

export function MarketPerformersWidget({ performers }: MarketPerformersWidgetProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeAsset = performers[selectedIndex];

  if (!activeAsset) return null;

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-sm p-6 flex flex-col justify-between h-full shadow-2xl relative overflow-hidden group hover:border-green-500/30 transition-all duration-500">
      
      {/* Background ambient glow effect based on asset color */}
      <div 
        className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors duration-700"
        style={{ backgroundColor: activeAsset.symbolColor || '#22c55e' }}
      />
      
      {/* Header section with Dropdown */}
      <div className="flex items-center justify-between relative z-10 shrink-0 mb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Flame className="w-5 h-5 text-green-500" />
          <h2 className="text-sm uppercase tracking-widest font-bold hidden sm:block">Top Market Performers</h2>
          <h2 className="text-sm uppercase tracking-widest font-bold sm:hidden">Performers</h2>
        </div>
        
        {/* Custom Glassmorphic Select Wrapper */}
        <div className="relative group/select">
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-sm bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            Other Stocks <ChevronDown className="w-3 h-3 group-hover/select:text-foreground" />
          </button>
          <select 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-foreground bg-background"
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
          >
            {performers.map((p, idx) => (
              <option key={p.id} value={idx}>{p.name} ({p.symbol})</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Main Single Asset Display */}
      <div className="flex-1 flex flex-col justify-end relative z-10 animate-in fade-in zoom-in-95 duration-500" key={activeAsset.id}>
        
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-lg tracking-wider"
            style={{ backgroundColor: activeAsset.symbolColor || '#333' }}
          >
            {activeAsset.symbol}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl leading-none">{activeAsset.name}</span>
            <span className="text-sm font-semibold uppercase text-muted-foreground tracking-widest leading-normal">{activeAsset.symbol}</span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <h3 className="text-4xl md:text-5xl font-black tabular-nums tracking-tighter text-foreground">
            ${activeAsset.value}
          </h3>
          <div className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            +${activeAsset.changeValue} ({activeAsset.changePercentage})
          </div>
        </div>
      </div>
      
    </div>
  );
}
