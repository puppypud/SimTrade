'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';
import { UserAnalyticsResult } from '@/src/app/types/broker';
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
    ChevronRight
} from 'lucide-react';

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<UserAnalyticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user?.id) return;
            try {
                setLoading(true);
                const data = await brokerService.getUserAnalytics(user.id);
                setAnalytics(data);
            } catch (err: any) {
                console.error("Failed to fetch analytics", err);
                setError("ไม่สามารถดึงข้อมูลการวิเคราะห์ได้ในขณะนี้");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted font-medium animate-pulse">กำลังวิเคราะห์พฤติกรรมการเทรดของคุณ...</p>
                </div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-surface p-8 rounded-2xl border border-theme-border shadow-soft max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Oops!</h2>
                    <p className="text-muted mb-6">{error || "ไม่พบข้อมูลการวิเคราะห์ เริ่มต้นเทรดเพื่อดูสถิติของคุณ"}</p>
                    <a href="/trade" className="px-6 py-2 bg-gold text-[#1A1A1A] rounded-lg font-bold hover:bg-gold-hover transition-all inline-block">
                        ไปหน้าเทรด
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">TRADER ANALYTICS</h1>
                        <p className="text-muted font-medium">มุมมองสถิติและพฤติกรรมการเทรดเชิงลึกสำหรับคุณ</p>
                    </div>
                    <div className="bg-surface px-6 py-3 rounded-full border border-theme-border flex items-center gap-3 shadow-sm">
                        <Award className="w-6 h-6 text-gold" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted font-bold uppercase tracking-wider leading-none mb-1">Trader Level</span>
                            <span className="text-lg font-black text-foreground leading-none">{analytics.traderType}</span>
                        </div>
                    </div>
                </div>

                {/* Main Scorecard / Feedback */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-3xl p-8 border border-white/10 shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-gold/10 rounded-full blur-3xl group-hover:bg-gold/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${analytics.profitable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {analytics.profitable ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                </div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{analytics.primaryFeedback}</h2>
                            </div>
                            <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl font-medium">
                                {analytics.recommendation}
                            </p>
                            <div className="flex items-center gap-2 text-gold font-bold text-sm cursor-pointer hover:gap-3 transition-all">
                                <span>เรียนรู้วิธีปรับปรุงกลยุทธ์ของคุณ</span>
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface rounded-3xl p-8 border border-theme-border shadow-soft flex flex-col justify-center items-center text-center">
                        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    className="text-theme-border"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * analytics.winRate) / 100}
                                    strokeLinecap="round"
                                    className="text-gold transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-black text-foreground leading-none">{analytics.winRate.toFixed(1)}%</span>
                                <span className="text-xs text-muted font-bold uppercase tracking-widest mt-1">Win Rate</span>
                            </div>
                        </div>
                        <p className="text-muted text-sm font-medium">จากการเทรดที่ปิดแล้วทั้งหมด {analytics.totalClosedTrades} ไม้</p>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        icon={<Target className="w-5 h-5" />}
                        label="Realized PnL"
                        value={`${analytics.totalRealizedPnL >= 0 ? '+' : ''}${analytics.totalRealizedPnL.toFixed(2)}%`}
                        color={analytics.totalRealizedPnL >= 0 ? "text-emerald-500" : "text-red-500"}
                    />
                    <MetricCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Avg. Win"
                        value={`+${analytics.averageWinPct.toFixed(2)}%`}
                        color="text-emerald-500"
                    />
                    <MetricCard
                        icon={<TrendingDown className="w-5 h-5" />}
                        label="Avg. Loss"
                        value={`${analytics.averageLossPct.toFixed(2)}%`}
                        color="text-red-500"
                    />
                    <MetricCard
                        icon={<Zap className="w-5 h-5" />}
                        label="Risk/Reward"
                        value={analytics.riskRewardRatio.toFixed(2)}
                        color={analytics.riskRewardRatio >= 1 ? "text-gold" : "text-muted"}
                    />
                </div>

                {/* Detailed Behavior Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-surface rounded-3xl p-8 border border-theme-border shadow-soft h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <PieChart className="w-6 h-6 text-gold" />
                            <h3 className="text-xl font-bold tracking-tight">Trading Behavior</h3>
                        </div>

                        <div className="space-y-6">
                            <BehaviorItem
                                label="Style Matching"
                                description="พฤติกรรมการเทรดตรงกับประเภทนักลงทุนของคุณหรือไม่"
                                status={analytics.styleMatched}
                                statusText={analytics.styleMatched ? "Matched" : "Unmatched"}
                            />
                            <BehaviorItem
                                label="Market Discipline"
                                description="ความสม่ำเสมอในการจัดการกำไรและขาดทุน"
                                status={analytics.profitable}
                                statusText={analytics.profitable ? "Disciplined" : "Improvement Needed"}
                            />
                            <BehaviorItem
                                label="Consistency Score"
                                description="ความถี่และความสม่ำเสมอของผลงาน"
                                status={analytics.winRate > 50}
                                statusText={analytics.winRate > 50 ? "Consistent" : "Volatile"}
                            />
                        </div>
                    </div>

                    <div className="bg-surface rounded-3xl p-8 border border-theme-border shadow-soft h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-8">
                            <BarChart2 className="w-6 h-6 text-gold" />
                            <h3 className="text-xl font-bold tracking-tight">Trader Insights</h3>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="p-4 rounded-2xl bg-background/50 border border-theme-border">
                                <h4 className="font-bold text-sm mb-1 text-gold">จุดแข็งของคุณ</h4>
                                <p className="text-sm text-muted">ระบบตรวจพบว่าคุณมีการจัดการความเสี่ยง (Risk/Reward) ที่ดีในไม้ที่ชนะ</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-background/50 border border-theme-border">
                                <h4 className="font-bold text-sm mb-1 text-[#5fa38e]">โอกาสพัฒนา</h4>
                                <p className="text-sm text-muted">ลดค่า Average Loss ลงจะช่วยให้อัตราการเติบโตของพอร์ต (PnL) เพิ่มขึ้นอย่างทวีคูณ</p>
                            </div>
                        </div>

                        <button className="mt-8 w-full py-4 bg-background hover:bg-theme-border border border-theme-border text-foreground font-bold rounded-2xl transition-colors">
                            Request Detailed PDF Report
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
    return (
        <div className="bg-surface p-6 rounded-3xl border border-theme-border shadow-soft hover:border-gold/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-muted group-hover:text-gold transition-colors mb-4">
                {icon}
            </div>
            <p className="text-xs text-muted font-bold uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
    );
}

function BehaviorItem({ label, description, status, statusText }: { label: string, description: string, status: boolean, statusText: string }) {
    return (
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl hover:bg-background transition-colors">
            <div className="flex-1">
                <h4 className="font-bold text-foreground mb-0.5">{label}</h4>
                <p className="text-xs text-muted">{description}</p>
            </div>
            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {statusText}
            </span>
        </div>
    );
}
