'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';
import { UserAnalyticsResult } from '@/src/app/types/broker';
import TraderTypeModal from '@/src/app/components/features/TraderTypeModal';
import {
    TrendingUp,
    TrendingDown,
    Target,
    BarChart2,
    Award,
    AlertCircle,
    Activity,
    Zap,
    PieChart,
    History,
    RefreshCw,
    UserCircle,
    CheckCircle2,
    Star,
    Skull,
    Clock,
    Heart,
    Shield,
    Flame,
    Eye,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Trophy,
    AlertTriangle,
    LineChart,
    Play
} from 'lucide-react';

const TRADER_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
    'Scalper': { label: 'Scalper', desc: 'ทำกำไรสั้นๆ ถือไม่เกิน 30 นาที', emoji: '⚡' },
    'Day Trader': { label: 'Day Trader', desc: 'จบงานภายในวัน ไม่ห่อข้ามคืน', emoji: '☀️' },
    'Swing Trader': { label: 'Swing Trader', desc: 'รันเทรดเป็นรอบ ถือ 2-5 วัน', emoji: '🌊' },
    'Position Trader': { label: 'Position Trader', desc: 'ลงทุนระยะยาว เน้นพื้นฐาน', emoji: '🏔️' },
    'Unknown': { label: 'ยังไม่ได้ทำแบบทดสอบ', desc: 'กรุณาทำ Quiz ก่อน', emoji: '❓' },
};

const RISK_INFO: Record<string, { label: string; desc: string; emoji: string; color: string }> = {
    'Conservative': { label: 'Conservative', desc: 'รับความเสี่ยงได้น้อย เน้นผลปลอดภัย', emoji: '🛡️', color: 'text-emerald-500' },
    'Moderate': { label: 'Moderate', desc: 'ยอมรับความเสี่ยงได้ระดับปานกลาง', emoji: '⚖️', color: 'text-amber-500' },
    'Aggressive': { label: 'Aggressive', desc: 'รับความเสี่ยงได้สูง เน้นผลตอบแทน', emoji: '🔥', color: 'text-red-500' },
    'Unknown': { label: 'Unknown', desc: 'ยังไม่ได้ประเมินความเสี่ยง', emoji: '❓', color: 'text-muted' },
};

export default function AnalyticsPage() {
    const { user, updateUser } = useAuth();
    const [analytics, setAnalytics] = useState<UserAnalyticsResult | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [dbTraderType, setDbTraderType] = useState<string>('Unknown');
    const [dbRiskBehavior, setDbRiskBehavior] = useState<string>('Unknown');

    // 1. ดึง traderType และข้อมูล Cache จาก LocalStorage ตอนเปิดหน้า
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                setProfileLoading(true);

                // --- ลองดึงจาก Cache ก่อน ---
                const cachedData = localStorage.getItem(`analytics_cache_${user.id}`);
                if (cachedData) {
                    try {
                        setAnalytics(JSON.parse(cachedData));
                    } catch (e) {
                        console.error("Error parsing analytics cache", e);
                    }
                }

                const profile = await brokerService.getUserProfile(user.id);
                setDbTraderType(profile.traderType || 'Unknown');
                setDbRiskBehavior(profile.riskBehavior || 'Unknown');
                // อัพเดท AuthContext ด้วย เผื่อค่าเก่ากว่า
                if (profile.traderType && profile.traderType !== user.traderType) {
                    updateUser({ traderType: profile.traderType });
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
                setDbTraderType(user.traderType || 'Unknown');
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfile();
    }, [user?.id]);

    // 2. กดปุ่มเพื่อเริ่ม Analysis
    const handleStartAnalysis = useCallback(async () => {
        if (!user?.id) return;
        try {
            setAnalyzing(true);
            setError(null);
            const data = await brokerService.getUserAnalytics(user.id);
            setAnalytics(data);

            // --- บันทึกลง Cache ---
            localStorage.setItem(`analytics_cache_${user.id}`, JSON.stringify(data));

        } catch (err: any) {
            console.error("Failed to fetch analytics", err);
            setError("ยังไม่มีข้อมูลการเทรดที่เพียงพอ กรุณาเทรดให้ครบรอบ (ซื้อและขาย) ก่อน");
        } finally {
            setAnalyzing(false);
        }
    }, [user?.id]);

    const preTestInfo = TRADER_INFO[dbTraderType] || TRADER_INFO['Unknown'];
    const aiTypeInfo = analytics
        ? (TRADER_INFO[analytics.traderType || 'Unknown'] || TRADER_INFO['Unknown'])
        : null;
    const suggestedInfo = analytics?.suggestedTraderType
        ? (TRADER_INFO[analytics.suggestedTraderType] || TRADER_INFO['Unknown'])
        : null;
    const isMatch = analytics?.traderType === dbTraderType;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* ======= HEADER ======= */}
                <div className="text-center space-y-3 pt-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-xs font-black text-gold uppercase tracking-widest mb-2">
                        <LineChart className="w-3.5 h-3.5" />
                        AI-Powered Analysis
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                        TRADER REALITY CHECK
                    </h1>
                    <p className="text-muted font-medium max-w-2xl mx-auto text-sm md:text-base">
                        เปรียบเทียบ &quot;สิ่งที่คุณคิดว่าตัวเองเป็น&quot; กับ &quot;พฤติกรรมจริงจากการเทรด&quot;
                    </p>
                </div>

                {/* ======= VS BATTLE ======= */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-stretch">

                    {/* Left: Profile from Database (Quiz Result) */}
                    <div className="bg-surface rounded-[2rem] p-8 border border-theme-border shadow-soft flex flex-col items-center text-center relative overflow-hidden group hover:shadow-lg transition-shadow duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent transition-all group-hover:from-blue-500/10" />
                        <div className="relative z-10 w-full flex flex-col items-center">
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <UserCircle className="w-5 h-5 text-blue-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-muted">ผลจากแบบทดสอบ (Quiz)</span>
                            </div>

                            {profileLoading ? (
                                <div className="flex flex-col items-center py-8">
                                    <RefreshCw className="w-8 h-8 text-muted animate-spin mb-3" />
                                    <p className="text-sm text-muted">กำลังโหลดข้อมูล...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-blue-500/5 flex items-center justify-center mx-auto mb-6 border-2 border-blue-500/10">
                                        <span className="text-5xl">{preTestInfo.emoji}</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground mb-2 tracking-tight">{preTestInfo.label}</h2>
                                    <p className="text-sm text-muted mb-6">{preTestInfo.desc}</p>



                                    <div className="h-px w-16 bg-theme-border mx-auto mb-4" />
                                    <p className="text-xs text-muted">ข้อมูลจากฐานข้อมูล (Onboarding Quiz)</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Center: Analysis Button */}
                    <div className="flex items-center justify-center">
                        {analyzing ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
                                    <LineChart className="w-8 h-8 text-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <p className="text-xs text-muted font-bold whitespace-nowrap">กำลังวิเคราะห์...</p>
                            </div>
                        ) : analytics ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                                </div>
                                <button
                                    onClick={handleStartAnalysis}
                                    className="text-xs text-muted hover:text-gold transition-colors font-bold underline underline-offset-4"
                                >
                                    วิเคราะห์ใหม่
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartAnalysis}
                                disabled={profileLoading}
                                className="group flex flex-col items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-20 h-20 bg-gold/10 hover:bg-gold/20 rounded-full flex items-center justify-center border-2 border-gold/30 hover:border-gold/60 transition-all group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_rgba(255,215,0,0.4)] group-active:scale-95">
                                    <Play className="w-8 h-8 text-gold ml-1" />
                                </div>
                                <span className="text-xs font-black text-gold uppercase tracking-widest whitespace-nowrap">เริ่มวิเคราะห์</span>
                                <span className="text-[10px] text-muted">กดเพื่อให้ AI วิเคราะห์พฤติกรรม</span>
                            </button>
                        )}
                    </div>

                    {/* Right: AI Analysis Result */}
                    <div className={`bg-surface rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-theme-border transition-all duration-700 ${analytics ? 'hover:shadow-lg' : ''}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

                        <div className="relative z-10 w-full flex-1 flex flex-col items-center">
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <LineChart className={`w-5 h-5 text-gold ${analyzing ? 'animate-pulse' : ''}`} />
                                <span className="text-xs font-black uppercase tracking-widest text-muted">AI Analysis</span>
                            </div>

                            {!analytics && !analyzing && !error && (
                                <div className="flex-1 flex flex-col items-center justify-center py-8">
                                    <div className="w-24 h-24 rounded-full bg-background/50 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-theme-border">
                                        <BarChart2 className="w-10 h-10 text-muted/30" />
                                    </div>
                                    <h2 className="text-xl font-black text-foreground/40 mb-2 tracking-tight">รอการวิเคราะห์</h2>
                                    <p className="text-sm text-muted/40">กดปุ่ม &quot;เริ่มวิเคราะห์&quot; เพื่อดูผลลัพธ์</p>
                                </div>
                            )}

                            {analyzing && (
                                <div className="flex-1 flex flex-col items-center justify-center py-8">
                                    <div className="w-24 h-24 rounded-full border-4 border-gold/20 border-t-gold animate-spin mx-auto mb-6" />
                                    <h2 className="text-xl font-black text-foreground/70 mb-2">AI กำลังประมวลผล...</h2>
                                    <p className="text-sm text-muted/60">วิเคราะห์ประวัติการเทรดทั้งหมด</p>
                                    <div className="mt-4 flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && !analytics && (
                                <div className="flex-1 flex flex-col items-center justify-center py-8">
                                    <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border-2 border-red-500/20">
                                        <AlertCircle className="w-10 h-10 text-red-400" />
                                    </div>
                                    <h2 className="text-xl font-black text-foreground/70 mb-2">ข้อมูลไม่เพียงพอ</h2>
                                    <p className="text-sm text-muted/60 max-w-xs">{error}</p>
                                    <a href="/trade" className="mt-4 group px-6 py-2.5 bg-gold text-[#1A1A1A] font-black rounded-xl hover:scale-105 transition-all inline-flex items-center gap-2 text-sm">
                                        ไปหน้าเทรด
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                </div>
                            )}

                            {analytics && aiTypeInfo && (
                                <>
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mx-auto mb-6 border-2 border-gold/20 shadow-[0_0_30px_-8px_rgba(255,215,0,0.3)]">
                                        <span className="text-5xl drop-shadow-2xl">{aiTypeInfo.emoji}</span>
                                    </div>
                                    <h2 className="text-3xl font-black text-foreground mb-2 tracking-tight">{aiTypeInfo.label}</h2>
                                    <p className="text-sm text-muted font-medium mb-6">{aiTypeInfo.desc}</p>

                                    {/* Match Status */}
                                    {/* Match Status - Removed */}

                                    {/* Always show Suggested type + Change Button if analysis exists */}
                                    <div className="mb-6 p-4 rounded-xl bg-background border border-theme-border w-full">
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">
                                            {analytics.suggestedTraderType && analytics.suggestedTraderType !== 'Unknown' ? "AI แนะนำให้เปลี่ยนเป็น" : "ประเภทนักเทรดของคุณ"}
                                        </p>
                                        <p className="text-sm font-black text-gold">
                                            {analytics.suggestedTraderType && analytics.suggestedTraderType !== 'Unknown'
                                                ? `${suggestedInfo?.emoji || ''} ${suggestedInfo?.label || analytics.suggestedTraderType}`
                                                : `${aiTypeInfo.emoji} ${aiTypeInfo.label}`}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setShowConfirmModal(true)}
                                        className="w-full py-3.5 bg-gold hover:bg-gold-hover text-[#1A1A1A] font-black rounded-xl transition-all shadow-lg active:scale-95 text-sm hover:shadow-[0_0_25px_-5px_rgba(255,215,0,0.5)]"
                                    >
                                        อัปเดตสายเทรด (Change Profile)
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ======= PERFORMANCE SECTION — only shows after analysis ======= */}
                {analytics && (
                    <div className="space-y-8 pt-8 border-t border-theme-border animate-in fade-in slide-in-from-bottom-4 duration-700">

                        {/* Section Header */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Performance Breakdown</h2>
                                <p className="text-xs text-muted">ผลวิเคราะห์เชิงลึกจาก AI</p>
                            </div>
                        </div>

                        {/* AI Feedback Card */}
                        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-theme-border shadow-soft">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${analytics.profitable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {analytics.profitable ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black tracking-tight mb-2">{analytics.primaryFeedback}</h3>
                                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-background/50 p-4 rounded-xl border border-theme-border mt-3 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold"></div>
                                        <p className="font-bold text-muted mb-2 text-xs uppercase tracking-wider">💡 ความเห็นจาก AI (ข้อดี/ข้อเสีย/คำแนะนำ)</p>
                                        {analytics.recommendation}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                icon={<Target className="w-5 h-5" />}
                                label="Realized PnL"
                                value={`${analytics.totalRealizedPnL >= 0 ? '+' : ''}$${analytics.totalRealizedPnL.toFixed(2)}`}
                                color={analytics.totalRealizedPnL >= 0 ? "text-emerald-500" : "text-red-500"}
                                bgGlow={analytics.totalRealizedPnL >= 0 ? "from-emerald-500/5" : "from-red-500/5"}
                            />
                            <MetricCard
                                icon={<Activity className="w-5 h-5" />}
                                label="Win Rate"
                                value={`${analytics.winRate.toFixed(1)}%`}
                                color={analytics.winRate >= 50 ? "text-emerald-500" : "text-amber-500"}
                                bgGlow={analytics.winRate >= 50 ? "from-emerald-500/5" : "from-amber-500/5"}
                            />
                            <MetricCard
                                icon={<History className="w-5 h-5" />}
                                label="Total Trades"
                                value={analytics.totalClosedTrades.toString()}
                                color="text-foreground"
                                bgGlow="from-blue-500/5"
                            />
                            <MetricCard
                                icon={<Zap className="w-5 h-5" />}
                                label="Risk/Reward"
                                value={analytics.riskRewardRatio.toFixed(2)}
                                color={analytics.riskRewardRatio >= 1 ? "text-gold" : "text-muted"}
                                bgGlow={analytics.riskRewardRatio >= 1 ? "from-gold/5" : "from-gray-500/5"}
                            />
                        </div>

                        {/* Secondary Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                            <InfoCard
                                icon={<ArrowUpRight className="w-4 h-4 text-emerald-500" />}
                                label="กำไรเฉลี่ย (Avg Win)"
                                value={`+${analytics.averageWinPct.toFixed(2)}%`}
                                valueColor="text-emerald-500"
                            />
                            <InfoCard
                                icon={<ArrowDownRight className="w-4 h-4 text-red-500" />}
                                label="ขาดทุนเฉลี่ย (Avg Loss)"
                                value={`${analytics.averageLossPct.toFixed(2)}%`}
                                valueColor="text-red-500"
                            />
                        </div>

                        {/* ======= STOCK HIGHLIGHTS ======= */}
                        {analytics.mostTradedStock && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <Star className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight">Stock Highlights</h2>
                                        <p className="text-xs text-muted">หุ้นที่สำคัญในพอร์ตของคุณ</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StockHighlightCard
                                        icon={<Heart className="w-4 h-4" />}
                                        label="หุ้นลูกรัก"
                                        symbol={analytics.mostTradedStock}
                                        detail={`เทรด ${analytics.mostTradedStockCount} ครั้ง`}
                                        iconColor="text-pink-500"
                                        bgColor="bg-pink-500/10"
                                    />
                                    {analytics.bestPerformingStock && analytics.bestPerformingStock !== '-' && (
                                        <StockHighlightCard
                                            icon={<TrendingUp className="w-4 h-4" />}
                                            label="หุ้นทำเงิน"
                                            symbol={analytics.bestPerformingStock}
                                            detail={`+${analytics.bestPerformingStockPnL?.toFixed(2)}%`}
                                            iconColor="text-emerald-500"
                                            bgColor="bg-emerald-500/10"
                                        />
                                    )}
                                    {analytics.worstPerformingStock && analytics.worstPerformingStock !== '-' && (
                                        <StockHighlightCard
                                            icon={<TrendingDown className="w-4 h-4" />}
                                            label="หุ้นตัวร้าย"
                                            symbol={analytics.worstPerformingStock}
                                            detail={`${analytics.worstPerformingStockPnL?.toFixed(2)}%`}
                                            iconColor="text-red-500"
                                            bgColor="bg-red-500/10"
                                        />
                                    )}
                                    {analytics.longestHeldStock && (
                                        <StockHighlightCard
                                            icon={<Clock className="w-4 h-4" />}
                                            label="ถือนานสุด"
                                            symbol={analytics.longestHeldStock}
                                            detail={analytics.longestHeldDuration || '-'}
                                            iconColor="text-purple-500"
                                            bgColor="bg-purple-500/10"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ======= BEHAVIORAL RISK ANALYSIS ======= */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">Behavioral Risk Analysis</h2>
                                    <p className="text-xs text-muted">วิเคราะห์พฤติกรรมเสี่ยงในการเทรด</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <RiskGauge
                                    label="FOMO (กลัวตกรถ)"
                                    description="มักซื้อหุ้นตอนราคาพุ่ง RSI สูง"
                                    score={analytics.fomoScore || 0}
                                    status={analytics.fomoStatus || 'ปกติ'}
                                    icon={<Flame className="w-4 h-4" />}
                                />
                                <RiskGauge
                                    label="Panic Sell (ตกใจขาย)"
                                    description="ขายหุ้นตอนตลาดตกหนัก RSI ต่ำ"
                                    score={analytics.panicSellScore || 0}
                                    status={analytics.panicSellStatus || 'ปกติ'}
                                    icon={<AlertTriangle className="w-4 h-4" />}
                                />
                                <RiskGauge
                                    label="ขายหมู (Selling Winners Early)"
                                    description="ขายทำกำไรเร็วเกินไป ไม่รอเทรนด์"
                                    score={analytics.sellingWinnersTooEarlyScore || 0}
                                    status={analytics.sellingWinnersTooEarlyStatus || 'ปกติ'}
                                    icon={<Eye className="w-4 h-4" />}
                                />
                                <RiskGauge
                                    label="ถือขาดทุนนานเกิน (Holding Losers)"
                                    description="ทนถือหุ้นที่ขาดทุนนานเกินไป"
                                    score={analytics.holdingLosersTooLongScore || 0}
                                    status={analytics.holdingLosersTooLongStatus || 'ปกติ'}
                                    icon={<Clock className="w-4 h-4" />}
                                />
                            </div>

                            {/* Behavioral Feedback */}
                            {analytics.behavioralFeedback && (
                                <div className="bg-surface rounded-2xl p-5 border border-theme-border">
                                    <div className="flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-muted mb-2">สรุปพฤติกรรม</p>
                                            <p className="text-sm text-foreground leading-relaxed">{analytics.behavioralFeedback}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ======= ADVANCED INSIGHTS ======= */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fact Checks */}
                            <div className="bg-surface rounded-3xl p-6 border border-theme-border h-full">
                                <div className="flex items-center gap-3 mb-6">
                                    <PieChart className="w-5 h-5 text-gold" />
                                    <h3 className="font-bold">Fact Checks</h3>
                                </div>
                                <div className="space-y-3">
                                    <BehaviorItem
                                        label="Profitability"
                                        description="พอร์ตโดยรวมสร้างกำไรได้หรือไม่"
                                        status={analytics.profitable}
                                        statusText={analytics.profitable ? "Profitable" : "Loss"}
                                    />
                                    <BehaviorItem
                                        label="Win Consistency"
                                        description="ชนะตลาดมากกว่า 50% หรือไม่"
                                        status={analytics.winRate > 50}
                                        statusText={analytics.winRate > 50 ? "Consistent" : "Volatile"}
                                    />
                                    <BehaviorItem
                                        label="Style Matched"
                                        description="สไตล์การเทรดตรงกับโปรไฟล์ไหม"
                                        status={analytics.styleMatched}
                                        statusText={analytics.styleMatched ? "Matched" : "Mismatched"}
                                    />
                                    <BehaviorItem
                                        label="Risk/Reward"
                                        description="สัดส่วน Risk:Reward > 1.0 หรือไม่"
                                        status={analytics.riskRewardRatio >= 1}
                                        statusText={analytics.riskRewardRatio >= 1 ? "Healthy" : "Poor"}
                                    />
                                </div>
                            </div>

                            {/* Advanced */}
                            <div className="bg-surface rounded-3xl p-6 border border-theme-border h-full">
                                <div className="flex items-center gap-3 mb-6">
                                    <BarChart2 className="w-5 h-5 text-gold" />
                                    <h3 className="font-bold">Advanced Insights</h3>
                                </div>
                                <div className="space-y-4">
                                    {analytics.maxConsecutiveWins > 0 && (
                                        <div className="flex justify-between items-center p-3 rounded-xl bg-background/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-sm font-medium">ชนะสูงสุดติดกัน</span>
                                            </div>
                                            <span className="font-black text-emerald-500">{analytics.maxConsecutiveWins} ไม้</span>
                                        </div>
                                    )}
                                    {analytics.maxConsecutiveLosses > 0 && (
                                        <div className="flex justify-between items-center p-3 rounded-xl bg-background/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-sm font-medium">แพ้สูงสุดติดกัน</span>
                                            </div>
                                            <span className="font-black text-red-500">{analytics.maxConsecutiveLosses} ไม้</span>
                                        </div>
                                    )}
                                    {analytics.streakFeedback && (
                                        <div className="p-3 rounded-xl bg-background/50">
                                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Streak Analysis</p>
                                            <p className="text-sm text-foreground">{analytics.streakFeedback}</p>
                                        </div>
                                    )}
                                    {analytics.sizingFeedback && (
                                        <div className="p-3 rounded-xl bg-background/50">
                                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Position Sizing</p>
                                            <p className="text-sm text-foreground">{analytics.sizingFeedback}</p>
                                        </div>
                                    )}
                                    {analytics.diversificationFeedback && (
                                        <div className="p-3 rounded-xl bg-background/50">
                                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Diversification</p>
                                            <p className="text-sm text-foreground">{analytics.diversificationFeedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="h-8" />
                    </div>
                )}
            </div>

            <TraderTypeModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="เปลี่ยนสายเทรดของคุณ"
                subtitle={`AI แนะนำให้คุณเป็นสาย ${analytics?.suggestedTraderType || analytics?.traderType || 'Unknown'} ตามพฤติกรรมการเทรดจริง ต้องการเปลี่ยนสายเลยไหม?`}
            />
        </div>
    );
}

/* ================================ */
/*        SUB-COMPONENTS            */
/* ================================ */

function MetricCard({ icon, label, value, color, bgGlow }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    bgGlow?: string;
}) {
    return (
        <div className="bg-surface p-5 rounded-2xl border border-theme-border shadow-soft flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGlow || ''} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
                <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center text-muted mb-4">
                    {icon}
                </div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl md:text-2xl font-black ${color}`}>{value}</p>
            </div>
        </div>
    );
}

function InfoCard({ icon, label, value, valueColor }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor: string;
}) {
    return (
        <div className="bg-surface p-4 rounded-2xl border border-theme-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{label}</p>
                <p className={`text-lg font-black ${valueColor}`}>{value}</p>
            </div>
        </div>
    );
}

function StockHighlightCard({ icon, label, symbol, detail, iconColor, bgColor }: {
    icon: React.ReactNode;
    label: string;
    symbol: string;
    detail: string;
    iconColor: string;
    bgColor: string;
}) {
    return (
        <div className="bg-surface p-5 rounded-2xl border border-theme-border hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center ${iconColor}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
            </div>
            <p className="text-xl font-black tracking-tight">{symbol}</p>
            <p className="text-xs text-muted mt-1">{detail}</p>
        </div>
    );
}

function RiskGauge({ label, description, score, status, icon }: {
    label: string;
    description: string;
    score: number;
    status: string;
    icon: React.ReactNode;
}) {
    const getStatusColor = () => {
        if (status === 'พฤติกรรมเสี่ยง') return { bar: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        if (status === 'มีแนวโน้ม') return { bar: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
        return { bar: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    };
    const colors = getStatusColor();

    return (
        <div className={`bg-surface p-5 rounded-2xl border ${colors.border} hover:shadow-md transition-shadow duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`${colors.bg} ${colors.text} w-7 h-7 rounded-lg flex items-center justify-center`}>
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-bold">{label}</p>
                        <p className="text-[10px] text-muted">{description}</p>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                    {status}
                </span>
            </div>
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full rounded-full ${colors.bar} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                />
            </div>
            <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-muted">0</span>
                <span className={`text-[10px] font-bold ${colors.text}`}>{score.toFixed(0)}</span>
                <span className="text-[9px] text-muted">100</span>
            </div>
        </div>
    );
}

function BehaviorItem({ label, description, status, statusText }: {
    label: string;
    description: string;
    status: boolean;
    statusText: string;
}) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                    <h4 className="text-sm font-bold text-foreground">{label}</h4>
                    <p className="text-[10px] text-muted">{description}</p>
                </div>
            </div>
            <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${status ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {statusText}
            </span>
        </div>
    );
}
