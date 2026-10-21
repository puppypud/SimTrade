import React from 'react';
import { Newspaper } from 'lucide-react';

const mockNews = [
    {
        id: 1,
        text: "Tech giants report record earnings for Q3, driven by cloud and AI growth.",
        impact: "positive",
        topic: "TECH"
    },
    {
        id: 2,
        text: "Federal Reserve hints at potential rate cuts later this year amid cooling inflation.",
        impact: "neutral",
        topic: "MACRO"
    },
    {
        id: 3,
        text: "Oil prices surge 4% on geopolitical tensions in the Middle East.",
        impact: "negative",
        topic: "COMMODITIES"
    },
    {
        id: 4,
        text: "Electric vehicle sales accelerate globally, surpassing 20% market share.",
        impact: "positive",
        topic: "AUTOMOTIVE"
    },
    {
        id: 5,
        text: "Bitcoin briefly tests new all-time highs before seeing mild profit-taking.",
        impact: "neutral",
        topic: "CRYPTO"
    },
];

export default function MarketNewsBanner() {
    return (
        <div className="w-full bg-surface border-b border-theme-border text-foreground transition-colors duration-300 overflow-hidden py-2.5 relative flex items-center shadow-inner rounded-t-2xl md:rounded-2xl">
            {/* Left label "LATEST NEWS" covering the left edge */}
            <div className="absolute left-0 top-0 bottom-0 bg-gold text-background font-bold text-xs px-4 flex items-center gap-2 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.5)] md:rounded-l-2xl">
                <Newspaper className="w-4 h-4" />
                <span className="hidden sm:inline tracking-wider">MARKET NEWS</span>
                <span className="sm:hidden tracking-wider">NEWS</span>
            </div>

            {/* Marquee Container */}
            <div className="flex whitespace-nowrap overflow-hidden w-full pl-36 sm:pl-48">
                <div className="animate-marquee inline-flex items-center gap-8">
                    {/* Double the array for seamless endless scrolling */}
                    {[...mockNews, ...mockNews].map((news, index) => (
                        <div key={`${news.id}-${index}`} className="flex items-center gap-2 text-sm font-medium">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                                ${news.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                                    news.impact === 'negative' ? 'bg-red-500/20 text-red-400' :
                                        'bg-background text-muted'
                                }`}>
                                {news.topic}
                            </span>
                            <span className="text-foreground">
                                {news.text}
                            </span>
                            <span className="text-muted mx-4">•</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fade effect on the right edge */}
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-surface to-transparent z-10 md:rounded-r-2xl pointer-events-none"></div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 35s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                `
            }} />
        </div>
    );
}
