'use client';

import React, { useEffect, useState } from 'react';
import { Target, Briefcase } from 'lucide-react';
import Link from 'next/link';

export interface RecommendedStocksPanelProps {
    identityProps?: string | null;
}

export default function RecommendedStocksPanel({ identityProps }: RecommendedStocksPanelProps) {
    const [identity, setIdentity] = useState<string | null>(identityProps || null);
    const [stockPicking, setStockPicking] = useState('');
    const [recommendedStocks, setRecommendedStocks] = useState<string[]>([]);

    useEffect(() => {
        // If no prop passed, try to fetch from local storage
        if (!identity) {
            const savedIdentity = localStorage.getItem('simtrade_identity');
            if (savedIdentity) {
                setIdentity(savedIdentity);
            }
        }
    }, [identity]);

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
        } else if (identity === 'Position Trader / Investor') {
            setStockPicking('หุ้น Blue Chip หรือกลุ่มมั่นคง (Stable) ที่มีพื้นฐานดีทนทานต่อตลาด');
            setRecommendedStocks(['KO', 'WMT', 'LLY']);
        }
    }, [identity]);

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
