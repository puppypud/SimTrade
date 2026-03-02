'use client';

import React, { useEffect, useState } from 'react';
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
    Brain,
    History,
    RefreshCw,
    UserCircle,
    CheckCircle2
} from 'lucide-react';

const TRADER_INFO: Record<string, { label: string; desc: string; emoji: string }> = {
    'Scalper': { label: 'Scalper', desc: 'ทำกำไรสั้นๆ ถือไม่เกิน 30 นาที', emoji: '⚡' },
    'Day Trader': { label: 'Day Trader', desc: 'จบงานภายในวัน ไม่ห่อข้ามคืน', emoji: '☀️' },
    'Swing Trader': { label: 'Swing Trader', desc: 'รันเทรดเป็นรอบ ถือ 2-5 วัน', emoji: '🌊' },
    'Position Trader': { label: 'Position Trader', desc: 'ลงทุนระยะยาว เน้นพื้นฐาน', emoji: '🏔️' },
    'Unknown': { label: 'ยังไม่ได้ทำแบบทดสอบ', desc: 'กรุณาเทรดเพื่อเก็บข้อมูลก่อน', emoji: '❓' },
};

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<UserAnalyticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // ดึงข้อมูลวิเคราะห์จาก AI ทันทีที่เข้าหน้านี้
    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);
                setError(null);
                const data = await brokerService.getUserAnalytics(user.id);
                setAnalytics(data);
            } catch (err: any) {
                console.error("Failed to fetch analytics", err);
                setError("ยังไม่มีข้อมูลการเทรดที่เพียงพอ กรุณาเทรดให้ครบรอบ (ซื้อดและขาย) ก่อน");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [user?.id]);

    const preTestType = user?.traderType || 'Unknown';
    const preTestInfo = TRADER_INFO[preTestType] || TRADER_INFO['Unknown'];
    const aiTypeInfo = TRADER_INFO[analytics?.traderType || 'Unknown'] || TRADER_INFO['Unknown'];

    const isMatch = analytics?.traderType === preTestType;

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <RefreshCw className="w-12 h-12 text-gold animate-spin mb-4" />
                <h3 className="text-xl font-bold">กำลังประมวลผลข้อมูลการเทรด...</h3>
                <p className="text-sm text-muted">AI กำลังวิเคราะห์พฤติกรรมของคุณ</p>
            </div>
        );
    }

    if (error && !analytics) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="bg-surface rounded-3xl p-12 border border-theme-border shadow-soft max-w-lg text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-background rounded-full mb-6 flex items-center justify-center border border-dashed border-muted">
                        <History className="w-10 h-10 text-muted opacity-50" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">ข้อมูลไม่เพียงพอ</h2>
                    <p className="text-muted mb-8 leading-relaxed text-sm">{error}</p>
                    <a href="/trade" className="px-8 py-3 bg-gold text-[#1A1A1A] font-bold rounded-2xl hover:scale-105 transition-transform">
                        ไปหน้าเทรด
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-32">
            <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12">

                {/* Header */}
                <div className="text-center space-y-3 pt-4">
                    <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">TRADER REALITY CHECK</h1>
                    <p className="text-muted font-medium max-w-2xl mx-auto text-sm md:text-base">
                        เปรียบเทียบ "สิ่งที่คุณคิดว่าตัวเองเป็น" กับ "พฤติกรรมจริงจากการเทรด"
                    </p>
                </div>

                {/* ===== VS Battle Layout ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-12 relative">

                    {/* VS Icon in middle (Desktop mostly) */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 bg-background rounded-full border-2 border-theme-border items-center justify-center shadow-lg">
                        <span className="text-xl font-black text-muted italic">VS</span>
                    </div>

                    {/* Left: Pre-Test */}
                    <div className="bg-surface rounded-[2rem] p-8 border border-theme-border shadow-soft flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-500/5 transition-colors group-hover:bg-blue-500/10"></div>
                        <div className="relative z-10 w-full">
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <UserCircle className="w-5 h-5 text-blue-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-muted">Profile Settings</span>
                            </div>
                            <span className="text-6xl mb-6 block">{preTestInfo.emoji}</span>
                            <h2 className="text-3xl font-black text-foreground mb-2">{preTestInfo.label}</h2>
                            <p className="text-sm text-muted mb-6">{preTestInfo.desc}</p>

                            <div className="h-px w-16 bg-theme-border mx-auto mb-6"></div>
                            <p className="text-xs text-muted font-medium">นี่คือประเภทที่คุณเลือกตอนสมัครใช้งาน (หรือถูกบันทึกไว้ในฐานข้อมูล)</p>
                        </div>
                    </div>

                    {/* Right: AI Analysis */}
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>

                        <div className="relative z-10 w-full flex-1 flex flex-col">
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <Brain className="w-5 h-5 text-gold animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-widest text-white/50">AI Analysis</span>
                            </div>

                            <span className="text-6xl mb-6 block drop-shadow-2xl">{aiTypeInfo.emoji}</span>
                            <h2 className="text-3xl font-black text-white mb-2">{aiTypeInfo.label}</h2>
                            <p className="text-sm text-white/60 mb-6">{aiTypeInfo.desc}</p>

                            {/* Match Status */}
                            <div className="mt-auto mb-6 flex justify-center">
                                {isMatch ? (
                                    <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">พฤติกรรมตรงกับโปรไฟล์</span>
                                    </div>
                                ) : (
                                    <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">พฤติกรรมต่างจากโปรไฟล์</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setShowConfirmModal(true)}
                                className="w-full py-3.5 bg-gold hover:bg-gold-hover text-[#1A1A1A] font-black rounded-xl transition-all shadow-lg active:scale-95 text-sm"
                            >
                                อัปเดตสายเทรด (Change Profile)
                            </button>
                        </div>
                    </div>

                </div>

                {/* ===== Detailed Performance ===== */}
                {analytics && (
                    <div className="space-y-6 pt-8 border-t border-theme-border">

                        <div className="flex items-center gap-3 px-2">
                            <Award className="w-6 h-6 text-gold" />
                            <h2 className="text-2xl font-black tracking-tight">Performance Breakdown</h2>
                        </div>

                        {/* AI Recommendation Card */}
                        <div className="bg-surface rounded-3xl p-6 md:p-8 border border-theme-border shadow-soft flex flex-col md:flex-row gap-6 items-start">
                            <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${analytics.profitable ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {analytics.profitable ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black tracking-tight mb-2">{analytics.primaryFeedback}</h3>
                                <p className="text-sm text-muted leading-relaxed">
                                    {analytics.recommendation}
                                </p>
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                icon={<Target className="w-5 h-5" />}
                                label="Realized PnL"
                                value={`${analytics.totalRealizedPnL >= 0 ? '+' : ''}${analytics.totalRealizedPnL.toFixed(2)}%`}
                                color={analytics.totalRealizedPnL >= 0 ? "text-emerald-500" : "text-red-500"}
                            />
                            <MetricCard
                                icon={<Activity className="w-5 h-5" />}
                                label="Win Rate"
                                value={`${analytics.winRate.toFixed(1)}%`}
                                color={analytics.winRate >= 50 ? "text-emerald-500" : "text-amber-500"}
                            />
                            <MetricCard
                                icon={<History className="w-5 h-5" />}
                                label="Total Trades"
                                value={analytics.totalClosedTrades.toString()}
                                color="text-foreground"
                            />
                            <MetricCard
                                icon={<Zap className="w-5 h-5" />}
                                label="Risk/Reward"
                                value={analytics.riskRewardRatio.toFixed(2)}
                                color={analytics.riskRewardRatio >= 1 ? "text-gold" : "text-muted"}
                            />
                        </div>

                        {/* Behavior Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
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
                                </div>
                            </div>

                            <div className="bg-surface rounded-3xl p-6 border border-theme-border h-full">
                                <div className="flex items-center gap-3 mb-6">
                                    <BarChart2 className="w-5 h-5 text-gold" />
                                    <h3 className="font-bold">Trade Averages</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-background/50">
                                        <span className="text-sm font-medium">กำไรเฉลี่ยต่อรอบ (Avg Win)</span>
                                        <span className="font-black text-emerald-500">+{analytics.averageWinPct.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-xl bg-background/50">
                                        <span className="text-sm font-medium">ขาดทุนเฉลี่ยต่อรอบ (Avg Loss)</span>
                                        <span className="font-black text-red-500">{analytics.averageLossPct.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>

            <TraderTypeModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="เปลี่ยนสายเทรดของคุณ"
                subtitle={`AI แนะนำให้คุณเป็นสาย ${analytics?.traderType || 'Unknown'} ตามพฤติกรรมการเทรดจริง ต้องการเปลี่ยนสายเลยไหม?`}
            />
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
    return (
        <div className="bg-surface p-5 rounded-2xl border border-theme-border shadow-soft flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted mb-4">
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-xl md:text-2xl font-black ${color}`}>{value}</p>
            </div>
        </div>
    );
}

function BehaviorItem({ label, description, status, statusText }: { label: string, description: string, status: boolean, statusText: string }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-background transition-colors">
            <div>
                <h4 className="text-sm font-bold text-foreground">{label}</h4>
                <p className="text-[10px] text-muted">{description}</p>
            </div>
            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${status ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {statusText}
            </span>
        </div>
    );
}
