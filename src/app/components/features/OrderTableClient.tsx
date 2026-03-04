'use client';

import React, { useState } from 'react';
import { Order } from '@/src/app/types/broker';
import CancelOrderButton from '@/src/app/components/features/cancelOrder';
import OrderDetailsModal from '@/src/app/components/features/OrderDetailsModal';
import { formatSymbolDisplay } from "@/src/app/utils/formatters";
import { Eye } from 'lucide-react';

const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
        hour12: false,
    });
};

const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(num);
};

const getStatusColor = (status: string) => {
    switch (status) {
        case "FILLED": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        case "CANCELED":
        case "EXPIRED": return "bg-muted/10 text-muted border-muted/20";
        case "REJECTED":
        case "FAILED": return "bg-red-500/10 text-red-500 border-red-500/20";
        case "NEW":
        case "ACCEPTED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        default: return "bg-muted/5 text-muted border-muted/10";
    }
};

const STATUS_LABELS: Record<string, string> = {
    FILLED: "Filled",
    CANCELED: "Canceled",
    EXPIRED: "Expired",
    REJECTED: "Rejected",
    FAILED: "Failed",
    NEW: "New",
    ACCEPTED: "Accepted",
    PENDING_NEW: "Processing",
    ACCEPTED_FOR_BIDDING: "Market Pending",
    PARTIALLY_FILLED: "Partially Filled",
};

const CANCELLABLE_STATUSES = [
    "NEW", "ACCEPTED", "PENDING_NEW", "ACCEPTED_FOR_BIDDING", "PARTIALLY_FILLED",
];

export default function OrderTableClient({ orders, accountId }: { orders: Order[], accountId: string }) {
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const handleOpenModal = (orderId: string) => setSelectedOrderId(orderId);
    const handleCloseModal = () => setSelectedOrderId(null);

    return (
        <>
            <div className="bg-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-foreground/80">
                        <thead className="bg-background/50 border-b border-theme-border">
                            <tr>
                                <th className="px-6 py-4 font-bold text-foreground">Date/Time</th>
                                <th className="px-6 py-4 font-bold text-foreground">Symbol</th>
                                <th className="px-6 py-4 font-bold text-foreground">Side / Type</th>
                                <th className="px-6 py-4 font-bold text-foreground">Status</th>
                                <th className="px-6 py-4 font-bold text-foreground text-right">Filled Qty</th>
                                <th className="px-6 py-4 font-bold text-foreground text-right">Avg Price</th>
                                <th className="px-6 py-4 font-bold text-foreground text-right">Total Value</th>
                                <th className="px-6 py-4 font-bold text-foreground text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/50">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted">
                                        No transaction history available.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const fQty = typeof order.filledQty === 'string' ? parseFloat(order.filledQty) : (order.filledQty || 0);
                                    const fPrice = typeof order.filledAvgPrice === 'string' ? parseFloat(order.filledAvgPrice) : (order.filledAvgPrice || 0);
                                    const notional = typeof order.notional === 'string' ? parseFloat(order.notional) : (order.notional || 0);
                                    const limitPrice = typeof order.limitPrice === 'string' ? parseFloat(order.limitPrice) : (order.limitPrice || 0);

                                    const totalValue = fQty > 0 && fPrice > 0
                                        ? fQty * fPrice
                                        : notional;

                                    const isBuy = order.side === "BUY";
                                    const canCancel = CANCELLABLE_STATUSES.includes(order.status);

                                    return (
                                        <tr key={order.id} className="hover:bg-background/40 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-foreground">{formatDate(order.submittedAt)}</div>
                                                {order.filledAt && order.status === "FILLED" && (
                                                    <div className="text-[10px] text-muted mt-0.5">
                                                        Filled at {new Date(order.filledAt).toLocaleTimeString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-foreground bg-background px-2.5 py-1 rounded text-[11px] tracking-widest border border-theme-border shadow-sm">
                                                    {formatSymbolDisplay(order.symbol)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <div className="flex items-center">
                                                        <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full border ${isBuy ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                                                            {order.side}
                                                        </span>
                                                        <span className="text-[10px] text-muted ml-2 font-black uppercase tracking-wider">
                                                            {order.orderType}
                                                        </span>
                                                    </div>
                                                    {limitPrice > 0 && (
                                                        <span className="text-[10px] text-muted/60 ml-1">Price: {formatCurrency(limitPrice)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${getStatusColor(order.status)}`}>
                                                    {STATUS_LABELS[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm">
                                                {fQty > 0 ? (
                                                    <span className="text-foreground font-bold">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(fQty)}</span>
                                                ) : <span className="text-muted/30">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                                                {fPrice > 0 ? (
                                                    <span>{formatCurrency(fPrice)}</span>
                                                ) : <span className="text-muted/30">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-sm text-foreground">
                                                {totalValue > 0 ? formatCurrency(totalValue) : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(order.id)}
                                                        className="p-2 text-muted hover:text-gold hover:bg-gold/10 rounded-xl transition-all group"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4.5 h-4.5" />
                                                    </button>
                                                    {canCancel && <CancelOrderButton accountId={accountId} orderId={order.id} />}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedOrderId && (
                <OrderDetailsModal
                    accountId={accountId}
                    orderId={selectedOrderId}
                    isOpen={!!selectedOrderId}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}
