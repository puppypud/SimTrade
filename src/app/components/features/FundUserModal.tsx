'use client';

import React, { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { BanknotesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FundUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    userName: string;
}

export default function FundUserModal({ isOpen, onClose, onSuccess, userId, userName }: FundUserModalProps) {
    const [amount, setAmount] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFund = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount.replace(/,/g, ''));

        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount greater than 0");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await brokerService.fundUserAccount(userId, numAmount);
            onSuccess();
            setAmount('');
            onClose();
        } catch (err: any) {
            console.error("Failed to fund user account:", err);
            setError(err.message || "Failed to add funds to the user account.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePresetClick = (val: number) => {
        setAmount(val.toString());
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-gray-900">Fund User Account</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleFund} className="p-6">
                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            Adding funds to <span className="font-bold text-gray-900">{userName}</span>
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Amount to Add (USD)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-lg font-medium">$</span>
                            </div>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                required
                                className="pl-8 block w-full border border-gray-300 rounded-xl py-3 px-4 text-gray-900 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg font-semibold transition-shadow"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[1000, 5000, 10000].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => handlePresetClick(preset)}
                                className="py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
                            >
                                +${preset >= 1000 ? `${preset / 1000}k` : preset}
                            </button>
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !amount}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? "Processing..." : "Add Funds to User"}
                    </button>
                </form>
            </div>
        </div>
    );
}
