// src/app/components/features/BehaviorAlertPopup.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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
        setTimeout(onClose, 400);
    };

    const handleMute = () => {
        localStorage.setItem('simtrade_mute_behavior_alerts', 'true');
        setIsMuted(true);
        handleClose();
    };

    if ((!alert && !isVisible) || isMuted) return null;

    const getSeverityColor = () => {
        switch (alert?.severity) {
            case 'DANGER': return 'bg-red-500';
            case 'WARNING': return 'bg-orange-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <div className={`fixed top-12 right-6 z-[9999] transition-all duration-500 transform ${
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        }`}>
            <div className="w-[320px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden flex">
                
                {/* Minimal Vertical Severity Bar */}
                <div className={`w-1.5 ${getSeverityColor()}`} />

                <div className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                            Behavior Insight
                        </span>
                        <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        {alert?.title}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                        {alert?.message}
                    </p>

                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <button 
                            onClick={handleMute}
                            className="text-[10px] text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            ปิดถาวร
                        </button>
                        <button 
                            onClick={handleClose}
                            className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-70"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
