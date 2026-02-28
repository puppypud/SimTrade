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

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(amount);
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
                        <h2 className="text-xl font-bold text-foreground">Order Details</h2>
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
                                        <p className="text-sm text-muted font-medium">{order.assetClass.toUpperCase()} • {order.side}</p>
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <InfoItem label="Order ID" value={order.id.split('-')[0] + '...'} title={order.id} />
                                <InfoItem label="Client Order ID" value={order.clientOrderId.split('-')[0] + '...'} title={order.clientOrderId} />
                                <InfoItem label="Order Type" value={order.orderType} />
                                <InfoItem label="Time In Force" value={order.timeInForce} />

                                <InfoItem
                                    label="Target Quantity"
                                    value={order.qty !== null ? order.qty.toString() : (order.notional ? 'Notional' : '-')}
                                />
                                <InfoItem label="Filled Quantity" value={order.filledQty.toString()} />

                                <InfoItem label="Limit Price" value={formatCurrency(order.limitPrice)} />
                                <InfoItem label="Stop Price" value={formatCurrency(order.stopPrice)} />
                                <InfoItem label="Filled Avg Price" value={formatCurrency(order.filledAvgPrice)} />

                                <InfoItem label="Commission" value={formatCurrency(order.commission)} />
                                <InfoItem label="Extended Hours" value={order.extendedHours ? "Yes" : "No"} />
                                <InfoItem label="Asset ID" value={order.assetId.split('-')[0] + '...'} title={order.assetId} />
                            </div>

                            {/* Timestamps */}
                            <div className="bg-background rounded-xl border border-theme-border p-4 mt-6">
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Timeline
                                </h4>
                                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 text-sm">
                                    <div>
                                        <span className="text-muted block">Created</span>
                                        <span className="font-medium text-foreground">{formatDate(order.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted block">Submitted</span>
                                        <span className="font-medium text-foreground">{formatDate(order.submittedAt)}</span>
                                    </div>
                                    {order.filledAt && (
                                        <div>
                                            <span className="text-muted block">Filled</span>
                                            <span className="font-medium text-foreground">{formatDate(order.filledAt)}</span>
                                        </div>
                                    )}
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
                        Close
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
