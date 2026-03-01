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

    if (status.isMaintenanceMode) {
        indicatorColor = 'bg-orange-500';
        statusText = 'MAINTENANCE';
    } else if (!status.isOpen) {
        indicatorColor = 'bg-red-500';
        statusText = 'MARKET CLOSED';
    }

    return (
        <div className="flex items-center space-x-2 bg-background px-3 py-1.5 rounded-full border border-theme-border shadow-sm cursor-help"
            title={status.isMaintenanceMode ? status.maintenanceMessage || 'System is under maintenance' : `Next Open: ${new Date(status.nextOpen).toLocaleString()}`}>
            <div className={`w-2 h-2 rounded-full ${indicatorColor} animate-pulse shadow-[0_0_8px_currentColor]`}></div>
            <span className="text-[10px] sm:text-xs font-bold tracking-wider text-foreground uppercase">
                {statusText}
            </span>
        </div>
    );
};

export default MarketStatusBadge;
