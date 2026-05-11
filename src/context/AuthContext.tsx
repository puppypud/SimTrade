'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// ----------------------------------------------------------------------
// 1. กำหนดรูปแบบข้อมูล (User Interface & Context Type)
// ----------------------------------------------------------------------
export interface User {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    alpacaAccountId?: string;
    traderType?: string;  // ประเภทนักเทรดที่ผู้ใช้เลือกตอน Onboarding (Pre-Test)
    role?: string;        // สิทธิ์ผู้ใช้ (USER, ADMIN)
    name?: string; // keeping name for backwards compatibility
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;  // อัปเดตข้อมูล User บางส่วน (เช่น traderType)
    isLoading: boolean;
}

// ----------------------------------------------------------------------
// 2. สร้าง Context ของผู้ใช้
// ----------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------------------------------------------------------------
// 3. Provider Component สำหรับจัดการข้อมูล Auth
// ----------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // โหลดข้อมูลผู้ใช้จาก localStorage เมื่อเปิดเว็บ
    useEffect(() => {
        const storedUser = localStorage.getItem('simtrade_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user', error);
                localStorage.removeItem('simtrade_user');
            }
        }
        setIsLoading(false);
    }, []);

    // ฟังก์ชันเข้าสู่ระบบ
    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('simtrade_user', JSON.stringify(userData));
    };

    // ฟังก์ชันออกจากระบบ
    const logout = () => {
        setUser(null);
        // เก็บธีมไว้ ไม่ลบตอน logout
        const theme = localStorage.getItem('theme');
        localStorage.clear();
        if (theme) {
            localStorage.setItem('theme', theme);
        }
    };

    // ฟังก์ชันอัปเดตข้อมูลบางส่วน
    const updateUser = (updates: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...updates };
            localStorage.setItem('simtrade_user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

// ----------------------------------------------------------------------
// 4. Custom Hook สำหรับเรียกใช้ Auth 
// ----------------------------------------------------------------------
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
