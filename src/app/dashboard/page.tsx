'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, TrendingDown, Activity, Award, 
  Zap, BarChart3, PieChart, Shield, ArrowRight,
  Target, ZapIcon, InfoIcon
} from 'lucide-react';
import WatchlistPanel from '@/src/app/components/features/WatchlistPanel';
import MarketNewsBanner from '@/src/app/components/features/MarketNewsBanner';
import ImageBannerCarousel from '@/src/app/components/features/ImageBannerCarousel';
import RecommendedStocksPanel from '@/src/app/components/features/RecommendedStocksPanel';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';
import { UserAnalyticsResult } from '@/src/app/types/broker';

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [buyingPower, setBuyingPower] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.alpacaAccountId && user?.id) {
      Promise.all([
        brokerService.getAccountInfo(user.alpacaAccountId),
        brokerService.getUserAnalytics(user.id)
      ])
        .then(([account, analyticsData]) => {
          setPortfolioValue(Number(account.equity) || 0);
          setBuyingPower(Number(account.buyingPower) || 0);
          setAnalytics(analyticsData);
        })
        .catch(err => console.error("Dashboard fetch error:", err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "$0.00";
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getPerformanceColor = (val: number) => val >= 0 ? "text-emerald-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground p-4 md:p-8 lg:p-12 pb-24">
      <div className="max-w-[1700px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* TOP SECTION: Welcome & Quick Performance */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[10px] font-black text-gold uppercase tracking-widest">
                Professional Trader
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted font-bold uppercase">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Market Live
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
              Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gold">{user?.firstName || 'Trader'}</span>
            </h1>
            <p className="text-muted text-lg font-medium max-w-lg">
              นี่คือสรุปภาพรวมพอร์ตโฟลิโอและประสิทธิภาพการเทรดของคุณในวันนี้
            </p>
          </div>

          {/* Performance Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full xl:w-auto">
            <StatCard 
              label="Portfolio Value" 
              value={formatCurrency(portfolioValue)} 
              icon={<PieChart className="w-4 h-4 text-gold" />}
            />
            <StatCard 
              label="Buying Power" 
              value={formatCurrency(buyingPower)} 
              icon={<Zap className="w-4 h-4 text-emerald-400" />}
              highlight
            />
            <StatCard 
              label="Win Rate" 
              value={`${(analytics?.winRate || 0).toFixed(1)}%`} 
              icon={<Award className="w-4 h-4 text-blue-400" />}
            />
            <StatCard 
              label="P/L Ratio" 
              value={(analytics?.riskRewardRatio || 0).toFixed(2)} 
              icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
            />
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Main) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Carousel */}
            <div className="relative group rounded-[2rem] overflow-hidden border border-theme-border shadow-2xl shadow-gold/5">
              <ImageBannerCarousel />
            </div>

            {/* Strategy & Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identity Snapshot */}
              <div className="bg-surface rounded-3xl p-8 border border-theme-border shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Activity className="w-32 h-32 text-gold" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-6">Trading Identity</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center text-3xl">
                      {analytics?.traderType === 'Scalper' ? '⚡' : analytics?.traderType === 'Day Trader' ? '🔥' : analytics?.traderType === 'Swing Trader' ? '🌊' : '💎'}
                    </div>
                    <div>
                      <p className="text-3xl font-black text-white">{analytics?.traderType || 'Analyzing...'}</p>
                      <p className="text-sm font-bold text-gold/80">Current Profile</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push('/analytics')}
                  className="flex items-center gap-2 text-sm font-black text-white hover:text-gold transition-colors group"
                >
                  ดูบทวิเคราะห์เชิงลึก <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Behavior Insight */}
              <div className="bg-surface rounded-3xl p-8 border border-theme-border shadow-xl flex flex-col justify-between min-h-[250px]">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-6">Behavioral Insight</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-muted">FOMO Level</span>
                      <span className={`text-xl font-black ${(analytics?.fomoScore || 0) > 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {(analytics?.fomoScore || 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${(analytics?.fomoScore || 0) > 60 ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${analytics?.fomoScore || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted font-medium italic">
                      {(analytics?.fomoScore || 0) > 60 ? 'คุณมีแนวโน้มรีบเข้าซื้อตามกระแสเกินไป' : 'คุณมีการตัดสินใจที่ใจเย็นและเป็นระบบ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Sections (Keep as requested) */}
            <div className="space-y-8">
              <div className="group">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Target className="w-6 h-6 text-gold" /> Stock Picking Strategy
                  </h2>
                </div>
                <RecommendedStocksPanel />
              </div>

              <div className="group">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <PieChart className="w-6 h-6 text-gold" /> พอร์ตหุ้นและกลุ่มที่น่าสนใจ
                  </h2>
                </div>
                <WatchlistPanel onSelectSymbol={(sym) => router.push(`/trade?symbol=${sym}`)} />
              </div>
            </div>
          </div>

          {/* Right Column (Side) */}
          <div className="lg:col-span-4 space-y-8">
            <MarketNewsBanner />
            
            {/* Quick Tips / Broker Message */}
            <div className="bg-gradient-to-br from-gold/20 to-gold/5 rounded-[2rem] p-8 border border-gold/20 relative overflow-hidden group">
              <ZapIcon className="w-12 h-12 text-gold absolute -right-2 -bottom-2 opacity-20 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-black text-gold mb-4 flex items-center gap-2">
                <InfoIcon className="w-5 h-5" /> Pro Tips
              </h3>
              <p className="text-sm text-white/90 leading-relaxed mb-6 font-medium">
                "จำลองการเทรดที่ได้ประสิทธิภาพที่สุด คือการรักษาจิตวิทยาให้เหมือนใช้เงินจริง ลองฝึก Stop Loss ให้เป็นนิสัยเพื่อผลกำไรที่ยั่งยืน"
              </p>
              <button 
                onClick={() => router.push('/trade')}
                className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gold transition-colors shadow-lg"
              >
                Go to Market
              </button>
            </div>

            {/* Recent Best Trade */}
            {analytics?.bestPerformingStock && (
              <div className="bg-surface rounded-[2rem] p-6 border border-theme-border flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20">
                  🏆
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted tracking-widest">Best Performer</p>
                  <p className="text-xl font-black text-white">{analytics.bestPerformingStock}</p>
                  <p className="text-xs font-bold text-emerald-400">Yielded Highest Profit</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight = false }: { label: string, value: string, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-[1.5rem] border transition-all ${highlight ? 'bg-gold/5 border-gold/30 shadow-lg shadow-gold/5' : 'bg-surface border-theme-border'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${highlight ? 'bg-gold/20' : 'bg-background'}`}>
          {icon}
        </div>
        <p className="text-[10px] font-black uppercase text-muted tracking-widest">{label}</p>
      </div>
      <p className={`text-2xl font-black tracking-tight ${highlight ? 'text-white' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
