'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from 'next-themes';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import SearchBar from '../features/SearchBar';

// ----------------------------------------------------------------------
// 1. รายการเมนูนำทาง (Navigation Links)
// ----------------------------------------------------------------------
const navLinks = [
  { name: 'Dashboard', href: '/' },
  { name: 'Trade Stocks', href: '/trade' },
  { name: 'History', href: '/History' },
  { name: 'Portfolio', href: '/PortfolioTrader' },
  { name: 'Crypto', href: '/tradecrypto' },
  { name: 'Analytics', href: '/analytics' },
  { name: 'Admin', href: '/admin' },
];

// ----------------------------------------------------------------------
// 2. Component หลักของ Navbar
// ----------------------------------------------------------------------
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // ตั้งค่าให้รู้ว่าคอมโพเนนต์ Mount แล้ว (แก้ปัญหา Hydration Error ของ next-themes)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper ฟังก์ชันสำหรับดึงตัวอักษรแรกของชื่อ
  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="bg-surface shadow-sm border-b border-theme-border z-50 sticky top-0 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto flex items-center h-16 px-6 gap-8">

        {/* --------------------------- */}
        {/* โลโก้เว็บไซต์ */}
        {/* --------------------------- */}
        <div className="flex-shrink-0">
          <Link href="/" aria-label="Home" className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground hover:opacity-80 transition-opacity">
            <span className="text-gold">Sim</span>Trade
          </Link>
        </div>

        {/* --------------------------- */}
        {/* เมนูตรงกลาง (Navigation) */}
        {/* --------------------------- */}
        <nav className="flex items-center space-x-1 flex-1">
          {navLinks.map((link) => {
            if (!user && ['History', 'Portfolio', 'Analytics', 'Admin'].includes(link.name)) return null;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  pathname === link.href
                    ? 'text-gold bg-gold/10'
                    : 'text-muted hover:text-foreground hover:bg-background'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* --------------------------- */}
        {/* ส่วนขวา: ช่องค้นหา + โปรไฟล์ */}
        {/* --------------------------- */}
        <div className="flex items-center gap-4">

          {/* ช่องค้นหา */}
          <div className="w-64 xl:w-80">
            <SearchBar />
          </div>

          <div className="flex items-center gap-3">
            {/* ปุ่มเปลี่ยนธีม (เมื่อยังไม่ได้ล็อกอิน) */}
            {mounted && !user && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-muted hover:text-foreground hover:bg-background transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            {/* ปุ่มโปรไฟล์ผู้ใช้ + Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[#5fa38e] text-white flex items-center justify-center font-bold text-base focus:outline-none hover:ring-2 hover:ring-gold transition-all"
                >
                  {getUserInitial()}
                </button>

                {/* เนื้อหา Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-[240px] bg-surface border border-theme-border rounded-xl shadow-xl py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Header ของ Dropdown */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border">
                      <div className="w-8 h-8 rounded-full bg-[#5fa38e] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {getUserInitial()}
                      </div>
                      <span className="font-semibold text-foreground text-sm truncate">{user.name || user.email}</span>
                    </div>

                    <div className="py-1">
                      {/* ปุ่มสลับธีม */}
                      <div 
                        className="px-4 py-2 flex justify-between items-center hover:bg-background transition-colors cursor-pointer" 
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      >
                        <span className="text-foreground">Dark theme</span>
                        <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-[#5fa38e]' : 'bg-theme-border'}`}>
                          <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                      </div>

                      {/* ปุ่มออกจากระบบ */}
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                          window.location.href = '/';
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ปุ่มล็อกอิน / สมัครสมาชิก (สำหรับยังไม่ได้ล็อกอิน) */
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-muted hover:text-foreground font-medium px-3 py-2 transition-colors">
                  Log In
                </Link>
                <Link href="/register" className="px-4 py-1.5 bg-yellow-400 text-[#1A1A1A] rounded-lg text-sm font-bold hover:bg-yellow-500 transition-colors shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}