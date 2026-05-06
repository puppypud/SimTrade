// src/context/NotificationContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import BehaviorAlertPopup, { BehaviorAlert } from '../app/components/features/BehaviorAlertPopup';

interface NotificationContextType {
    showAlert: (alert: BehaviorAlert) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [activeAlert, setActiveAlert] = useState<BehaviorAlert | null>(null);

    const showAlert = useCallback((alert: BehaviorAlert) => {
        setActiveAlert(alert);
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        console.log(`🔌 Connecting to WebSocket for User ID: ${user.id}...`);

        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws-alerts',
            onConnect: () => {
                console.log('✅ Connected to WebSocket');
                client.subscribe(`/topic/alerts/${user.id}`, (message) => {
                    const alert = JSON.parse(message.body);
                    console.log('🚨 Received Alert:', alert);
                    showAlert(alert);
                });
            },
            onStompError: (frame) => {
                console.error('❌ STOMP Error:', frame.headers['message']);
            },
            onWebSocketError: (event) => {
                console.error('❌ WebSocket Error:', event);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.activate();

        return () => {
            console.log('🔌 Disconnecting WebSocket...');
            client.deactivate();
        };
    }, [user?.id, showAlert]);

    return (
        <NotificationContext.Provider value={{ showAlert }}>
            {children}
            <BehaviorAlertPopup alert={activeAlert} onClose={() => setActiveAlert(null)} />
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
