'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';

const QUESTIONS = [
    {
        id: 'experience',
        title: 'What is your trading experience?',
        options: [
            { value: 'beginner', label: 'Beginner', desc: 'I am new to trading and investing.' },
            { value: 'intermediate', label: 'Intermediate', desc: 'I have some experience with basic concepts.' },
            { value: 'advanced', label: 'Advanced', desc: 'I trade regularly and use advanced tools.' },
        ],
    },
    {
        id: 'goal',
        title: 'What is your primary goal?',
        options: [
            { value: 'learning', label: 'Learning', desc: 'I want to understand how markets work safely.' },
            { value: 'growth', label: 'Long-term Growth', desc: 'I want to build a simulated portfolio over time.' },
            { value: 'daytrading', label: 'Day Trading', desc: 'I want to practice fast-paced, frequent trades.' },
        ],
    },
    {
        id: 'assets',
        title: 'Which assets interest you most?',
        options: [
            { value: 'stocks', label: 'US Stocks', desc: 'AAPL, TSLA, MSFT, and other major companies.' },
            { value: 'crypto', label: 'Cryptocurrencies', desc: 'Bitcoin, Ethereum, and altcoins.' },
            { value: 'both', label: 'A bit of everything', desc: 'I want to explore multiple asset classes.' },
        ],
    }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSelectOption = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            submitData();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const submitData = async () => {
        setIsSubmitting(true);
        // Simulate API call to save user preferences
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Save flag to local storage denoting onboarding is complete
        localStorage.setItem('simtrade_onboarded', 'true');

        // Redirect to Login page so they can actually sign in
        router.push('/login?registered=true');
    };

    const currentQuestion = QUESTIONS[currentStep];
    const canProceed = !!answers[currentQuestion.id];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">

            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Let's personalize your experience
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Step {currentStep + 1} of {QUESTIONS.length}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4 max-w-xs mx-auto overflow-hidden">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100 min-h-[400px] flex flex-col transition-all duration-300">

                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center animate-in fade-in slide-in-from-bottom-2">
                            {currentQuestion.title}
                        </h3>

                        <div className="space-y-4">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion.id] === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelectOption(currentQuestion.id, option.value)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 group
                                            ${isSelected
                                                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                                : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                                {option.label}
                                            </h4>
                                            <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700/80' : 'text-gray-500'}`}>
                                                {option.desc}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0 || isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-opacity"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!canProceed || isSubmitting}
                            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                            {isSubmitting ? 'Saving...' : currentStep === QUESTIONS.length - 1 ? 'Finish Setup' : 'Continue'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
