import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCcw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Globe, 
  ShieldCheck, 
  Zap, 
  DollarSign,
  TrendingUp,
  Calendar,
  Info
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
import { motion, AnimatePresence } from 'framer-motion';
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

const Badge = ({ children, className, variant = 'blue' }: { children: React.ReactNode, className?: string, variant?: 'blue' | 'red' | 'gray' | 'purple' }) => (
  <span className={cn(
    "px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-tighter",
    variant === 'blue' && "bg-[#ebf4ff] text-[#3182f6]",
    variant === 'red' && "bg-[#fff0f0] text-[#f04452]",
    variant === 'gray' && "bg-[#f2f4f6] text-[#8b95a1]",
    variant === 'purple' && "bg-[#f3f0ff] text-[#845ef7]",
    className
  )}>
    {children}
  </span>
);

// --- Data ---
const HOLDINGS = {
  BTC: { amount: 0.00583222, avgPrice: 102162589 },
  ETH: { amount: 0.1, avgPrice: 3094000 },
  XRP: { amount: 50, avgPrice: 2084 }
};

const EXPERT_NOTES = [
  {
    title: "뉴욕 퀀트 전문가의 제언",
    icon: <Globe className="w-5 h-5 text-[#3182f6]" />,
    content: "현재 원화 가치 하락과 고환율은 한국 투자자에게 리스크이자 기회입니다. 코인은 실질적인 달러 자산이므로 환율 급등 시 원화 자산의 가치 하락을 방어하는 '환헤지(FX Hedge)' 수단으로 작동합니다."
  },
  {
    title: "변동성 활용과 DCA",
    icon: <ShieldCheck className="w-5 h-5 text-[#3182f6]" />,
    content: "퀀트 관점에서 변동성은 적립식 매수의 가장 좋은 친구입니다. 기계적인 DCA(분할 매수)는 '평균 취득가액 하락 효과'를 극대화하며, 인간의 감정적 에러(Behavioral Bias)를 원천 차단합니다."
  },
  {
    title: "냉정한 자산 배분",
    icon: <Zap className="w-5 h-5 text-[#3182f6]" />,
    content: "BTC(60%)는 시스템 붕괴 시의 생존력, ETH(30%)는 성장성, XRP(10%)는 고위험-고수익 알파를 담당합니다. 다만, 환율이 1,350원 이상일 때는 공격적인 매수보다 보수적인 접근이 필요합니다."
  },
  {
    title: "추가 참고 지표 (Alpha)",
    icon: <TrendingUp className="w-5 h-5 text-[#3182f6]" />,
    content: "Fear & Greed Index가 20 이하(공포)일 때는 DCA 금액의 1.2배를 매수하고, 80 이상(탐욕)일 때는 0.8배로 줄이는 'Dynamic DCA'를 고려해 보십시오. 또한 김치프리미엄(Kimchi Prem.)이 5% 이상일 때는 신규 진입을 지양해야 합니다."
  }
];

const UPDATE_HISTORY = [
  { date: "2026-03-23 17:15", title: "v1.3 초고환율 분석 및 이력 관리 반영", desc: "이력 관리 탭 추가, 초고환율(1500+) 대응 로직 고도화, 매수 가이드 추가." },
  { date: "2026-03-23 15:53", title: "v1.2 토스 스타일 디자인 및 한글화", desc: "화이트 테마 UI 개편, 한국어 현지화, 오늘의 자산 현황 기능 추가." },
  { date: "2026-03-23 15:19", title: "v1.1 버그 픽스 및 배포 최적화", desc: "TS 타입 에러 해결 및 GitHub Actions 배포 자동화 구축." },
  { date: "2026-03-23 14:00", title: "v1.0 코인 위클리 초기 버전", desc: "BTC/ETH/XRP DCA 전략 수립 및 기초 시뮬레이터 개발." }
];

// --- Dynamic Simulation Logic ---

const useSimulation = (weeklyAmount: number, weeks: number, exchangeRate: number) => {
  return useMemo(() => {
    // Basic scenarios from MD
    const baseScenarios = [
      { name: '보수적', multiplier: 1.325, color: '#8b95a1' },
      { name: '중립적', multiplier: 1.8, color: '#3182f6' },
      { name: '불장', multiplier: 2.4, color: '#f04452' }
    ];

    // High rate > 1500: Extreme penalty for entry cost in KRW
    // High rate > 1400: Moderate penalty
    // Low rate < 1300: Advantage
    const rateFactor = exchangeRate > 1500 ? 0.92 : exchangeRate > 1400 ? 0.96 : exchangeRate < 1300 ? 1.05 : 1.0;

    const scenarios = baseScenarios.map(s => ({
      ...s,
      adjustedMultiplier: s.multiplier * rateFactor
    }));

    const totalInvested = weeklyAmount * weeks;

    const data = Array.from({ length: weeks + 1 }, (_, i) => {
      const investedAtWeek = weeklyAmount * i;
      return {
        week: i,
        invested: investedAtWeek,
        conservative: Math.round(investedAtWeek * (1 + (scenarios[0].adjustedMultiplier - 1) * (i / weeks))),
        neutral: Math.round(investedAtWeek * (1 + (scenarios[1].adjustedMultiplier - 1) * (i / weeks))),
        bull: Math.round(investedAtWeek * (1 + (scenarios[2].adjustedMultiplier - 1) * (i / weeks))),
      };
    });

    return {
      totalInvested,
      data,
      scenarios: scenarios.map(s => ({
        ...s,
        finalValue: Math.round(totalInvested * s.adjustedMultiplier),
        roi: Math.round((s.adjustedMultiplier - 1) * 100)
      }))
    };
  }, [weeklyAmount, weeks, exchangeRate]);
};

// --- Main App Component ---

const App: React.FC = () => {
  const [prices, setPrices] = useState<{ [key: string]: number }>({ BTC: 0, ETH: 0, XRP: 0 });
  const [weeklyAmount, setWeeklyAmount] = useState(1000000);
  const [weeks, setWeeks] = useState(52);
  const [exchangeRate, setExchangeRate] = useState(1514);
  const [showInsights, setShowInsights] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'history'>('holdings');

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

  const { totalInvested, data, scenarios } = useSimulation(weeklyAmount, weeks, exchangeRate);

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

  // Quant Allocation Recommendation Logic
  const quantRecommendation = useMemo(() => {
    if (exchangeRate > 1500) return { btc: 80, eth: 15, xrp: 5, label: "초고환율 대응 (BTC 집중)", color: "purple" };
    if (exchangeRate > 1400) return { btc: 70, eth: 25, xrp: 5, label: "방어적 (BTC 위주 매수)", color: "purple" };
    if (exchangeRate < 1300) return { btc: 50, eth: 35, xrp: 15, label: "공격적 (알트 비중 확대)", color: "red" };
    return { btc: 60, eth: 30, xrp: 10, label: "중립적 (표준 전략)", color: "blue" };
  }, [exchangeRate]);

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
          <div className="flex gap-2">
            <button 
              onClick={() => setShowInsights(true)}
              className="p-2.5 rounded-full bg-white shadow-sm transition-all active:scale-95"
            >
              <Globe className="w-5 h-5 toss-blue" />
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-full bg-white shadow-sm transition-all active:scale-95"
            >
              <RefreshCcw className="w-5 h-5 toss-gray" />
            </button>
          </div>
        </div>
        <div className="flex gap-4 border-b border-[#e5e8eb] pt-4">
          <button 
            onClick={() => setActiveTab('holdings')}
            className={cn("pb-3 border-b-2 text-sm transition-all", activeTab === 'holdings' ? "border-[#1a1a1a] font-bold" : "border-transparent toss-gray font-medium")}
          >보유자산</button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("pb-3 border-b-2 text-sm transition-all", activeTab === 'history' ? "border-[#1a1a1a] font-bold" : "border-transparent toss-gray font-medium")}
          >업데이트 이력</button>
        </div>
      </motion.header>

      <div className="w-full flex flex-col gap-4 pb-20">
        {activeTab === 'holdings' ? (
          <>
            {/* Today's Returns */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">오늘의 자산 현황</h3>
                  <Badge variant={portfolioStats.totalProfit >= 0 ? 'red' : 'blue'}>
                    {portfolioStats.totalProfit >= 0 ? '+' : ''}{portfolioStats.totalRoi.toFixed(2)}%
                  </Badge>
                </div>
                
                <div className="flex flex-col gap-1 px-1 text-center py-2">
                  <span className="text-4xl font-black">{formatKRW(portfolioStats.totalCurrentVal)}</span>
                  <div className={cn("text-lg font-bold flex items-center justify-center gap-1", portfolioStats.totalProfit >= 0 ? "toss-red" : "toss-blue")}>
                    {portfolioStats.totalProfit >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    {formatKRW(portfolioStats.totalProfit)}
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-[#f2f4f6]">
                  {Object.entries(HOLDINGS).map(([symbol, data]) => {
                    const currentPrice = prices[symbol] || 0;
                    const profit = (currentPrice - data.avgPrice) * data.amount;
                    const roi = data.avgPrice > 0 ? ((currentPrice - data.avgPrice) / data.avgPrice) * 100 : 0;
                    
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
                            <span className="text-xs toss-gray">{data.amount.toFixed(4)} {symbol}</span>
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
          </>
        ) : (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
             <Card className="flex flex-col gap-6">
               <h3 className="text-lg font-bold">업데이트 히스토리</h3>
               <div className="space-y-8 relative before:absolute before:inset-0 before:left-3 before:border-l-2 before:border-[#f2f4f6] before:h-full">
                 {UPDATE_HISTORY.map((h, i) => (
                   <div key={i} className="relative pl-10">
                     <div className="absolute left-0 w-6 h-6 rounded-full bg-white border-4 border-[#3182f6] z-10" />
                     <div className="flex flex-col">
                       <span className="text-xs font-bold toss-blue mb-1">{h.date}</span>
                       <span className="font-bold text-sm mb-1">{h.title}</span>
                       <p className="text-xs toss-gray leading-relaxed">{h.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </Card>
          </motion.div>
        )}

        {/* Quant Settings & Simulator */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="flex flex-col gap-8 bg-[#f9fafb] border-none shadow-none">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 toss-blue" />
                  환율 & 투자 설정
                </h3>
                <Badge variant={quantRecommendation.color as 'blue' | 'red' | 'purple'}>{quantRecommendation.label}</Badge>
              </div>

              {/* Exchange Rate Input */}
              <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs toss-gray font-bold">현재 원/달러 환율</label>
                  <span className="font-black text-lg text-[#1a1a1a]">₩{exchangeRate.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="1100" 
                  max="1700" 
                  step="5"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                />
                <div className="flex justify-between text-[10px] toss-gray font-bold pt-1">
                  <span>저환율 (적극 매수)</span>
                  <span>초고환율 (극도로 방어)</span>
                </div>
              </div>

              {/* BUY GUIDE (NEW) */}
              <div className="bg-[#3182f6] p-6 rounded-2xl shadow-lg shadow-blue-500/10 text-white space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4" /> 이번 주 매수 가이드
                  </h4>
                  <Badge variant="purple" className="bg-white/20 text-white border-none">가이드</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium opacity-80">비트코인 (BTC) {quantRecommendation.btc}%</span>
                    <span className="font-black">{formatKRW(weeklyAmount * (quantRecommendation.btc / 100))}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium opacity-80">이더리움 (ETH) {quantRecommendation.eth}%</span>
                    <span className="font-black">{formatKRW(weeklyAmount * (quantRecommendation.eth / 100))}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium opacity-80">엑스알피 (XRP) {quantRecommendation.xrp}%</span>
                    <span className="font-black">{formatKRW(weeklyAmount * (quantRecommendation.xrp / 100))}</span>
                  </div>
                  <div className="pt-3 border-t border-white/20 flex justify-between items-center font-black text-lg">
                    <span>총합</span>
                    <span>{formatKRW(weeklyAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Strategy Distribution View */}
              <div className="flex flex-col gap-3">
                <label className="text-xs toss-gray font-bold px-1 text-center">퀀트 추천 비중</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] toss-gray font-bold">BTC</div>
                    <div className="text-lg font-black toss-blue">{quantRecommendation.btc}%</div>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] toss-gray font-bold">ETH</div>
                    <div className="text-lg font-black toss-blue">{quantRecommendation.eth}%</div>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl shadow-sm text-center">
                    <div className="text-[10px] toss-gray font-bold">XRP</div>
                    <div className="text-lg font-black toss-blue">{quantRecommendation.xrp}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs toss-gray font-bold">매주 투자 금액</label>
                  <span className="font-black text-lg text-[#3182f6]">{formatKRW(weeklyAmount)}</span>
                </div>
                <input 
                  type="range" 
                  min="100000" 
                  max="3000000" 
                  step="100000"
                  value={weeklyAmount}
                  onChange={(e) => setWeeklyAmount(Number(e.target.value))}
                />
              </div>

              <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <label className="text-xs toss-gray font-bold">투자 기간</label>
                  <span className="font-black text-lg text-[#3182f6]">{weeks}주</span>
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
          </Card>
        </motion.div>

        {/* Performance Chart */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="h-[380px]">
            <h3 className="text-lg font-bold mb-6">시뮬레이션 결과</h3>
            <div className="h-60 mt-4">
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
                  <XAxis 
                    dataKey="week" 
                    stroke="#8b95a1" 
                    fontSize={10} 
                    tickFormatter={(val) => `${val}주`} 
                    axisLine={false}
                    tickLine={false}
                    minTickGap={20}
                  />
                  <YAxis 
                    stroke="#8b95a1" 
                    fontSize={10} 
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} 
                    padding={{ top: 20 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                    // @ts-ignore - Recharts internal ValueType is complex and formatter is display only
                    formatter={(val: any) => formatKRW(Number(val || 0))}
                    labelFormatter={(val) => `${val}주차`}
                  />
                  <Area type="monotone" dataKey="invested" stroke="#e5e8eb" fillOpacity={1} fill="url(#colorInvested)" name="원금" strokeWidth={2} />
                  <Area type="monotone" dataKey="neutral" stroke="#3182f6" fillOpacity={1} fill="url(#colorNeutral)" name="중립적 기대치" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-6">
              <div className="flex flex-col">
                <span className="text-[10px] toss-gray font-bold">누적 투자 원금</span>
                <span className="text-xl font-black">{formatKRW(totalInvested)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] toss-gray font-bold">최종 예상 자산</span>
                <span className="text-xl font-black">{formatKRW(scenarios[1].finalValue)}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quant Insights Card */}
        <Card className="bg-[#1a1a1a] text-white border-none space-y-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#3182f6]" />
            <span className="font-bold">뉴욕 퀀트 전문가 Insight</span>
          </div>
          <div className="space-y-4">
            {EXPERT_NOTES.map((note, i) => (
              <div key={i} className="space-y-2">
                <h5 className="text-sm font-bold text-[#3182f6]">{note.title}</h5>
                <p className="text-xs leading-relaxed text-[#8b95a1] font-medium">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/40 font-bold tracking-widest">NY QUANT EXPERT ANALYSIS</p>
          </div>
        </Card>
        {/* Investment Guide Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-[#f9fafb] shadow-none border-none mb-4">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-base font-bold flex items-center gap-2">
                <Info className="w-5 h-5 toss-blue" />
                투자 가이드 & 추천 매수 시간
              </h4>
              <Badge variant="blue">추천 시간대</Badge>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5e8eb] flex justify-between items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs toss-gray font-bold">이번 주 권장 매수일</span>
                  <span className="text-sm font-black">매주 월요일 / 수요일 오전 9~10시</span>
                </div>
                <Calendar className="w-5 h-5 toss-blue" />
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">1</div>
                  <p className="text-sm toss-gray leading-relaxed font-medium">
                    <span className="text-[#1a1a1a] font-bold">환율 민감도 대응</span><br/>
                    환율 1,500원 초과 시 BTC 비중을 늘려 글로벌 구매력을 보존하세요.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                  <p className="text-sm toss-gray leading-relaxed font-medium">
                    <span className="text-[#1a1a1a] font-bold">추가 지표 활용 (FEAR index)</span><br/>
                    공포 지수 20 이하 시에는 공격적 매수, 80 이상 시에는 매수를 지양하는 것이 퀀트 전략의 핵심입니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                  <p className="text-sm toss-gray leading-relaxed font-medium">
                    <span className="text-[#1a1a1a] font-bold">김치 프리미엄 확인</span><br/>
                    국내외 코인 시세 차이가 5% 이상 벌어질 때는 매수를 한 주 쉬거나 비중을 절반으로 줄이세요.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Insights Overlay */}
      <AnimatePresence>
        {showInsights && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowInsights(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-[640px] bg-white rounded-t-[32px] p-8 pb-12 overflow-y-auto max-h-[80vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-[#e5e8eb] rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-black mb-6">퀀트 전문가의 3대 투자 원칙</h2>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <Badge variant="blue">원칙 1. 환율에 따른 동적 비중 조절</Badge>
                  <p className="text-sm toss-gray leading-relaxed">
                    환율이 <span className="text-[#1a1a1a] font-bold">1,400원 이상</span>일 때는 매수 비용이 비싸지므로, 변동성이 큰 알트코인 비중을 줄이고 안전 자산 성격의 <span className="text-[#1a1a1a] font-bold">BTC 비중을 75%까지</span> 높이세요. 환율이 1,300원 이하로 내려가면 이더리움과 알트코인 비중을 늘려 수익률(Alpha)을 극대화합니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <Badge variant="blue">원칙 2. 헷지 수단으로서의 암호화폐</Badge>
                  <p className="text-sm toss-gray leading-relaxed">
                    원화 가치가 하락하는 국면에서 비트코인 보유는 필수적인 생존 전략입니다. 하지만 고환율 정점에서 한꺼번에 매수하는 것은 위험합니다. <span className="text-[#1a1a1a] font-bold">매주 DCA(분할 매수)</span>를 통해 진입 시점을 분산함으로써 환리스크를 상쇄하십시오.
                  </p>
                </div>

                <div className="space-y-3">
                  <Badge variant="blue">원칙 3. 블랙스완 대응 체력</Badge>
                  <p className="text-sm toss-gray leading-relaxed">
                    전쟁 및 에너지 이슈가 심화될 때 시장은 급락할 수 있습니다. 퀀트 포트폴리오의 10% 이상은 항상 <span className="text-[#1a1a1a] font-bold">현금성 자산(Dry Powder)</span>으로 유지하여, 기계적인 매수 외에 예외적으로 발생하는 저점 찬스를 잡을 준비를 하십시오.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowInsights(false)}
                className="w-full mt-10 py-4 bg-[#3182f6] text-white font-bold rounded-2xl transition-all active:scale-95"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
