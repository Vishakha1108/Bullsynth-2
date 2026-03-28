import { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { WalletWidget } from './WalletWidget';
import { BotsWidget } from './BotsWidget';
import { AssetList } from './AssetList';
import { AssetDetail } from './AssetDetail';
import { MarketPerformersWidget } from './MarketPerformersWidget';
import { ThemeProvider } from './theme-provider';
import mockData from '../Data/mockData.json';

export default function Dashboard() {
  const [selectedBotId, setSelectedBotId] = useState<string>(mockData.bots[0].id);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const selectedBot = mockData.bots.find(b => b.id === selectedBotId) || mockData.bots[0];
  const assetsForBot = selectedBot.assets;
  
  const selectedAsset = assetsForBot.find(a => a.id === selectedAssetId) || 
    (assetsForBot.length > 0 ? assetsForBot[0] : null);

  useEffect(() => {
    // When bot changes, select its first asset automatically
    if (selectedBot.assets.length > 0) {
      setSelectedAssetId(selectedBot.assets[0].id);
    } else {
      setSelectedAssetId(null);
    }
  }, [selectedBotId]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme" attribute="class">
      <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col font-sans selection:bg-primary/30 relative">
        {/* Abstract background elements for 'blue black theme' */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
           <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
           <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
           <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        </div>

        <Navbar />
        
        {/* Main container */}
        <main className="flex-1 min-h-0 p-4 lg:p-6 max-w-[2000px] w-full mx-auto flex flex-col gap-6 z-10">
          
          {/* Top Row: Wallet, Bots (reduced width) */}
          <div className="flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 shrink-0">
             
             <div className="w-full md:w-80 md:h-[220px]">
               <WalletWidget 
                 balance={mockData.user.wallet.balance}
                 pnlValue={mockData.user.wallet.pnlValue}
                 pnlPercentage={mockData.user.wallet.pnlPercentage}
                 isPositive={mockData.user.wallet.isPositive}
               />
             </div>
             
             <div className="w-full md:w-[550px] shrink-0 md:h-[220px]">
               <BotsWidget 
                 bots={mockData.bots}
                 selectedBotId={selectedBotId}
                 onSelectBot={setSelectedBotId}
               />
             </div>
             
             {/* Market Performers occupying remaining space */}
             <div className="hidden md:block flex-1 min-w-0 md:h-[220px]">
               <MarketPerformersWidget performers={mockData.marketPerformers} />
             </div>
          </div>

          {/* Bottom Row: List Detail (2/3 width), List (1/3 width) - fully scrollable area */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
            <div className="lg:w-2/3 h-full overflow-y-auto pr-2 custom-scrollbar">
               <AssetDetail asset={selectedAsset!} />
            </div>
            <div className="lg:w-1/3 h-full overflow-y-auto pr-2 custom-scrollbar">
               <AssetList 
                 assets={assetsForBot} 
                 selectedAssetId={selectedAssetId}
                 onSelectAsset={setSelectedAssetId}
               />
            </div>
          </div>
        </main>
        
        {/* Footer matching wireframe */}
        <footer className="p-3 border-t border-border bg-background/50 backdrop-blur-sm z-10 shrink-0">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <p className="text-muted-foreground text-xs tracking-widest font-semibold uppercase">&copy; 2026 NEXTBULL. All rights reserved.</p>
            <div className="flex gap-4 text-xs tracking-widest font-semibold uppercase text-muted-foreground">
               <button className="hover:text-primary transition-colors cursor-pointer">Privacy</button>
               <button className="hover:text-primary transition-colors cursor-pointer">Terms</button>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
