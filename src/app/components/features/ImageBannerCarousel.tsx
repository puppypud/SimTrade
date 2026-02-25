"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BANNERS = [
    {
        id: 1,
        imageUrl: "https://images.unsplash.com/photo-1642543492481-44e81e39148c?q=80&w=2070&auto=format&fit=crop", // Stock Graph
        title: "Trade with Confidence",
        description: "Zero commission on US stocks and ETFs."
    },
    {
        id: 2,
        imageUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop", // Money/Growth
        title: "Master the Markets",
        description: "Learn, practice, and build your simulated portfolio."
    },
    {
        id: 3,
        imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb414f52e?q=80&w=2070&auto=format&fit=crop", // Analytics/Charts
        title: "Advanced Analytics",
        description: "Unlock powerful charting tools from TradingView."
    },
    {
        id: 4,
        imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2070&auto=format&fit=crop", // Global Economy
        title: "Global Market Access",
        description: "Invest in top global companies from anywhere."
    },
    {
        id: 5,
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop", // Business Strategy
        title: "Build Your Portfolio",
        description: "Diversify your investments with SimTrade today."
    },
];

export default function ImageBannerCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-advance logic
    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % BANNERS.length);
        }, 5000);

        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, []);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? BANNERS.length - 1 : prevIndex - 1
        );
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % BANNERS.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div className="relative w-full h-[140px] md:h-[180px] rounded-2xl overflow-hidden shadow-sm border border-gray-200 group bg-gray-900">

            {/* Images Container */}
            <div
                className="flex h-full w-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {BANNERS.map((banner) => (
                    <div
                        key={banner.id}
                        className="flex-shrink-0 w-full h-full relative"
                    >
                        {/* Background Image */}
                        <img
                            src={banner.imageUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                        />

                        {/* Overlay Gradient for Text Readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/50 to-transparent"></div>

                        {/* Banner Text Content */}
                        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                                {banner.title}
                            </h2>
                            <p className="text-sm md:text-base text-gray-300 max-w-md font-medium">
                                {banner.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Arrows (Hidden by default, shown on hover relative to the group) */}
            <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {BANNERS.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`transition-all duration-300 rounded-full ${currentIndex === index
                            ? "w-6 h-2 bg-blue-500"
                            : "w-2 h-2 bg-white/50 hover:bg-white/80"
                            }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
