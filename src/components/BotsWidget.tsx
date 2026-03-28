import { Bot, TrendingUp, TrendingDown } from 'lucide-react';

interface BotData {
  id: string;
  name: string;
  pnlValue: string;
  pnlPercentage: string;
  isPositive: boolean;
}

interface BotsWidgetProps {
  bots: BotData[];
  selectedBotId: string;
  onSelectBot: (id: string) => void;
}

export function BotsWidget({ bots, selectedBotId, onSelectBot }: BotsWidgetProps) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-sm p-6 flex flex-col h-full shadow-2xl relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 text-muted-foreground mb-3 relative z-10 shrink-0">
        <Bot className="w-4 h-5 text-primary" />
        <h2 className="text-sm uppercase tracking-widest font-bold">My Bots</h2>
      </div>
      <div className="flex flex-col gap-3 flex-1 relative z-10 overflow-y-auto pr-2 custom-scrollbar">
        {bots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => onSelectBot(bot.id)}
            className={`group flex items-center justify-between p-4 rounded-sm border transition-all duration-300 cursor-pointer shadow-lg outline-none shrink-0 ${selectedBotId === bot.id
                ? 'bg-primary/20 border-primary/50 text-foreground ring-2 ring-primary/20 translate-x-1'
                : 'bg-background hover:bg-muted border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
          >
            <span className="font-bold tracking-wide text-lg">{bot.name}</span>
            <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full bg-background/50 border border-border ${bot.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {bot.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {bot.pnlValue}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
