import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  RefreshCcw, 
  Calendar,
  AlertCircle,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Icons & UI Components ---

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("glass rounded-3xl p-6 shadow-xl", className)}>
    {children}
  </div>
);

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider", className)}>
    {children}
  </span>
);

// --- Simulation Hook ---

const useSimulation = (weeklyAmount: number, weeks: number, btcAlloc: number, ethAlloc: number, xrpAlloc: number) => {
  return useMemo(() => {
    const totalInvested = weeklyAmount * weeks;
    
    // Scenarios from the strategy md
    const scenarios = [
      { name: 'Conservative', multiplier: 1.325 }, // Avg of 30-35%
      { name: 'Neutral', multiplier: 1.8 },      // Avg of 70-90%
      { name: 'Bull Case', multiplier: 2.4 }     // Avg of 120-160%
    ];

    const data = Array.from({ length: weeks + 1 }, (_, i) => {
      const investedAtWeek = weeklyAmount * i;
      return {
        week: i,
        invested: investedAtWeek,
        conservative: Math.round(investedAtWeek * (1 + (scenarios[0].multiplier - 1) * (i / weeks))),
        neutral: Math.round(investedAtWeek * (1 + (scenarios[1].multiplier - 1) * (i / weeks))),
        bull: Math.round(investedAtWeek * (1 + (scenarios[2].multiplier - 1) * (i / weeks))),
      };
    });

    return {
      totalInvested,
      data,
      scenarios: scenarios.map(s => ({
        ...s,
        finalValue: Math.round(totalInvested * s.multiplier),
        roi: Math.round((s.multiplier - 1) * 100)
      }))
    };
  }, [weeklyAmount, weeks, btcAlloc, ethAlloc, xrpAlloc]);
};

// --- Main App Component ---

const App: React.FC = () => {
  const [prices, setPrices] = useState<{ [key: string]: number }>({
    BTC: 0,
    ETH: 0,
    XRP: 0
  });

  const [weeklyAmount, setWeeklyAmount] = useState(1000000);
  const [weeks, setWeeks] = useState(52); // Default to 1 year
  
  const btcAlloc = 60;
  const ethAlloc = 30;
  const xrpAlloc = 10;

  const { totalInvested, data, scenarios } = useSimulation(weeklyAmount, weeks, btcAlloc, ethAlloc, xrpAlloc);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: {
            ids: 'bitcoin,ethereum,ripple',
            vs_currencies: 'krw'
          }
        });
        setPrices({
          BTC: response.data.bitcoin.krw,
          ETH: response.data.ethereum.krw,
          XRP: response.data.ripple.krw
        });

      } catch (error) {
        console.error("Error fetching prices:", error);
        // Fallback or handle error
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const pieData = [
    { name: 'BTC', value: btcAlloc, color: '#f7931a' },
    { name: 'ETH', value: ethAlloc, color: '#627eea' },
    { name: 'XRP', value: xrpAlloc, color: '#23292f' },
  ];

  const formatKRW = (val: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-10 px-4 md:px-10 text-slate-100">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mb-12 flex flex-col md:flex-row justify-between items-center gap-6"
      >
        <div className="flex flex-col">
          <h1 className="text-5xl font-black tracking-tight gradient-text mb-2 tracking-tighter">
            COIN WEEKLY
          </h1>
          <p className="text-slate-400 font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            Institutional DCA Strategy Dashboard
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            {Object.entries(prices).map(([symbol, price]) => (
              <Card key={symbol} className="px-4 py-2 rounded-2xl flex items-center gap-3">
                <span className="font-bold text-sm text-slate-300">{symbol}</span>
                <span className="font-mono text-xs">{formatKRW(price)}</span>
              </Card>
            ))}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="p-3 rounded-full glass glass-hover transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Allocation */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="flex flex-col gap-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                Investment Params
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400">Weekly Amount</label>
                    <span className="font-bold text-indigo-400">{formatKRW(weeklyAmount)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="100000" 
                    max="5000000" 
                    step="50000"
                    value={weeklyAmount}
                    onChange={(e) => setWeeklyAmount(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-400">Duration (Weeks)</label>
                    <span className="font-bold text-purple-400">{weeks} Weeks</span>
                  </div>
                  <input 
                    type="range" 
                    min="12" 
                    max="104" 
                    step="4"
                    value={weeks}
                    onChange={(e) => setWeeks(Number(e.target.value))}
                    className="w-full accent-purple-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Total Capital</span>
                  <span className="font-bold text-xl">{formatKRW(totalInvested)}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-pink-400" />
                Portfolio Allocation
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around mt-4">
                {pieData.map(item => (
                  <div key={item.name} className="flex flex-col items-center">
                    <span className="text-xs text-slate-400 uppercase font-bold">{item.name}</span>
                    <span className="text-lg font-black" style={{ color: item.color }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Charts & Scenarios */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-96">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  Performance Simulation
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickFormatter={(val) => `W${val}`} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(val: any) => formatKRW(Number(val))}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="invested" stroke="#475569" fillOpacity={1} fill="url(#colorInvested)" name="Cumulative Capital" strokeWidth={2} />
                    <Area type="monotone" dataKey="neutral" stroke="#8b5cf6" fillOpacity={1} fill="none" name="Neutral Forecast" strokeWidth={3} />
                    <Area type="monotone" dataKey="bull" stroke="#10b981" fillOpacity={1} fill="url(#colorBull)" name="Bull Market" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenarios.map((s, idx) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
              >
                <Card className={cn(
                  "p-5 relative overflow-hidden transition-all hover:scale-[1.02]",
                  s.name === 'Bull Case' ? 'border-emerald-500/30' : 
                  s.name === 'Neutral' ? 'border-purple-500/30' : 'border-slate-500/30'
                )}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.name}</span>
                      <Badge className={cn(
                        s.name === 'Bull Case' ? 'bg-emerald-500/20 text-emerald-400' : 
                        s.name === 'Neutral' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-500/20 text-slate-400'
                      )}>
                        +{s.roi}% ROI
                      </Badge>
                    </div>
                    <div className="text-2xl font-black mb-1">{formatKRW(s.finalValue)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Expected return after {weeks} weeks
                    </div>
                  </div>
                  {/* Decorative faint icon */}
                  <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
                    <TrendingUp className="w-24 h-24" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-6xl mt-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center border-t border-slate-800 pt-10"
      >
        <div className="space-y-4">
          <h4 className="text-xl font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Strategy Notes
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
              Base Rule: Buy once per week (Monday/Wednesday)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
              Advanced Rule: Buy 1.5x on -3% dip, 2x on -5% dip.
            </li>
            <li className="flex items-start gap-2 text-indigo-300 font-medium">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Focus: BTC led recovery, ETH followed by Alts.
            </li>
          </ul>
        </div>

        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <p className="text-sm font-medium italic text-indigo-300 mb-4">
            "DCA is not about timing the market, it's about time in the market. Stick to the discipline."
          </p>
          <div className="flex gap-4">
             <Badge className="bg-slate-800 text-slate-300">Minimum: 6 mo</Badge>
             <Badge className="bg-slate-800 text-slate-300">Target: 12-24 mo</Badge>
          </div>
        </Card>
      </motion.footer>
    </div>
  );
};

export default App;
