// src/app/components/features/BehaviorAlertPopup.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export interface BehaviorAlert {
    alertType: string;
    title: string;
    message: string;
    severity: 'WARNING' | 'DANGER' | 'INFO';
}

interface BehaviorAlertPopupProps {
    alert: BehaviorAlert | null;
    onClose: () => void;
}

export default function BehaviorAlertPopup({ alert, onClose }: BehaviorAlertPopupProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const muted = localStorage.getItem('simtrade_mute_behavior_alerts') === 'true';
        setIsMuted(muted);

        if (alert && !muted) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 25000);
            return () => clearTimeout(timer);
        }
    }, [alert]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 500);
    };

    const handleMute = () => {
        localStorage.setItem('simtrade_mute_behavior_alerts', 'true');
        setIsMuted(true);
        handleClose();
    };

    if ((!alert && !isVisible) || isMuted) return null;

    // Severity based colors mapping to theme
    const getSeverityDetails = () => {
        switch (alert?.severity) {
            case 'DANGER': return { color: 'text-red-500', glow: 'shadow-red-500/10' };
            case 'WARNING': return { color: 'text-amber-500', glow: 'shadow-amber-500/10' };
            default: return { color: 'text-gold', glow: 'shadow-gold/10' };
        }
    };

    const details = getSeverityDetails();

    return (
        <div className={`fixed top-12 right-6 z-[9999] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) transform ${
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}>
            {/* Main Container - Themed with Surface and Gold */}
            <div className={`w-[360px] bg-surface/95 border border-theme-border/50 rounded-xl shadow-2xl ${details.glow} overflow-hidden`}>
                
                {/* Subtle Accent Line */}
                <div className={`h-1 w-full bg-gradient-to-r from-transparent via-gold to-transparent opacity-50`} />

                <div className="p-4">
                    {/* Top Row: AI Label & Close */}
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-gold animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[0.2em] text-muted uppercase">
                                Trading Psychology
                            </span>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-muted hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Main Message Area */}
                    <div className="space-y-1">
                        <h4 className={`text-xs font-bold tracking-tight ${details.color} flex items-center gap-2`}>
                            {alert?.title}
                        </h4>
                        <p className="text-[13px] text-foreground font-medium leading-relaxed">
                            {alert?.message}
                        </p>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 flex items-center justify-between">
                        <button 
                            onClick={handleMute}
                            className="text-[10px] text-muted hover:text-red-400 transition-colors font-semibold"
                        >
                            ปิดการแจ้งเตือนพฤติกรรมนี้
                        </button>
                        
                        <button 
                            onClick={handleClose}
                            className="px-3 py-1 bg-gold/10 hover:bg-gold/20 text-gold rounded-full text-[10px] font-bold transition-all border border-gold/20"
                        >
                            รับทราบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
