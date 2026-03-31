'use client';

import React, { useEffect, useState } from 'react';
import { Target, Briefcase, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/src/context/AuthContext';
import { brokerService } from '@/src/app/services/brokerService';

export interface RecommendedStocksPanelProps {
    identityProps?: string | null;
}

export default function RecommendedStocksPanel({ identityProps }: RecommendedStocksPanelProps) {
    const { user } = useAuth();
    const [identity, setIdentity] = useState<string | null>(identityProps || null);
    const [stockPicking, setStockPicking] = useState('');
    const [recommendedStocks, setRecommendedStocks] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Priority: identityProps > Database > localStorage fallback
    useEffect(() => {
        if (identityProps) {
            setIdentity(identityProps);
            return;
        }

        // ดึงจาก Database ผ่าน API (ข้อมูลจาก quiz ที่เก็บไว้)
        const fetchFromDB = async () => {
            if (!user?.id) {
                // ถ้ายังไม่ login ลองจาก localStorage
                const saved = localStorage.getItem('simtrade_identity');
                if (saved) setIdentity(saved);
                return;
            }

            try {
                setLoading(true);
                const profile = await brokerService.getUserProfile(user.id);
                if (profile.traderType && profile.traderType !== 'Unknown') {
                    setIdentity(profile.traderType);
                    // อัพเดท localStorage ให้ตรงกับ DB ด้วย
                    localStorage.setItem('simtrade_identity', profile.traderType);
                } else {
                    const saved = localStorage.getItem('simtrade_identity');
                    if (saved) setIdentity(saved);
                }
            } catch (err) {
                console.error("Failed to fetch trader type from DB:", err);
                // Fallback to localStorage
                const saved = localStorage.getItem('simtrade_identity');
                if (saved) setIdentity(saved);
            } finally {
                setLoading(false);
            }
        };

        fetchFromDB();
    }, [identityProps, user?.id]);

    useEffect(() => {
        if (!identity) return;

        if (identity === 'Scalper') {
            setStockPicking('หุ้นกลุ่มเก็งกำไร (Speculative) ที่มีการแกว่งตัวของราคาสูง');
            setRecommendedStocks(['MSTR', 'COIN', 'MARA']);
        } else if (identity === 'Day Trader') {
            setStockPicking('หุ้นที่มีวอลุ่มและจับจังหวะสวิงในกลุ่มกระแส (Trending)');
            setRecommendedStocks(['NVDA', 'TSLA', 'NFLX']);
        } else if (identity === 'Swing Trader') {
            setStockPicking('หุ้นวัฏจักร (Cyclical) หรือกลุ่มเล่นรอบ (Swing) ที่ติดแนวรับแนวต้านชัดเจน');
            setRecommendedStocks(['JPM', 'DIS', 'NKE']);
        } else if (identity === 'Position Trader' || identity === 'Position Trader / Investor') {
            setStockPicking('หุ้น Blue Chip หรือกลุ่มมั่นคง (Stable) ที่มีพื้นฐานดีทนทานต่อตลาด');
            setRecommendedStocks(['KO', 'WMT', 'LLY']);
        }
    }, [identity]);

    if (loading) {
        return null;
    }

    if (!user) {
        return (
            <div className="bg-gradient-to-br from-surface to-surface/50 border border-theme-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-colors duration-300">
                {/* Blur Overlay & Content */}
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[6px] z-20 flex flex-col items-center justify-center p-6 text-center transition-all">
                    <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                        ค้นหาสไตล์การเทรดในแบบของคุณ (Discover Your Trader Identity)
                    </h3>
                    <p className="text-muted text-sm max-w-md mb-6">
                        และรับลิสต์หุ้นแนะนำพิเศษ
                    </p>
                    <button 
                        onClick={() => alert("ฟีเจอร์นี้สำหรับสมาชิกเท่านั้น สมัครเลยเพื่อค้นหาสไตล์ของคุณ!")}
                        className="px-6 py-2.5 bg-yellow-400 text-[#1A1A1A] font-extrabold rounded-xl hover:bg-yellow-500 transition-colors shadow-md"
                    >
                        สมัครเลย
                    </button>
                </div>

                {/* Mock Structure underneath (Blurred) */}
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start opacity-40 pointer-events-none select-none">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gold/20 rounded-xl">
                                <Briefcase className="w-8 h-8 text-gold" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Stock Picking Strategy</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Trader Identity</h4>
                                <p className="text-3xl font-black text-foreground">{'Day Trader'}</p>
                            </div>
                            <div className="h-px w-full bg-theme-border/50 my-4"></div>
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">กลุ่มหุ้นที่ประเมินแล้วว่าเหมาะกับคุณ</h4>
                                <p className="text-lg text-foreground font-medium leading-relaxed">{'หุ้นที่มีวอลุ่มและจับจังหวะสวิงในกลุ่มกระแส (Trending)'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-background/50 rounded-2xl p-6 border border-theme-border/50">
                        <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                            <Target className="w-5 h-5 text-gold" /> หุ้นที่ระบบแนะนำสำหรับแผนนี้
                        </h4>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {['AAPL', 'MSFT', 'TSLA'].map(sym => (
                                <div key={sym} className="px-4 py-4 bg-surface border-2 border-theme-border rounded-xl text-center flex flex-col items-center justify-center gap-1">
                                    <span className="text-xl font-black text-foreground">{sym}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!identity) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-surface to-surface/50 border border-gold/30 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">

                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gold/20 rounded-xl">
                            <Briefcase className="w-8 h-8 text-gold" />
                        </div>
                        <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Stock Picking Strategy</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">Trader Identity</h4>
                            <p className="text-3xl font-black text-foreground">{identity}</p>
                        </div>
                        <div className="h-px w-full bg-theme-border/50 my-4"></div>
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-2">กลุ่มหุ้นที่ประเมินแล้วว่าเหมาะกับคุณ</h4>
                            <p className="text-lg text-foreground font-medium leading-relaxed">{stockPicking}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full bg-background/50 rounded-2xl p-6 border border-theme-border/50 backdrop-blur-sm">
                    <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-gold" /> หุ้นที่ระบบแนะนำสำหรับแผนนี้
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {recommendedStocks.map(sym => (
                            <Link
                                href={`/trade?symbol=${sym}`}
                                key={sym}
                                className="group relative px-4 py-4 bg-surface border-2 border-theme-border rounded-xl text-center hover:border-gold hover:bg-gold/5 transition-all shadow-sm hover:shadow-md overflow-hidden flex flex-col items-center justify-center gap-1"
                            >
                                <span className="text-xl font-black text-foreground group-hover:text-gold transition-colors">{sym}</span>
                                <span className="text-[10px] uppercase font-bold text-muted group-hover:text-gold/70">Trade Now</span>
                            </Link>
                        ))}
                    </div>
                    <p className="text-xs text-muted mt-4 text-center">คลิกที่รายชื่อหุ้นเพื่อเริ่มซื้อขายตามแผนของคุณได้ทันที</p>
                </div>
            </div>
        </div>
    );
}
