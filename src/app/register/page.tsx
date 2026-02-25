'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, User, Phone, MapPin, Calendar, CreditCard, ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        streetAddressLine1: '',
        streetAddressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        dateOfBirth: '',
        taxId: '',
        taxIdType: 'USA_SSN',
        countryOfCitizenship: 'USA',
        countryOfBirth: 'USA',
        countryOfTaxResidence: 'USA',
        isControlPerson: false,
        isAffiliatedExchangeOrFinra: false,
        isPoliticallyExposed: false,
        immediateFamilyExposed: false
    });
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

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setIsLoading(false);
            return;
        }

        const payload = {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phoneNumber: formData.phoneNumber,
            streetAddress: [formData.streetAddressLine1, formData.streetAddressLine2].filter(Boolean),
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            dateOfBirth: formData.dateOfBirth,
            taxId: formData.taxId,
            taxIdType: formData.taxIdType,
            countryOfCitizenship: formData.countryOfCitizenship,
            countryOfBirth: formData.countryOfBirth,
            countryOfTaxResidence: formData.countryOfTaxResidence,
            isControlPerson: formData.isControlPerson,
            isAffiliatedExchangeOrFinra: formData.isAffiliatedExchangeOrFinra,
            isPoliticallyExposed: formData.isPoliticallyExposed,
            immediateFamilyExposed: formData.immediateFamilyExposed
        };

        console.log('Register payload:', payload);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        router.push('/onboarding');
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
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted mb-1">Date of Birth</label>
                                    <input name="dateOfBirth" type="date" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.dateOfBirth} onChange={handleChange} />
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

                        <hr className="border-theme-border my-6" />

                        {/* Section 3: Address */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-gold" /> Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted mb-1">Street Address Line 1</label>
                                    <input name="streetAddressLine1" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.streetAddressLine1} onChange={handleChange} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted mb-1">Street Address Line 2 (Apt, Suite, etc.)</label>
                                    <input name="streetAddressLine2" type="text" className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.streetAddressLine2} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">City</label>
                                    <input name="city" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.city} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">State</label>
                                    <input name="state" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.state} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Postal Code</label>
                                    <input name="postalCode" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.postalCode} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <hr className="border-theme-border my-6" />

                        {/* Section 4: Tax & Citizenship */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-gold" /> Tax & Identity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Tax ID Type</label>
                                    <select name="taxIdType" className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.taxIdType} onChange={handleChange}>
                                        <option value="USA_SSN">USA SSN</option>
                                        <option value="USA_ITIN">USA ITIN</option>
                                        <option value="FOREIGN_TAX_ID">Foreign Tax ID</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Tax ID</label>
                                    <input name="taxId" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" placeholder="XXX-XX-XXXX" value={formData.taxId} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Country of Citizenship</label>
                                    <input name="countryOfCitizenship" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.countryOfCitizenship} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Country of Birth</label>
                                    <input name="countryOfBirth" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.countryOfBirth} onChange={handleChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted mb-1">Country of Tax Residence</label>
                                    <input name="countryOfTaxResidence" type="text" required className="w-full p-3 border border-theme-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-gold" value={formData.countryOfTaxResidence} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <hr className="border-theme-border my-6" />

                        {/* Section 5: Regulatory Questions (Boolean) */}
                        <div>
                            <h3 className="text-lg font-medium leading-6 mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-gold" /> Regulatory Information</h3>
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input type="checkbox" name="isControlPerson" className="w-4 h-4 text-gold border-theme-border rounded focus:ring-gold bg-background" checked={formData.isControlPerson} onChange={handleChange} />
                                    </div>
                                    <span className="text-sm text-foreground">Are you a control person or affiliate of a public company?</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input type="checkbox" name="isAffiliatedExchangeOrFinra" className="w-4 h-4 text-gold border-theme-border rounded focus:ring-gold bg-background" checked={formData.isAffiliatedExchangeOrFinra} onChange={handleChange} />
                                    </div>
                                    <span className="text-sm text-foreground">Are you affiliated with an exchange or FINRA?</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input type="checkbox" name="isPoliticallyExposed" className="w-4 h-4 text-gold border-theme-border rounded focus:ring-gold bg-background" checked={formData.isPoliticallyExposed} onChange={handleChange} />
                                    </div>
                                    <span className="text-sm text-foreground">Are you a politically exposed person?</span>
                                </label>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input type="checkbox" name="immediateFamilyExposed" className="w-4 h-4 text-gold border-theme-border rounded focus:ring-gold bg-background" checked={formData.immediateFamilyExposed} onChange={handleChange} />
                                    </div>
                                    <span className="text-sm text-foreground">Is your immediate family a politically exposed person?</span>
                                </label>
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
