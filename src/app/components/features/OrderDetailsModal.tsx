'use client';

import React, { useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { Order } from '@/src/app/types/broker';
import { X, Search, Clock, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

interface OrderDetailsModalProps {
    accountId: string;
    orderId: string;
    isOpen: boolean;
    onClose: () => void;
}

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

const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Bangkok",
        hour12: false,
    });
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ accountId, orderId, isOpen, onClose }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!isOpen || !orderId) return;

            setIsLoading(true);
            setError(null);
            try {
                const data = await brokerService.getSingleOrder(accountId, orderId);
                setOrder(data);
            } catch (err) {
                console.error("Failed to fetch order details", err);
                setError("Unable to load order details. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrderDetails();
    }, [isOpen, orderId, accountId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl border border-theme-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-background/50">
                    <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-gold" />
                        <h2 className="text-xl font-bold text-foreground">รายละเอียดคำสั่งซื้อ</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-theme-border text-muted hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-20 bg-theme-border rounded-xl w-full"></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-12 bg-theme-border rounded-lg"></div>
                                <div className="h-12 bg-theme-border rounded-lg"></div>
                                <div className="h-12 bg-theme-border rounded-lg"></div>
                                <div className="h-12 bg-theme-border rounded-lg"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-foreground font-medium">{error}</p>
                        </div>
                    ) : order ? (
                        <div className="space-y-6">

                            {/* Top Banner Status */}
                            <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-theme-border">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${order.status === 'FILLED' ? 'bg-green-100 text-green-600' :
                                        ['CANCELED', 'REJECTED', 'EXPIRED'].includes(order.status) ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        {order.status === 'FILLED' ? <CheckCircle2 className="w-6 h-6" /> :
                                            ['CANCELED', 'REJECTED'].includes(order.status) ? <XCircle className="w-6 h-6" /> :
                                                <Clock className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-foreground">{order.symbol}</h3>
                                        <p className="text-sm text-muted font-medium">{order.assetClass?.toUpperCase()} • {order.side}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 text-sm font-bold rounded-full border ${order.status === 'FILLED' ? 'bg-green-50 text-green-700 border-green-200' :
                                        ['CANCELED', 'REJECTED'].includes(order.status) ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <InfoItem label="เลขที่คำสั่งซื้อ (ID)" value={order.id.split('-')[0] + '...'} title={order.id} />
                                {order.clientOrderId && <InfoItem label="Client Order ID" value={order.clientOrderId.split('-')[0] + '...'} title={order.clientOrderId} />}
                                <InfoItem label="ประเภทคำสั่ง" value={order.orderType} />
                                {order.timeInForce && <InfoItem label="ระยะเวลาคำสั่ง" value={order.timeInForce} />}

                                <InfoItem
                                    label="ปริมาณ / ยอดเงินที่สั่ง"
                                    value={order.qty !== null ? `${order.qty} หุ้น` : (order.notional ? formatCurrency(order.notional) : '-')}
                                />
                                <InfoItem label="จำนวนที่ได้" value={order.filledQty?.toString() || '0'} />

                                {formatCurrency(order.limitPrice) !== "-" && <InfoItem label="ราคา Limit" value={formatCurrency(order.limitPrice)} />}
                                {formatCurrency(order.stopPrice) !== "-" && <InfoItem label="ราคา Stop" value={formatCurrency(order.stopPrice)} />}
                                <InfoItem label="ราคาเฉลี่ย" value={formatCurrency(order.filledAvgPrice)} />

                                <div className="flex flex-col">
                                    <span className="text-xs text-muted font-medium mb-1">ค่าธรรมเนียม(0.025%)</span>
                                    <span className="text-sm font-semibold text-red-500 truncate">
                                        {formatCurrency(order.commission)}
                                    </span>
                                </div>
                                {order.extendedHours !== undefined && <InfoItem label="นอกเวลาทำการ" value={order.extendedHours ? "ใช่" : "ไม่"} />}
                                <InfoItem label="ประเภทสินทรัพย์" value={order.assetClass?.toUpperCase() || '-'} />
                            </div>

                            {/* Timestamps */}
                            <div className="bg-background rounded-xl border border-theme-border p-5 mt-8">
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" /> ไทม์ไลน์
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-muted text-xs mb-1">สร้างคำสั่ง</span>
                                        <span className="font-medium text-foreground truncate">{formatDate(order.createdAt || order.submittedAt)}</span>
                                    </div>
                                    <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-theme-border/50 sm:pl-4 pt-3 sm:pt-0">
                                        <span className="text-muted text-xs mb-1">ส่งเข้าตลาด</span>
                                        <span className="font-medium text-foreground truncate">{formatDate(order.submittedAt)}</span>
                                    </div>
                                    <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-theme-border/50 sm:pl-4 pt-3 sm:pt-0">
                                        <span className="text-muted text-xs mb-1">
                                            {order.status === 'FILLED' ? 'จับคู่สำเร็จ' :
                                                ['CANCELED', 'REJECTED'].includes(order.status) ? 'ยกเลิกเมื่อ' : 'อัปเดตล่าสุด'}
                                        </span>
                                        <span className="font-medium text-foreground truncate">{formatDate(order.filledAt || order.submittedAt)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-background/50 border-t border-theme-border flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-theme-border hover:bg-gray-300 text-foreground font-medium rounded-lg transition-colors"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper component for grid items
const InfoItem = ({ label, value, title }: { label: string, value: React.ReactNode, title?: string }) => (
    <div className="flex flex-col" title={title}>
        <span className="text-xs text-muted font-medium mb-1">{label}</span>
        <span className="text-sm font-semibold text-foreground truncate">{value}</span>
    </div>
);

export default OrderDetailsModal;
