'use client';

import React, { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { useAuth } from '@/src/context/AuthContext';
import { X, Zap, Sun, Waves, Mountain, Check } from 'lucide-react';

const TRADER_OPTIONS = [
    { id: 'Scalper', label: 'Scalper', desc: 'ทำกำไรสั้นๆ ถือไม่เกิน 30 นาที', icon: <Zap className="w-5 h-5" />, color: 'text-amber-500' },
    { id: 'Day Trader', label: 'Day Trader', desc: 'จบงานภายในวัน ไม่ห่อข้ามคืน', icon: <Sun className="w-5 h-5" />, color: 'text-orange-500' },
    { id: 'Swing Trader', label: 'Swing Trader', desc: 'ถือ 2-5 วัน รอจังหวะ', icon: <Waves className="w-5 h-5" />, color: 'text-blue-500' },
    { id: 'Position Trader', label: 'Position Trader', desc: 'ลงทุนระยะยาว เน้นพื้นฐาน', icon: <Mountain className="w-5 h-5" />, color: 'text-emerald-500' },
];

interface TraderTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

export default function TraderTypeModal({ isOpen, onClose, title = "เทรดเสร็จ! 🎉", subtitle = "คุณอยากเปลี่ยนสายเทรดหรือไม่?" }: TraderTypeModalProps) {
    const { user, updateUser } = useAuth();
    const [selected, setSelected] = useState<string>(user?.traderType || 'Unknown');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    if (!isOpen || !user) return null;

    const currentType = user.traderType || 'Unknown';

    const handleSave = async () => {
        if (!user.email) return;
        try {
            setSaving(true);
            await brokerService.updateTraderType(user.email, selected);
            updateUser({ traderType: selected });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                onClose();
            }, 1200);
        } catch (err) {
            console.error('Failed to update trader type', err);
        } finally {
            setSaving(false);
        }
    };

    const handleKeep = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-surface rounded-3xl border border-theme-border shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-gold/10 to-transparent p-6 pb-4">
                    <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background flex items-center justify-center text-muted hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>

                    <h2 className="text-2xl font-black text-foreground tracking-tight">{title}</h2>
                    <p className="text-sm text-muted font-medium mt-1">{subtitle}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest">สายปัจจุบัน:</span>
                        <span className="px-3 py-1 bg-gold/20 text-gold rounded-full text-xs font-black">{currentType}</span>
                    </div>
                </div>

                {/* Options */}
                <div className="p-6 space-y-3 max-h-[320px] overflow-y-auto">
                    {TRADER_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setSelected(opt.id)}
                            className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center gap-4 group ${selected === opt.id
                                ? 'bg-gold/10 border-gold shadow-sm'
                                : 'bg-background hover:bg-surface border-theme-border'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected === opt.id ? 'bg-gold/20 text-gold' : 'bg-background text-muted group-hover:text-foreground'
                                }`}>
                                {opt.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold tracking-tight ${selected === opt.id ? 'text-gold' : 'text-foreground'}`}>
                                    {opt.label}
                                </h3>
                                <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                            </div>
                            {selected === opt.id && (
                                <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-black" />
                                </div>
                            )}
                            {opt.id === currentType && opt.id !== selected && (
                                <span className="text-[9px] text-muted font-bold uppercase tracking-wider flex-shrink-0">ตัวเดิม</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="p-6 pt-2 flex gap-3">
                    <button
                        onClick={handleKeep}
                        className="flex-1 py-3 bg-background hover:bg-theme-border border border-theme-border text-foreground font-bold rounded-2xl transition-colors text-sm"
                    >
                        อยู่สายเดิม
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || saved || selected === currentType}
                        className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${saved
                            ? 'bg-emerald-500 text-white'
                            : selected !== currentType
                                ? 'bg-gold text-[#1A1A1A] hover:bg-gold-hover'
                                : 'bg-theme-border text-muted cursor-not-allowed'
                            }`}
                    >
                        {saved ? '✅ บันทึกแล้ว!' : saving ? 'กำลังบันทึก...' : 'เปลี่ยนสาย'}
                    </button>
                </div>
            </div>
        </div>
    );
}
