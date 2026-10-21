"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Wallet, 
  UserPlus, 
  Lock, 
  ArrowRight, 
  PlayCircle,
  BarChart3,
  ShieldCheck
} from 'lucide-react';

export default function LandingPage() {
  const [hoveredStock, setHoveredStock] = useState<number | null>(null);

  // ข้อมูลจำลองสำหรับโชว์หน้าเว็บ
  const marketSnapshot = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: '173.50', change: '+1.25%', isUp: true },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '884.55', change: '+3.42%', isUp: true },
    { symbol: 'TSLA', name: 'Tesla, Inc.', price: '175.34', change: '-1.12%', isUp: false },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: '428.32', change: '+0.85%', isUp: true },
  ];

  return (
    <div className="min-h-screen bg-[#0E1015] text-white font-sans selection:bg-yellow-400 selection:text-black">


      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs font-medium text-gray-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              แพลตฟอร์มจำลองการเทรดอันดับ 1
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              ฝึกเทรดหุ้นระดับโลก <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                โดยไม่มีความเสี่ยง
              </span>
            </h1>
            <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto md:mx-0">
              เริ่มต้นเส้นทางนักลงทุนของคุณวันนี้ รับพอร์ตโฟลิโอจำลองมูลค่า <span className="text-white font-bold">$100,000</span> ฟรีทันที ไม่ต้องใช้เงินจริง ไม่ต้องกลัวขาดทุน เหมาะสำหรับมือใหม่ที่อยากลองสนาม!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Link href="/register" className="bg-yellow-400 text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center justify-center gap-2 group">
                รับเงินจำลอง $100,000 ฟรี! 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="bg-gray-800 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 border border-gray-700">
                <PlayCircle className="w-5 h-5 text-gray-400" />
                ดูวิธีใช้งาน
              </button>
            </div>
          </div>

          {/* Abstract Visual (No Charts) */}
          <div className="flex-1 w-full max-w-md relative">
            <div className="bg-[#1A1D24] p-6 rounded-3xl border border-gray-800 shadow-2xl relative z-10">
              <div className="flex justify-between items-center mb-6">
                <div className="text-gray-400 text-sm">Portfolio Value</div>
                <div className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30">+5.42% วันนี้</div>
              </div>
              <div className="text-5xl font-mono font-bold text-white mb-2">$105,420.00</div>
              <div className="text-sm text-gray-500 mb-8">Buying Power: $12,050.50</div>
              
              <div className="space-y-3">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="bg-gray-800/50 p-3 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">A</div>
                      <div>
                        <div className="w-16 h-3 bg-gray-600 rounded mb-1"></div>
                        <div className="w-10 h-2 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <div>
                      <div className="w-12 h-3 bg-green-500/50 rounded mb-1 ml-auto"></div>
                      <div className="w-8 h-2 bg-gray-700 rounded ml-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 bg-[#1A1D24] border border-gray-800 p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="bg-yellow-400/20 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-xs text-gray-400">สถานะความเสี่ยง</div>
                <div className="text-sm font-bold text-white">ปลอดภัย 100%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works (3 Steps) */}
      <section className="px-6 py-20 bg-[#12141A] border-y border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">เริ่มต้นง่ายๆ ใน 3 ขั้นตอน</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">ไม่จำเป็นต้องมีความรู้เรื่องกราฟหรือเทคนิคซับซ้อน ก็สามารถเริ่มต้นเรียนรู้ตลาดหุ้นได้ทันที</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#1A1D24] p-8 rounded-3xl border border-gray-800 text-center hover:border-yellow-400/50 transition-colors">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500">
                <UserPlus className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. สมัครสมาชิกฟรี</h3>
              <p className="text-gray-400 text-sm">ใช้เวลาเพียง 1 นาที สมัครด้วยอีเมลหรือ Google Account ก็พร้อมใช้งานทันที</p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-[#1A1D24] p-8 rounded-3xl border border-gray-800 text-center hover:border-yellow-400/50 transition-colors relative">
              <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                รับทันที!
              </div>
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-green-500">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. รับเงินทุนจำลอง</h3>
              <p className="text-gray-400 text-sm">ระบบจะเติมเงินจำลอง (Virtual Cash) จำนวน $100,000 เข้าพอร์ตของคุณทันที</p>
            </div>
            
            {/* Step 3 */}
            <div className="bg-[#1A1D24] p-8 rounded-3xl border border-gray-800 text-center hover:border-yellow-400/50 transition-colors">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-500">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. ลงมือเทรดเลย!</h3>
              <p className="text-gray-400 text-sm">เลือกซื้อหุ้นบริษัทดังระดับโลกที่คุณชื่นชอบ แล้วดูพอร์ตของคุณเติบโตไปพร้อมๆ กัน</p>
            </div>
          </div>
        </div>
      </section>

      {/* Market Snapshot */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-yellow-400" />
                ส่องตลาดวันนี้
              </h2>
              <p className="text-gray-400 text-sm">หุ้นยอดฮิตที่นักลงทุนให้ความสนใจ ดูง่ายๆ ด้วยสีเขียวและแดง</p>
            </div>
            <Link href="/login" className="text-sm text-yellow-400 hover:text-yellow-300 hidden sm:block">ดูตลาดทั้งหมด &rarr;</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketSnapshot.map((stock, idx) => (
              <div 
                key={idx}
                className="bg-[#1A1D24] p-5 rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer group"
                onMouseEnter={() => setHoveredStock(idx)}
                onMouseLeave={() => setHoveredStock(null)}
                onClick={() => window.location.href = `/trade?symbol=${stock.symbol}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-300">
                      {stock.symbol[0]}
                    </div>
                    <div>
                      <div className="font-bold">{stock.symbol}</div>
                      <div className="text-xs text-gray-500 truncate w-16 sm:w-24">{stock.name}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-mono mb-1">${stock.price}</div>
                  <div className={`text-sm font-medium ${stock.isUp ? 'text-green-500' : 'text-red-500'}`}>
                    {stock.change}
                  </div>
                </div>
                
                <div className={`mt-4 pt-4 border-t border-gray-800 overflow-hidden transition-all duration-300 ${hoveredStock === idx ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0 pt-0 border-transparent'}`}>
                  <button className="w-full bg-gray-700 hover:bg-yellow-400 hover:text-black text-white text-xs py-2 rounded-lg font-bold transition-colors">
                    จำลองการซื้อ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locked Feature Teaser: Trader Identity */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-[#1E232B] to-[#12141A] rounded-3xl border border-yellow-500/20 overflow-hidden relative">
            
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <div className="text-9xl font-black">?</div>
            </div>

            <div className="p-8 md:p-12 md:w-2/3 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold text-yellow-400 mb-6">
                <Lock className="w-3 h-3" />
                ฟีเจอร์พิเศษสำหรับสมาชิก
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">คุณคือนักเทรดสไตล์ไหน?</h2>
              <p className="text-gray-400 mb-8 max-w-md text-sm md:text-base">
                Day Trader สายซิ่ง? หรือ Value Investor สายถือยาว? 
                สมัครสมาชิกวันนี้เพื่อทำแบบทดสอบ <strong>Trader Identity</strong> และรับลิสต์หุ้นแนะนำที่คัดสรรมาให้ตรงกับสไตล์การลงทุนของคุณโดยเฉพาะ
              </p>
              <Link href="/register" className="inline-block bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg">
                ปลดล็อคฟีเจอร์นี้ ฟรี!
              </Link>
            </div>

            <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-12 w-80">
              <div className="bg-[#111315] p-6 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden">
                <div className="filter blur-md opacity-50 select-none">
                  <div className="text-xs text-gray-500 mb-1">TRADER IDENTITY</div>
                  <div className="text-2xl font-bold text-white mb-4">Day Trader</div>
                  <div className="text-xs text-gray-400 mb-6">หุ้นที่มีวอลุ่มและจับจังหวะสวิงในกลุ่มกระแส</div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-800 h-12 rounded"></div>
                    <div className="flex-1 bg-gray-800 h-12 rounded"></div>
                  </div>
                </div>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <div className="bg-gray-900 p-4 rounded-full mb-3 border border-gray-700">
                    <Lock className="w-6 h-6 text-yellow-400" />
                  </div>
                  <span className="text-sm font-bold text-white">Log in to view</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0E1015] py-8 text-center text-sm text-gray-600">
        <p>© 2024 SimTrade. แพลตฟอร์มนี้เป็นเพียงระบบจำลองการลงทุน ไม่มีการใช้เงินจริงแต่อย่างใด</p>
      </footer>

    </div>
  );
}
