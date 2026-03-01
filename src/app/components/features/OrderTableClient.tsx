'use client';

import React, { useState } from 'react';
import { Order } from '@/src/app/types/broker';
import CancelOrderButton from '@/src/app/components/features/cancelOrder';
import OrderDetailsModal from '@/src/app/components/features/OrderDetailsModal';
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

const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(amount);
};

const getStatusColor = (status: string) => {
    switch (status) {
        case "FILLED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
        case "CANCELED":
        case "EXPIRED": return "bg-gray-100 text-gray-600 border-gray-200";
        case "REJECTED":
        case "FAILED": return "bg-red-100 text-red-700 border-red-200";
        case "NEW":
        case "ACCEPTED": return "bg-blue-100 text-blue-700 border-blue-200";
        default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
};

const STATUS_LABELS: Record<string, string> = {
    FILLED: "เสร็จสิ้น",
    CANCELED: "ยกเลิก",
    EXPIRED: "หมดอายุ",
    REJECTED: "ถูกปฏิเสธ",
    FAILED: "ล้มเหลว",
    NEW: "รอจับคู่",
    ACCEPTED: "รับคำสั่ง",
    PENDING_NEW: "กำลังดำเนินการ",
    ACCEPTED_FOR_BIDDING: "รอตลาดเปิด",
    PARTIALLY_FILLED: "ได้ของบางส่วน",
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date/Time</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Symbol</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Side / Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Filled Qty</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Avg Price</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Total Value</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                        ยังไม่มีประวัติการทำรายการ
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const totalValue = order.filledQty && order.filledAvgPrice
                                        ? order.filledQty * order.filledAvgPrice
                                        : order.notional || 0;

                                    const isBuy = order.side === "BUY";
                                    const canCancel = CANCELLABLE_STATUSES.includes(order.status);

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{formatDate(order.submittedAt)}</div>
                                                {order.filledAt && order.status === "FILLED" && (
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        Filled at {new Date(order.filledAt).toLocaleTimeString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs tracking-wide">
                                                    {order.symbol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <div className="flex items-center">
                                                        <span className={`font-bold text-xs px-2.5 py-1 rounded-full border ${isBuy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                                                            {order.side}
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-2 font-semibold uppercase">
                                                            {order.orderType}
                                                        </span>
                                                    </div>
                                                    {order.limitPrice && order.limitPrice > 0 && (
                                                        <span className="text-xs text-gray-400 ml-1">Price is {formatCurrency(order.limitPrice)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                                    {STATUS_LABELS[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {order.filledQty > 0 ? (
                                                    <span className="text-gray-900 font-medium">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(order.filledQty)}</span>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono">
                                                {order.filledAvgPrice ? (
                                                    <span className="text-gray-900">{formatCurrency(order.filledAvgPrice)}</span>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-800">
                                                {totalValue > 0 ? formatCurrency(totalValue) : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(order.id)}
                                                        className="p-2 text-gray-500 hover:text-gold hover:bg-gold/10 rounded-full transition-colors group relative"
                                                        title="View Full Details"
                                                    >
                                                        <Eye className="w-5 h-5" />
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
