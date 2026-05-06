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
    Play,
    MessageCircle,
    Bot,
    Sparkles,
    Sun,
    Mountain,
    HelpCircle,
    Scale,
    Database,
    ShieldCheck,
    Binary,
    Search,
    Lightbulb,
    Brain
} from 'lucide-react';

const TRADER_INFO: Record<string, { label: string; desc: string; icon: React.ReactNode }> = {
    'Scalper': { label: 'Scalper', desc: 'ทำกำไรสั้นๆ ถือไม่เกิน 30 นาที', icon: <Zap className="w-5 h-5" /> },
    'Day Trader': { label: 'Day Trader', desc: 'จบงานภายในวัน ไม่ห่อข้ามคืน', icon: <Sun className="w-5 h-5 text-amber-400" /> },
    'Swing Trader': { label: 'Swing Trader', desc: 'รันเทรดเป็นรอบ ถือ 2-5 วัน', icon: <TrendingUp className="w-5 h-5" /> },
    'Position Trader': { label: 'Position Trader', desc: 'ลงทุนระยะยาว เน้นพื้นฐาน', icon: <Mountain className="w-5 h-5" /> },
    'Unknown': { label: 'ยังไม่ได้ทำแบบทดสอบ', desc: 'กรุณาทำ Quiz ก่อน', icon: <HelpCircle className="w-5 h-5" /> },
};

const RISK_INFO: Record<string, { label: string; desc: string; icon: React.ReactNode; color: string }> = {
    'Conservative': { label: 'Conservative', desc: 'รับความเสี่ยงได้น้อย เน้นผลปลอดภัย', icon: <Shield className="w-5 h-5" />, color: 'text-emerald-500' },
    'Moderate': { label: 'Moderate', desc: 'ยอมรับความเสี่ยงได้ระดับปานกลาง', icon: <Scale className="w-5 h-5" />, color: 'text-amber-500' },
    'Aggressive': { label: 'Aggressive', desc: 'รับความเสี่ยงได้สูง เน้นผลตอบแทน', icon: <Flame className="w-5 h-5" />, color: 'text-red-500' },
    'Unknown': { label: 'Unknown', desc: 'ยังไม่ได้ประเมินความเสี่ยง', icon: <HelpCircle className="w-5 h-5" />, color: 'text-muted' },
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

            // ★ Fallback: ถ้า backend ไม่ส่ง recommendedSimilarStocks กลับมา ให้ดึงจาก API แยก
            if (!data.recommendedSimilarStocks || data.recommendedSimilarStocks.length === 0) {
                try {
                    const traderType = data.suggestedTraderType || data.traderType || dbTraderType;
                    if (traderType && traderType !== 'Unknown') {
                        const fallbackStocks = await brokerService.getRecommendedStocks(traderType);
                        if (fallbackStocks && fallbackStocks.length > 0) {
                            data.recommendedSimilarStocks = fallbackStocks;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch fallback recommended stocks", e);
                }
            }

            setAnalytics(data);

            // --- บันทึกลง Cache ---
            localStorage.setItem(`analytics_cache_${user.id}`, JSON.stringify(data));

        } catch (err: any) {
            console.error("Failed to fetch analytics", err);
            setError("ยังไม่มีข้อมูลการเทรดที่เพียงพอ กรุณาเทรดให้ครบรอบ (ซื้อและขาย) ก่อน");
        } finally {
            setAnalyzing(false);
        }
    }, [user?.id, dbTraderType]);

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
                <div className="space-y-2 pt-6 pb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        Performance Analytics
                    </h1>
                    <p className="text-muted font-medium text-sm md:text-base max-w-2xl">
                        Comprehensive assessment of your trading behavior, statistical edge, and risk profile based on actual trade data.
                    </p>
                </div>

                {/* ======= PROFILE ASSESSMENT ======= */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
                    {/* Left: Declared Profile */}
                    <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border flex flex-col items-center text-center shadow-sm relative overflow-hidden h-full">
                        {/* Header Row (Mirroring Observed Behavior) */}
                        <div className="flex items-center gap-2 mb-6 relative z-10">
                            <UserCircle className="w-5 h-5 text-muted" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Declared Profile</span>
                        </div>

                        {profileLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center w-full py-8 relative z-10">
                                <div className="w-12 h-12 border-2 border-muted/20 border-t-muted rounded-xl animate-spin mx-auto mb-4" />
                                <p className="text-sm text-muted">Loading profile...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full w-full relative z-10">
                                {/* Badge Area */}
                                <div className="mb-6">
                                    <span className="px-3 py-1 rounded-full bg-theme-border/30 border border-theme-border/50 text-[10px] font-bold text-muted uppercase tracking-widest">
                                        Initial Setup
                                    </span>
                                </div>

                                {/* Main Profile Info */}
                                <div className="flex-1 flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-3xl bg-background border border-theme-border flex items-center justify-center mx-auto mb-6 shadow-sm text-muted">
                                        {preTestInfo.icon}
                                    </div>
                                    
                                    <p className="text-[10px] text-muted uppercase tracking-[0.2em] mb-2 font-bold">
                                        สายการเทรดที่คุณเลือกไว้
                                    </p>
                                    
                                    <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">
                                        {preTestInfo.label}
                                    </h2>
                                    
                                    <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto mb-8">
                                        {preTestInfo.desc}
                                    </p>
                                    
                                    <div className="mt-auto w-full pt-4 border-t border-theme-border/50 flex justify-center">
                                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1.5 py-2">
                                            <UserCircle className="w-4 h-4" />
                                            Declared Profile
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center: Analysis Trigger */}
                    <div className="flex flex-col items-center justify-center gap-4 px-4">
                        <div className="h-px w-8 bg-theme-border hidden md:block" />

                        {analyzing ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-xl border border-gold/30 flex items-center justify-center bg-gold/5 relative overflow-hidden">
                                    <div className="absolute inset-0 border-2 border-t-gold border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-xl" />
                                    <Activity className="w-5 h-5 text-gold animate-pulse" />
                                </div>
                                <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Processing</span>
                            </div>
                        ) : analytics ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <button
                                    onClick={handleStartAnalysis}
                                    className="px-4 py-1.5 rounded-lg border border-theme-border text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground hover:bg-background transition-all"
                                >
                                    Refresh
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleStartAnalysis}
                                disabled={profileLoading}
                                className="group flex flex-col items-center gap-3 disabled:opacity-50"
                            >
                                <div className="w-14 h-14 bg-background border border-theme-border rounded-2xl flex items-center justify-center transition-all group-hover:border-gold/50 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] group-active:scale-95">
                                    <Database className="w-6 h-6 text-muted group-hover:text-gold transition-colors" />
                                </div>
                                <span className="text-[10px] font-bold text-muted group-hover:text-gold uppercase tracking-widest transition-colors">Run Analysis</span>
                            </button>
                        )}

                        <div className="h-px w-8 bg-theme-border hidden md:block" />
                    </div>

                    {/* Right: Observed Behavior */}
                    <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border flex flex-col items-center text-center relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 mb-6 relative z-10">
                            <Activity className="w-5 h-5 text-gold" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Observed Behavior</span>
                        </div>

                        {!analytics && !analyzing && !error && (
                            <div className="flex-1 flex flex-col items-center justify-center w-full py-8 relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-background/50 flex items-center justify-center mx-auto mb-4 border border-dashed border-theme-border">
                                    <Binary className="w-6 h-6 text-muted/20" />
                                </div>
                                <p className="text-sm text-muted">Awaiting Data</p>
                            </div>
                        )}

                        {analyzing && (
                            <div className="flex-1 flex flex-col items-center justify-center w-full py-8 relative z-10">
                                <div className="w-12 h-12 border-2 border-gold/10 border-t-gold rounded-xl animate-spin mx-auto mb-4" />
                                <p className="text-sm text-muted">Scanning history...</p>
                            </div>
                        )}

                        {error && !analytics && (
                            <div className="flex-1 flex flex-col items-center justify-center w-full py-8 relative z-10">
                                <div className="w-12 h-12 bg-red-500/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-500/10">
                                    <AlertCircle className="w-6 h-6 text-red-500/30" />
                                </div>
                                <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>
                            </div>
                        )}

                        {analytics && (
                            <div className="flex flex-col h-full w-full relative z-10">
                                {/* Header section with comparison badge */}
                                <div className="mb-6">
                                    {analytics.traderType === dbTraderType ? (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                            Consistency Verified
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                            Style Shift Detected
                                        </span>
                                    )}
                                </div>

                                {/* Main Analyzed Result (Big) */}
                                <div className="flex-1 flex flex-col items-center">
                                    {analytics.suggestedTraderType && analytics.suggestedTraderType !== 'Unknown' && analytics.suggestedTraderType !== dbTraderType ? (
                                        // Case: System recommends a CHANGE
                                        <>
                                            <div className="w-20 h-20 rounded-3xl bg-gold/10 flex items-center justify-center mx-auto mb-6 border border-gold/20 text-gold shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                                                {suggestedInfo?.icon || <Sparkles className="w-8 h-8" />}
                                            </div>


                                            {/* Big Heading: Recommended Style */}
                                            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">
                                                {suggestedInfo?.label || analytics.suggestedTraderType}
                                            </h2>

                                            <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto mb-8">
                                                จากพฤติกรรมการเทรดจริง ระบบขอแนะนำให้คุณเปลี่ยนมาเป็นสายนี้เพื่อให้ได้ผลลัพธ์ที่ดีที่สุด
                                            </p>

                                            <div className="mt-auto w-full pt-4 border-t border-theme-border/50">
                                                <button
                                                    onClick={() => setShowConfirmModal(true)}
                                                    className="w-full py-3.5 bg-gold text-[#1A1A1A] text-sm font-black rounded-xl hover:bg-gold-hover transition-all shadow-[0_4px_15px_rgba(255,215,0,0.2)] active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    อัปเดตโปรไฟล์เป็นสายนี้
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        // Case: Behavior MATCHES
                                        <>
                                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/5 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 text-emerald-500">
                                                {aiTypeInfo?.icon || <Activity className="w-8 h-8" />}
                                            </div>

                                            {/* Small Label: Verified Style */}
                                            <p className="text-[10px] text-emerald-500 uppercase tracking-[0.2em] mb-2 font-bold">
                                                ยืนยันสายการเทรดปัจจุบัน
                                            </p>

                                            {/* Big Heading: Actual Behavior */}
                                            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">
                                                {aiTypeInfo?.label || analytics.traderType}
                                            </h2>

                                            <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto mb-8">
                                                ยอดเยี่ยมมาก! พฤติกรรมการเทรดจริงของคุณสอดคล้องกับสายที่คุณเลือกไว้ตั้งแต่ต้น
                                            </p>

                                            <div className="mt-auto w-full pt-4 border-t border-theme-border/50 flex justify-center">
                                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5 py-2">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    พฤติกรรมถูกต้องตามแผน
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ======= PERFORMANCE SECTION ======= */}
                {analytics && (
                    <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Executive Summary */}
                        <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border shadow-sm">
                            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-theme-border/50">
                                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                                    <LineChart className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-foreground tracking-tight">Executive Summary <span className="text-muted text-sm font-normal ml-1">(สรุปผลการวิเคราะห์)</span></h3>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Primary Diagnosis */}
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        Primary Diagnosis <span className="text-muted font-normal text-xs">(การวินิจฉัยหลัก)</span>
                                    </h4>
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                        <p className="text-sm text-foreground font-medium leading-relaxed">{analytics.primaryFeedback}</p>
                                    </div>
                                </div>

                                {/* Key Observations */}
                                {analytics.recommendation && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                            <Search className="w-4 h-4 text-blue-500" />
                                            Key Observations <span className="text-muted font-normal text-xs">(ข้อสังเกตสำคัญ)</span>
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {analytics.recommendation.split('\n\n').map((section, idx) => {
                                                const trimmed = section.trim();
                                                if (!trimmed) return null;
                                                // Determine icon based on content
                                                let Icon = Sparkles;
                                                let iconColor = "text-gold";
                                                if (trimmed.includes("ข้อสังเกต") || trimmed.includes("💡")) {
                                                    Icon = Lightbulb;
                                                } else if (trimmed.includes("ระวัง") || trimmed.includes("⚠️")) {
                                                    Icon = AlertTriangle;
                                                    iconColor = "text-amber-500";
                                                } else if (trimmed.includes("📌")) {
                                                    Icon = Target;
                                                }

                                                return (
                                                    <div key={idx} className="bg-background rounded-xl p-4 border border-theme-border text-sm text-muted leading-relaxed whitespace-pre-line flex items-start gap-3 hover:border-theme-border/80 transition-colors shadow-sm">
                                                        <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                                                        <span className="pt-0.5 text-foreground/80">{trimmed.replace(/^[🔥⚠️💡📌]\s*/g, '')}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Behavioral Insights */}
                                {analytics.behavioralFeedback && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-purple-500" />
                                            Behavioral Insights <span className="text-muted font-normal text-xs">(ข้อมูลเชิงลึกด้านพฤติกรรม)</span>
                                        </h4>
                                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
                                            <Zap className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                                                {analytics.behavioralFeedback.replace(/\|/g, '\n')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ======= SUGGESTED ASSETS ======= */}
                        <div className="space-y-6 pt-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">Smart Recommendations</h2>
                                    <p className="text-xs text-muted">หุ้นแนะนำที่วิเคราะห์ตามพฤติกรรมของคุณ</p>
                                </div>
                            </div>

                            {/* Section 1: Correlated Opportunities (Original) */}
                            {analytics.recommendedSimilarStocks && analytics.recommendedSimilarStocks.length > 0 && (
                                <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bot className="w-5 h-5 text-gold" />
                                        <h3 className="font-bold text-lg text-foreground tracking-tight">Correlated Opportunities (โอกาสที่สัมพันธ์กัน)</h3>
                                    </div>
                                    <p className="text-xs text-muted mb-4 leading-relaxed">
                                        {analytics.bestPerformingStock && analytics.bestPerformingStock !== '-' ? (
                                            <>
                                                เนื่องจากระบบเราได้เห็นว่าคุณเทรดหุ้น <span className="text-gold font-bold">{analytics.bestPerformingStock}</span>
                                                <span className="text-foreground/60 ml-1">({analytics.bestPerformingStockIndustry || 'N/A'})</span> แล้วได้กำไร <span className="text-emerald-500 font-bold">{analytics.bestPerformingStockPnL?.toFixed(2)}%</span> มากที่สุดในพอร์ต
                                                เราจึงแนะนำหุ้นที่อยู่ใน <span className="text-blue-400 font-bold">อุตสาหกรรม {analytics.bestPerformingStockIndustry || 'N/A'}</span> และมีพฤติกรรมตรงกับสาย <span className="text-gold font-bold">{dbTraderType}</span> ซึ่งเป็นประเภทนักเทรดปัจจุบันของคุณ
                                            </>
                                        ) : (
                                            <>
                                                เนื่องจากคุณเป็นนักเทรดสาย <span className="text-gold font-bold">{dbTraderType}</span> ระบบจึงแนะนำรายชื่อหุ้นที่มีพฤติกรรมสอดคล้องกับสไตล์การเทรดของคุณ เพื่อช่วยให้คุณหาโอกาสทำกำไรได้แม่นยำขึ้น
                                            </>
                                        )}
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {analytics.recommendedSimilarStocks.map((stock, idx) => (
                                            <RecommendationItem key={idx} stock={stock} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 3.1: Same Industry (New) */}
                            {analytics.recommendedIndustryStocks && analytics.recommendedIndustryStocks.length > 0 && (
                                <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border shadow-sm border-l-4 border-l-emerald-500/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Database className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-lg text-foreground tracking-tight">Industry Specialists (หุ้นกลุ่มอุตสาหกรรมเดียวกัน)</h3>
                                    </div>
                                    <p className="text-xs text-muted mb-4 leading-relaxed">
                                        แนะนำหุ้นในกลุ่มอุตสาหกรรมเดียวกับหุ้น <span className="text-emerald-500 font-bold">{analytics.bestPerformingStock}</span> ที่คุณทำกำไรได้มากที่สุด เพราะคุณมีความเข้าใจในอุตสาหกรรมนี้เป็นอย่างดี
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {analytics.recommendedIndustryStocks.map((stock, idx) => (
                                            <RecommendationItem key={idx} stock={stock} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 3.2: Recommended New Type (New) */}
                            {analytics.recommendedNewTypeStocks && analytics.recommendedNewTypeStocks.length > 0 && analytics.suggestedTraderType && analytics.suggestedTraderType !== dbTraderType && (
                                <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border shadow-sm border-l-4 border-l-gold/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-5 h-5 text-gold" />
                                        <h3 className="font-bold text-lg text-foreground tracking-tight">Adaptive Strategy (หุ้นสำหรับสายใหม่ที่คุณควรลอง)</h3>
                                    </div>
                                    <p className="text-xs text-muted mb-4 leading-relaxed">
                                        เนื่องจากระบบวิเคราะห์ว่าคุณควรเปลี่ยนเป็นสาย <span className="text-gold font-bold">{analytics.suggestedTraderType}</span> เราจึงคัดหุ้นที่เหมาะกับพฤติกรรมจริงของคุณมาให้ศึกษา
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {analytics.recommendedNewTypeStocks.map((stock, idx) => (
                                            <RecommendationItem key={idx} stock={stock} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section 3.3: Current Type Stocks (New) */}
                            {analytics.recommendedCurrentTypeStocks && analytics.recommendedCurrentTypeStocks.length > 0 && (
                                <div className="bg-surface rounded-2xl p-6 md:p-8 border border-theme-border shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldCheck className="w-5 h-5 text-muted" />
                                        <h3 className="font-bold text-lg text-foreground tracking-tight">Profile Matched (หุ้นแนะนำตามสายเดิมของคุณ)</h3>
                                    </div>
                                    <p className="text-xs text-muted mb-4 leading-relaxed">
                                        คัดรายชื่อหุ้นที่ตรงกับประเภทนักเทรด <span className="text-foreground font-bold">{dbTraderType}</span> ที่คุณได้ประเมินไว้ตั้งแต่ตอนเริ่มต้น
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                        {analytics.recommendedCurrentTypeStocks.map((stock, idx) => (
                                            <RecommendationItem key={idx} stock={stock} />
                                        ))}
                                    </div>
                                </div>
                            )}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            <InfoCard
                                icon={<PieChart className="w-4 h-4 text-gold" />}
                                label="Profit Factor"
                                value={analytics.profitFactor >= 999 ? "∞ (ไร้พ่าย)" : analytics.profitFactor?.toFixed(2) || '0.00'}
                                valueColor={analytics.profitFactor >= 1.5 ? "text-emerald-500" : analytics.profitFactor >= 1.0 ? "text-amber-500" : "text-red-500"}
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
                                    {analytics.profitFactorFeedback && (
                                        <div className="p-3 rounded-xl bg-background/50">
                                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Profit Factor Rating</p>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${analytics.profitFactor >= 1.5 ? 'bg-emerald-500' : analytics.profitFactor >= 1.0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                <p className="text-sm text-foreground font-medium">{analytics.profitFactorFeedback}</p>
                                            </div>
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
        <div className="bg-background p-4 rounded-xl border border-theme-border flex flex-col">
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-6 h-6 rounded-md ${bgColor} flex items-center justify-center ${iconColor}`}>
                    {icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
            </div>
            <p className="text-xl font-black tracking-tight text-foreground">{symbol}</p>
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

function RecommendationItem({ stock }: { stock: string }) {
    return (
        <a
            href={`/trade?symbol=${stock}`}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-theme-border hover:border-gold/50 transition-colors group shadow-sm"
        >
            <span className="font-bold text-foreground group-hover:text-gold transition-colors">{stock}</span>
            <span className="text-[10px] text-muted mt-1 uppercase tracking-wider">Trade</span>
        </a>
    );
}
