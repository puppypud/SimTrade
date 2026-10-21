'use client';

import React, { useEffect, useState } from 'react';
import { brokerService } from '@/src/app/services/brokerService';
import { MarketStatus } from '@/src/app/types/broker';

const MarketStatusBadge = () => {
    const [status, setStatus] = useState<MarketStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const data = await brokerService.getMarketStatus();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch market status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Optional: Refresh status every minute
        const interval = setInterval(fetchStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-muted font-medium">Checking Market...</span>
            </div>
        );
    }

    if (!status) return null;

    // Render logic based on status
    let indicatorColor = 'bg-green-500';
    let statusText = 'MARKET OPEN';

    if (status.status === 'MAINTENANCE') {
        indicatorColor = 'bg-orange-500';
        statusText = 'MAINTENANCE';
    } else if (status.status === 'CLOSED') {
        indicatorColor = 'bg-red-500';
        statusText = 'MARKET CLOSED';
    }

    const isClosed = status.status === 'CLOSED';
    const isMaint = status.status === 'MAINTENANCE';

    return (
        <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-lg border border-theme-border shadow-sm cursor-help hover:bg-background/80 transition-colors whitespace-nowrap"
            title={status.status === 'MAINTENANCE' ? status.message : `Next Open: ${new Date(status.nextOpen).toLocaleString()}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor} animate-pulse shadow-[0_0_4px_currentColor] flex-shrink-0`}></div>
            <span className={`text-[10px] font-black uppercase tracking-tight ${isClosed ? 'text-red-500' : isMaint ? 'text-orange-500' : 'text-emerald-500'
                }`}>
                {status.status === 'MAINTENANCE' ? 'Maintenance' : statusText}
            </span>
        </div>
    );
};

export default MarketStatusBadge;
