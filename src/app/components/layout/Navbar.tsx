'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      router.push(`/?symbol=${searchInput.toUpperCase()}`);
    }
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 z-50 relative">
      
      {/* ------------------------------------------------------------ */}
      {/* ชั้นที่ 1 (Top Bar): Logo | Search | Auth Buttons */}
      {/* ------------------------------------------------------------ */}
      <div className="flex items-center justify-between px-6 py-3">
        
        {/* 1. Left: Logo */}
        <div className="flex items-center flex-shrink-0 w-1/4"> {/* กำหนด width เพื่อช่วยจัด center ให้ search */}
          <a href="/" aria-label="Home">
            <img 
              src="https://www.svgrepo.com/show/491978/gas-costs.svg" 
              height="40" 
              width="40" 
              alt="Logo"
            />
          </a>
        </div>

        {/* 2. Center: Search Bar (แยกออกมาอยู่ด้านบน ตรงกลาง) */}
        <div className="flex-1 flex justify-center max-w-2xl ">
            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
                <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-4xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 outline-none transition-all placeholder-gray-500" 
                    placeholder="Search symbol (e.g. AAPL)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown} 
                />
            </div>
        </div>

        {/* 3. Right: Login / Signup (แบบเดิม) */}
        <div className="flex items-center justify-end space-x-4 w-1/4">
            <a href="/login" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">
                Login
            </a>
            <a href="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Get started
            </a>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* ชั้นที่ 2 (Bottom Bar): Navigation Links */}
      {/* ------------------------------------------------------------ */}
      <div className="px-6 pb-0">
        <div className="flex space-x-8 border-t border-gray-100 pt-3 pb-3 ">
            <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-all">
                Home
            </a>
            <a href="/History" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-all">
                History
            </a>
            <a href="/PortfolioTrader" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md transition-all">
                Portfolio
            </a>
        </div>
      </div>

    </div>
  );
};

export default Navbar;