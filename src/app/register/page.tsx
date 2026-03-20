'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, User, Phone, MapPin, Calendar, CreditCard, ShieldAlert } from 'lucide-react';
import { RegisterRequest } from '../types/broker';
import { brokerService } from '../services/brokerService';
import { useAuth } from '@/src/context/AuthContext';

interface RegisterFormState extends Omit<RegisterRequest, 'password'> {
    password?: string;
    confirmPassword?: string;
}

const INITIAL_FORM_STATE: RegisterFormState = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
};

export default function RegisterPage() {
    const router = useRouter();
    const { login } = useAuth(); // ดึง login จาก Context มาใช้ตรงๆ เพื่อ Login เลย
    const [formData, setFormData] = useState<RegisterFormState>(INITIAL_FORM_STATE);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!formData.password || formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setIsLoading(false);
            return;
        }

        const payload: RegisterRequest = {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber
        };

        console.log('Register payload:', payload);

        try {
            const data = await brokerService.registerUser(payload);
            console.log('Registration success:', data);

            // เมื่อสมัครเสร็จเราได้ UserAccount เต็มๆ มา ให้จับ Login อัตโนมัติทันที
            const completeData = data as any;
            login({
                id: completeData.id || 0,
                email: completeData.email || formData.email,
                firstName: completeData.firstName || formData.firstName,
                lastName: completeData.lastName || formData.lastName,
                alpacaAccountId: completeData.alpacaAccountId,
                name: completeData.firstName || formData.firstName, // backup
            });

            // พาเข้าตรงไปที่ Onboarding เลย แทนที่จะไปนั่งรอตรง Dashboard
            router.push('/onboarding');
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.response?.data?.message || err.response?.data || 'Failed to create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
            <div className="sm:mx-auto sm:w-full sm:max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold tracking-tight">
                        Create an account
                    </h2>
                    <p className="mt-2 text-sm text-muted">
                        Start your trading journey with <span className="text-gold font-semibold">SimTrade</span> today.
                    </p>
                </div>

                <div className="bg-surface py-8 px-4 shadow-xl shadow-black/5 sm:rounded-2xl sm:px-10 border border-theme-border">
                    <form className="space-y-6" onSubmit={handleSubmit}>

                        {/* Section 1: Basic Info */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-gold" /> Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">First Name</label>
                                    <input name="firstName" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.firstName} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Last Name</label>
                                    <input name="lastName" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.lastName} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <hr className="border-theme-border my-6" />

                        {/* Section 2: Contact Info */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-gold" /> Contact</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Email</label>
                                    <input name="email" type="email" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.email} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Phone Number</label>
                                    <input name="phoneNumber" type="tel" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" placeholder="111-222-3333" value={formData.phoneNumber} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Password</label>
                                    <input name="password" type="password" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.password} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Confirm Password</label>
                                    <input name="confirmPassword" type="password" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.confirmPassword} onChange={handleChange} />
                                </div>
                            </div>
                        </div>



                        {error && (
                            <div className="rounded-md bg-red-900/30 border border-red-500/50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-400">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-black bg-gold hover:bg-gold-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : 'Create Account'}
                                {!isLoading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                            </button>

                            {/* แสดงข้อความเพิ่มเติมระหว่างที่ปุ่ม Loading เพื่อให้ผู้ใช้ทราบว่าอาจใช้เวลานาน */}
                            {isLoading && (
                                <p className="mt-3 text-center text-sm text-gold animate-pulse">
                                    ระบบกำลังสร้างบัญชีและจัดสรรเงินทุน (อาจใช้เวลาสูงสุดถึง 30 วินาที)
                                </p>
                            )}
                        </div>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-theme-border" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-surface text-muted">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <Link href="/login" className="font-medium text-gold hover:underline transition-colors">
                                Sign in to your account
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-muted pb-12">
                    By signing up, you agree to our{' '}
                    <a href="#" className="font-medium text-foreground hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="font-medium text-foreground hover:underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
}
