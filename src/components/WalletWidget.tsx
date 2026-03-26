import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

interface WalletProps {
  balance: string;
  pnlValue: string;
  pnlPercentage: string;
  isPositive: boolean;
}

export function WalletWidget({ balance, pnlValue, pnlPercentage, isPositive }: WalletProps) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-sm p-6 flex flex-col justify-between h-full shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-all duration-500">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none group-hover:bg-primary/20 transition-all" />
      <div className="flex items-center gap-2 text-muted-foreground mb-4 relative z-10">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="text-sm uppercase tracking-widest font-bold">My Wallet</h2>
      </div>
      <div className="relative z-10">
        <div className="text-5xl font-black tracking-tight text-foreground mb-3 drop-shadow-md">{balance}</div>
        <div className={`flex items-center gap-2 text-base font-bold bg-background/50 w-fit px-4 py-1.5 rounded-full border border-white/5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          <span>{isPositive ? '+' : ''}{pnlValue} ({pnlPercentage})</span>
        </div>
      </div>
    </div>
  );
}
