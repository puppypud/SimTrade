'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from 'next-themes';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import MarketStatusBadge from '../features/MarketStatusBadge';
import SearchBar from '../features/SearchBar';
import { brokerService } from '@/src/app/services/brokerService';

const Navbar = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [buyingPower, setBuyingPower] = useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const fetchBuyingPower = async () => {
      if (!user?.alpacaAccountId) return;
      try {
        const data = await brokerService.getAccountInfo(user.alpacaAccountId);
        setBuyingPower(Number(data.buyingPower));
      } catch (error) {
        console.error("Failed to fetch buying power", error);
      }
    };
    fetchBuyingPower();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-surface shadow-sm border-b border-theme-border z-50 relative transition-colors duration-300">

      {/* ------------------------------------------------------------ */}
      {/* ชั้นที่ 1 (Top Bar): Logo | Search | Auth Buttons */}
      {/* ------------------------------------------------------------ */}
      <div className="flex items-center justify-between px-6 py-3">

        {/* 1. Left: Logo & Market Status */}
        <div className="flex items-center gap-4 flex-shrink-0 w-1/4">
          <a href="/" aria-label="Home">
            <img
              src="https://www.svgrepo.com/show/491978/gas-costs.svg"
              height="40"
              width="40"
              alt="Logo"
            />
          </a>
          <MarketStatusBadge />
        </div>

        {/* 2. Center: Search Bar (แยกออกมาอยู่ด้านบน ตรงกลาง) */}
        <div className="flex-1 flex justify-center max-w-2xl px-4">
          <SearchBar />
        </div>

        {/* 3. Right: Login / Signup or User Profile */}
        <div className="flex items-center justify-end space-x-4 w-1/4">
          {/* Theme Toggle Button for non-logged-in users */}
          {mounted && !user && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-muted hover:text-foreground hover:bg-background transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          {user ? (
            <div className="flex items-center space-x-4">
              {/* Buying Power Display inside Navigation for quick context */}
              <div className="hidden lg:flex flex-col items-end justify-center mr-2">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider mb-0.5">Buying Power</span>
                <span className="text-sm font-extrabold text-gold leading-none">
                  {buyingPower !== null ? formatCurrency(buyingPower) : "Loading..."}
                </span>
              </div>

              {/* Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-10 h-10 rounded-full bg-[#5fa38e] text-white flex items-center justify-center font-bold text-lg focus:outline-none hover:ring-2 hover:ring-gold transition-all"
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-[260px] bg-surface border border-theme-border rounded-xl shadow-xl py-2 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Name */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-border">
                      <div className="w-10 h-10 rounded-full bg-[#5fa38e] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="font-semibold text-foreground text-sm truncate">{user.name || user.email}</span>
                    </div>

                    <div className="py-2 border-b border-theme-border">
                      <button className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors flex justify-between items-center">
                        <span>Settings and billing</span>
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors flex justify-between items-center">
                        <span>Refer a friend</span>
                        <span className="text-muted font-medium">$0</span>
                      </button>
                    </div>

                    <div className="py-2 border-b border-theme-border">
                      <button className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors">
                        Help Center
                      </button>
                      <button className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors flex justify-between items-center">
                        <span>What's new</span>
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">11</span>
                      </button>
                    </div>

                    <div className="py-2 border-b border-theme-border">
                      <div className="px-4 py-2 flex justify-between items-center hover:bg-background transition-colors cursor-pointer" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        <span className="text-foreground">Dark theme</span>
                        {/* Toggle Switch */}
                        <div className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-[#5fa38e]' : 'bg-theme-border'}`}>
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                      </div>
                      <button className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors flex justify-between items-center">
                        <span>Language</span>
                        <span className="text-muted flex items-center gap-1">English <span className="text-xs">&gt;</span></span>
                      </button>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                          router.push('/');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-background text-foreground transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-muted hover:text-foreground font-medium transition-colors">
                Login
              </Link>
              <Link href="/register" className="px-4 py-2 bg-gold text-[#1A1A1A] rounded-md font-medium hover:bg-gold-hover transition-colors shadow-sm">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* ชั้นที่ 2 (Bottom Bar): Navigation Links */}
      {/* ------------------------------------------------------------ */}
      <div className="px-6 pb-0">
        <div className="flex space-x-8 border-t border-theme-border pt-3 pb-3 ">
          <Link href="/" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            Dashboard
          </Link>
          <Link href="/trade" className="text-sm font-medium text-gold hover:text-gold-hover hover:bg-background px-3 py-2 rounded-md transition-all">
            Trade Stocks
          </Link>
          <Link href="/History" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            History
          </Link>
          <Link href="/PortfolioTrader" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            Portfolio
          </Link>
          <Link href="/tradecrypto" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            Crypto
          </Link>
          <Link href="/analytics" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            Analytics
          </Link>
          <Link href="/admin" className="text-sm font-medium text-muted hover:text-foreground hover:bg-background px-3 py-2 rounded-md transition-all">
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;