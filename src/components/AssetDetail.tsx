import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Globe, ActivitySquare } from 'lucide-react';

interface AssetDetailProps {
  asset: {
    id: string;
    symbol: string;
    symbolColor?: string;
    name: string;
    value: string;
    changeValue: string;
    changePercentage: string;
    isPositive: boolean;
    marketCap?: string;
    volume?: string;
    priceHistory: Array<{ time: string; price: number }>;
  };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { time: string }; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur-md border border-border p-3 rounded-md shadow-2xl">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{payload[0].payload.time}</p>
        <p className="text-lg font-black text-foreground tabular-nums">${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export function AssetDetail({ asset }: AssetDetailProps) {
  if (!asset) {
    return (
      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-md p-6 flex flex-col items-center justify-center text-muted-foreground transition-all duration-500">
        <Activity className="w-12 h-12 mb-4 opacity-30 text-primary animate-pulse" />
        <p className="font-semibold tracking-widest uppercase text-xs">Select an asset to view details</p>
      </div>
    );
  }

  return (
      <div className="bg-card/50 backdrop-blur-xl border border-border rounded-md p-6 flex flex-col shadow-2xl relative overflow-hidden transition-all duration-500">
      {/* Background glow decoration */}
      <div 
        className="absolute top-0 right-0 w-80 h-80 opacity-10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: asset.symbolColor || 'var(--primary)' }}
      />
      
      <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-4">Asset Performance</h2>
      
      <div className="flex items-start justify-between mb-6 z-10 w-full">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-sm flex items-center justify-center font-black text-2xl text-white shadow-2xl border border-white/10 relative overflow-hidden"
            style={{ backgroundColor: asset.symbolColor || '#333' }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20 pointer-events-none" />
            {asset.symbol}
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground drop-shadow-md tracking-tight mb-1">{asset.name}</h1>
            <div className="flex gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-widest font-bold bg-background/50 px-2 py-0.5 rounded-full border border-border">
                {asset.symbol}
              </span>
              <span className="text-primary text-xs uppercase tracking-widest font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          <div className="text-4xl font-black text-foreground tabular-nums tracking-tighter mb-2 animate-in fade-in slide-in-from-top-2">{asset.value}</div>
          <div className={`flex items-center gap-1.5 font-bold px-3 py-1 rounded-full border shadow-inner text-sm ${asset.isPositive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {asset.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {asset.isPositive ? '+' : '-'}{asset.changeValue} ({asset.changePercentage})
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6 z-10 font-bold uppercase tracking-widest">
        <div className="bg-background/40 backdrop-blur shadow-inner border border-border p-4 rounded-sm flex items-center gap-4 relative overflow-hidden group hover:bg-background/60 transition-colors">
          <div className="w-10 h-10 rounded-sm bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
             <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-0.5">Market Cap</div>
            <div className="text-xl font-black text-foreground tracking-tight">{asset.marketCap || 'N/A'}</div>
          </div>
        </div>
        <div className="bg-background/40 backdrop-blur shadow-inner border border-border p-4 rounded-sm flex items-center gap-4 relative overflow-hidden group hover:bg-background/60 transition-colors">
          <div className="w-10 h-10 rounded-sm bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
             <ActivitySquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-0.5">24h Volume</div>
            <div className="text-xl font-black text-foreground tracking-tight">{asset.volume || 'N/A'}</div>
          </div>
        </div>
      </div>
      
      <div className="h-[300px] shrink-0 rounded-sm border border-border bg-background/30 backdrop-blur-md shadow-inner z-10 relative overflow-hidden p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={asset.priceHistory}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={asset.symbolColor || '#3b82f6'} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={asset.symbolColor || '#3b82f6'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: asset.symbolColor || '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={asset.symbolColor || '#3b82f6'} 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
