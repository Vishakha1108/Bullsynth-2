import { useState } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  value: string;
  changeValue: string;
  changePercentage: string;
  isPositive: boolean;
  symbolColor?: string;
  marketCap?: string;
  volume?: string;
}

interface AssetListProps {
  assets: Asset[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

export function AssetList({ assets, selectedAssetId, onSelectAsset }: AssetListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'GAINERS' | 'LOSERS'>('ALL');

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'GAINERS') return matchesSearch && asset.isPositive;
    if (filterType === 'LOSERS') return matchesSearch && !asset.isPositive;
    return matchesSearch;
  });

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-md p-5 flex flex-col h-full shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-3">
        <h2 className="text-sm uppercase tracking-widest font-bold text-muted-foreground">Asset List</h2>
      </div>

      <div className="flex flex-col gap-3 mb-4 px-3 shrink-0">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-md pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`flex-1 text-xs font-bold py-1.5 rounded-sm border transition-all ${filterType === 'ALL' ? 'bg-primary/20 border-primary/40 text-foreground' : 'bg-background/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            ALL
          </button>
          <button 
            onClick={() => setFilterType('GAINERS')}
            className={`flex-1 text-xs font-bold py-1.5 rounded-sm border transition-all flex items-center justify-center gap-1 ${filterType === 'GAINERS' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-background/40 border-border text-muted-foreground hover:bg-muted hover:text-green-400/70'}`}
          >
            <TrendingUp className="w-3 h-3" /> GAINERS
          </button>
          <button 
            onClick={() => setFilterType('LOSERS')}
            className={`flex-1 text-xs font-bold py-1.5 rounded-sm border transition-all flex items-center justify-center gap-1 ${filterType === 'LOSERS' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-background/40 border-border text-muted-foreground hover:bg-muted hover:text-red-400/70'}`}
          >
            <TrendingDown className="w-3 h-3" /> LOSERS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar relative z-10">
        {filteredAssets.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70 p-4 text-center">
             <Search className="w-8 h-8 mb-3 opacity-50" />
             <p className="text-sm font-semibold uppercase tracking-widest">No assets found</p>
           </div>
        ) : (
          filteredAssets.map(asset => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset.id)}
              className={`w-full group flex items-center justify-between p-4 rounded-sm transition-all duration-300 border text-left cursor-pointer shadow-md overflow-hidden relative ${
                selectedAssetId === asset.id
                  ? 'bg-primary/20 border-primary/50 text-foreground ring-1 ring-primary/30'
                  : 'bg-background/80 border-border hover:bg-muted hover:border-primary/20 hover:text-foreground text-muted-foreground'
              }`}
            >
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-sm transition-all duration-300 ${selectedAssetId === asset.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}
                style={{ backgroundColor: asset.symbolColor || 'var(--primary)' }}
              />
              <div className="flex items-center gap-4 pl-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg text-base tracking-wider"
                  style={{ backgroundColor: asset.symbolColor || '#333' }}
                >
                  {asset.symbol}
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg">{asset.name}</span>
                  <span className="text-sm font-semibold uppercase opacity-70 leading-none">{asset.symbol}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 pr-1">
                <span className="font-bold tabular-nums tracking-tight text-lg">{asset.value}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded flex items-center bg-background border border-border ${asset.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {asset.isPositive ? '+' : '-'}{asset.changePercentage}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
