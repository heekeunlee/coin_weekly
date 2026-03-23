import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  RefreshCcw, 
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
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
  <div className={cn("toss-card p-6", className)}>
    {children}
  </div>
);

const Badge = ({ children, className, variant = 'blue' }: { children: React.ReactNode, className?: string, variant?: 'blue' | 'red' | 'gray' }) => (
  <span className={cn(
    "px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-tighter",
    variant === 'blue' && "bg-[#ebf4ff] text-[#3182f6]",
    variant === 'red' && "bg-[#fff0f0] text-[#f04452]",
    variant === 'gray' && "bg-[#f2f4f6] text-[#8b95a1]",
    className
  )}>
    {children}
  </span>
);

// --- Fixed Holding Data from Screenshot ---
const HOLDINGS = {
  BTC: { amount: 0.00583222, avgPrice: 102162589 },
  ETH: { amount: 0.1, avgPrice: 3094000 },
  XRP: { amount: 50, avgPrice: 2084 }
};

// --- Simulation Hook ---
const useSimulation = (weeklyAmount: number, weeks: number) => {
  return useMemo(() => {
    const totalInvested = weeklyAmount * weeks;
    const scenarios = [
      { name: '보수적', multiplier: 1.325, color: '#8b95a1' },
      { name: '중립적', multiplier: 1.8, color: '#3182f6' },
      { name: '불장', multiplier: 2.4, color: '#f04452' }
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
  }, [weeklyAmount, weeks]);
};

// --- Main App Component ---

const App: React.FC = () => {
  const [prices, setPrices] = useState<{ [key: string]: number }>({
    BTC: 0,
    ETH: 0,
    XRP: 0
  });
  const [weeklyAmount, setWeeklyAmount] = useState(1000000);
  const [weeks, setWeeks] = useState(52); 

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
          params: { ids: 'bitcoin,ethereum,ripple', vs_currencies: 'krw' }
        });
        setPrices({
          BTC: response.data.bitcoin.krw,
          ETH: response.data.ethereum.krw,
          XRP: response.data.ripple.krw
        });
      } catch (error) {
        console.error("Error fetching prices:", error);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const { totalInvested, data, scenarios } = useSimulation(weeklyAmount, weeks);

  const portfolioStats = useMemo(() => {
    const totalBuyPrice = (HOLDINGS.BTC.amount * HOLDINGS.BTC.avgPrice) + 
                          (HOLDINGS.ETH.amount * HOLDINGS.ETH.avgPrice) + 
                          (HOLDINGS.XRP.amount * HOLDINGS.XRP.avgPrice);
    
    const totalCurrentVal = (HOLDINGS.BTC.amount * (prices.BTC || 0)) + 
                            (HOLDINGS.ETH.amount * (prices.ETH || 0)) + 
                            (HOLDINGS.XRP.amount * (prices.XRP || 0));
    
    const totalProfit = totalCurrentVal - totalBuyPrice;
    const totalRoi = (totalProfit / totalBuyPrice) * 100;

    return { totalBuyPrice, totalCurrentVal, totalProfit, totalRoi };
  }, [prices]);

  const formatKRW = (val: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(val);
  };



  return (
    <div className="min-h-screen w-full flex flex-col items-center py-12 px-4 md:px-0 max-w-[640px] mx-auto text-[#1a1a1a]">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-8 flex flex-col gap-1 px-4"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tight text-[#1a1a1a]">투자 내역</h1>
          <button 
            onClick={() => window.location.reload()}
            className="p-2.5 rounded-full bg-white shadow-sm transition-all active:scale-95"
          >
            <RefreshCcw className="w-5 h-5 toss-gray" />
          </button>
        </div>
        <div className="flex gap-4 border-b border-[#e5e8eb] pt-4">
          <button className="pb-3 border-b-2 border-[#1a1a1a] font-bold text-sm">보유자산</button>
          <button className="pb-3 text-sm toss-gray font-medium">투자손익</button>
          <button className="pb-3 text-sm toss-gray font-medium">거래내역</button>
        </div>
      </motion.header>

      <div className="w-full flex flex-col gap-4 pb-20">
        {/* Today's Returns (Screenshot Mockup Visualization) */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">오늘의 자산 현황</h3>
              <Badge variant={portfolioStats.totalProfit >= 0 ? 'red' : 'blue'}>
                {portfolioStats.totalProfit >= 0 ? '+' : ''}{portfolioStats.totalRoi.toFixed(2)}%
              </Badge>
            </div>
            
            <div className="flex flex-col gap-1 px-1">
              <span className="text-3xl font-black">{formatKRW(portfolioStats.totalCurrentVal)}</span>
              <div className={cn("text-base font-bold flex items-center gap-1", portfolioStats.totalProfit >= 0 ? "toss-red" : "toss-blue")}>
                {portfolioStats.totalProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                {formatKRW(portfolioStats.totalProfit)}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-[#f2f4f6]">
              {Object.entries(HOLDINGS).map(([symbol, data]) => {
                const currentPrice = prices[symbol] || 0;
                const profit = (currentPrice - data.avgPrice) * data.amount;
                const roi = ((currentPrice - data.avgPrice) / data.avgPrice) * 100;
                
                return (
                  <div key={symbol} className="flex justify-between items-center">
                    <div className="flex gap-3 items-center">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", 
                        symbol === 'BTC' ? "bg-[#fff9eb] text-[#FF9500]" : 
                        symbol === 'ETH' ? "bg-[#ebf4ff] text-[#3182f6]" : "bg-[#f2f4f6] text-[#1a1a1a]"
                      )}>
                        {symbol}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{symbol === 'BTC' ? '비트코인' : symbol === 'ETH' ? '이더리움' : '엑스알피(리플)'}</span>
                        <span className="text-xs toss-gray">{data.amount} {symbol}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm">{formatKRW(data.amount * currentPrice)}</span>
                      <span className={cn("text-xs font-bold", profit >= 0 ? "toss-red" : "toss-blue")}>
                        {profit >= 0 ? '+' : ''}{roi.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Dynamic Simulator Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 toss-blue" />
                DCA 시뮬레이터
              </h3>
            </div>
            
            <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm toss-gray font-bold">매주 투자할 금액</label>
                    <span className="font-black text-lg toss-blue">{formatKRW(weeklyAmount)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="100000" 
                    max="5000000" 
                    step="100000"
                    value={weeklyAmount}
                    onChange={(e) => setWeeklyAmount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm toss-gray font-bold">DCA 투자 기간</label>
                    <span className="font-black text-lg toss-blue">{weeks}주</span>
                  </div>
                  <input 
                    type="range" 
                    min="12" 
                    max="104" 
                    step="4"
                    value={weeks}
                    onChange={(e) => setWeeks(Number(e.target.value))}
                  />
                </div>
            </div>

            <div className="pt-6 border-t border-[#f2f4f6] flex justify-between items-center">
                <span className="text-sm font-bold toss-gray">총 투자금액</span>
                <span className="text-xl font-black">{formatKRW(totalInvested)}</span>
            </div>
          </Card>
        </motion.div>

        {/* Charts & Scenario Results */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-[400px]">
            <h3 className="text-lg font-bold mb-8">기대 수익 시뮬레이션</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5e8eb" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#e5e8eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3182f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f2f4f6" />
                  <XAxis dataKey="week" hide={true} />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val: any) => formatKRW(Number(val))}
                    labelFormatter={(val) => `${val}주차`}
                  />
                  <Area type="monotone" dataKey="invested" stroke="#e5e8eb" fillOpacity={1} fill="url(#colorInvested)" name="원금" strokeWidth={2} />
                  <Area type="monotone" dataKey="neutral" stroke="#3182f6" fillOpacity={1} fill="url(#colorNeutral)" name="중립적 기대치" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-2 items-center justify-center mt-4 cursor-default">
              <div className="flex items-center gap-1.5 text-xs toss-gray"><div className="w-2.5 h-2.5 rounded-sm bg-[#e5e8eb]"/> 원금</div>
              <div className="flex items-center gap-1.5 text-xs toss-gray ml-4"><div className="w-2.5 h-2.5 rounded-sm bg-[#3182f6]"/> 중립적 수익</div>
            </div>
          </Card>
        </motion.div>

        {/* Scenario List */}
        <div className="flex flex-col gap-3">
          {scenarios.map((s, idx) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
            >
              <div className="toss-card p-5 bg-white flex justify-between items-center group cursor-pointer active:scale-95 transition-all">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold toss-gray">{s.name}</span>
                    <Badge variant={s.name === '불장' ? 'red' : s.name === '중립적' ? 'blue' : 'gray'}>+{s.roi}%</Badge>
                  </div>
                  <span className="text-xl font-black">{formatKRW(s.finalValue)}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#f2f4f6] flex items-center justify-center group-hover:bg-[#ebf4ff] group-hover:text-[#3182f6] transition-colors">
                  <ChevronRight className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Strategy Rules Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="bg-[#f9fafb] shadow-none border-none">
            <h4 className="text-base font-bold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 toss-blue" />
              투자 전략 가이드
            </h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                <p className="text-sm toss-gray leading-relaxed font-medium">
                  <span className="text-[#1a1a1a] font-bold">월요일 오전 고정 매수</span><br/>
                  매주 월요일 혹은 수요일 오전에 기계적으로 매수하세요.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                <p className="text-sm toss-gray leading-relaxed font-medium">
                  <span className="text-[#1a1a1a] font-bold">하락 시 추가 매수 (고급)</span><br/>
                  -3% 하락 시 1.5배, -5% 하락 시 2배를 매수하여 평단가를 낮추세요.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                <p className="text-sm toss-gray leading-relaxed font-medium">
                  <span className="text-[#1a1a1a] font-bold">비트는 대장, 이더는 부대장</span><br/>
                  BTC 60%, ETH 30%, XRP 10% 비중을 엄격히 준수하세요.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="text-center py-10">
          <p className="text-xs toss-gray">DCA 전략은 시장의 타이밍이 아닌, 시장에 머무는 시간을 사는 것입니다.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
