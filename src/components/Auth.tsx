import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Smartphone, User as UserIcon, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [step, setStep] = useState<'role' | 'mode' | 'details' | 'otp'>('role');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<Role>('employee');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [employerExists, setEmployerExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch('https://adsar-payroll.onrender.com/api/auth/employer-exists')
      .then(res => res.json())
      .then(data => setEmployerExists(data.exists));
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // If logging in, we might want to check if user exists first
      // but for now we follow the user's requested flow: Mobile -> OTP
      const res = await fetch('https://adsar-payroll.onrender.com/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, authMode, role }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(data.message || 'OTP sent successfully');
          setStep('otp');
        } else {
          setError(data.message || 'Failed to send OTP');
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError(`Server error: ${res.status}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Network error: Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://adsar-payroll.onrender.com/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mobile, 
          otp, 
          name, 
          role,
          authMode
        }),
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data.success) {
          onLogin(data.user);
        } else {
          setError(data.message || 'Invalid OTP');
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError(`Server error: ${res.status}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError('Network error: Could not reach server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-neutral-200">
      <div className="bg-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold tracking-tight">PayWorks</h1>
        <p className="mt-2 text-indigo-100 opacity-80">Payroll & Attendance Simplified</p>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}
        {successMessage && !error && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100">
            {successMessage}
          </div>
        )}

        {step === 'role' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Choose your role</h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { 
                  setRole('employer'); 
                  if (employerExists) {
                    setAuthMode('login');
                    setStep('details');
                  } else {
                    setAuthMode('register');
                    setStep('details');
                  }
                }}
                className="flex items-center gap-4 rounded-2xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50 group"
              >
                <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <UserIcon size={24} />
                </div>
                <div>
                  <div className="font-bold">I am an Employer</div>
                  <div className="text-sm text-neutral-500">
                    {employerExists ? 'Login to manage staff' : 'Register and manage staff'}
                  </div>
                </div>
              </button>
              <button
                onClick={() => { setRole('employee'); setStep('mode'); }}
                className="flex items-center gap-4 rounded-2xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50 group"
              >
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Smartphone size={24} />
                </div>
                <div>
                  <div className="font-bold">I am an Employee</div>
                  <div className="text-sm text-neutral-500">Mark attendance and view salary</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'mode' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Login or Register</h2>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => { setAuthMode('login'); setStep('details'); }}
                className="flex items-center gap-4 rounded-2xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50 group"
              >
                <div className="rounded-xl bg-blue-100 p-3 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ArrowRight size={24} />
                </div>
                <div>
                  <div className="font-bold">Login</div>
                  <div className="text-sm text-neutral-500">Already have an account?</div>
                </div>
              </button>
              <button
                onClick={() => { setAuthMode('register'); setStep('details'); }}
                className="flex items-center gap-4 rounded-2xl border-2 border-neutral-100 p-4 text-left transition-all hover:border-indigo-600 hover:bg-indigo-50 group"
              >
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <UserIcon size={24} />
                </div>
                <div>
                  <div className="font-bold">Register</div>
                  <div className="text-sm text-neutral-500">New to PayWorks?</div>
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep('role')}
              className="w-full text-center text-sm text-neutral-500 hover:text-indigo-600"
            >
              Back
            </button>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {authMode === 'login' ? 'Login' : 'Register'}
              </h2>
            </div>
            <div className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700">Mobile Number</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">+91</span>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 pl-12 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-4 font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Get OTP'}
              <ArrowRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => setStep(role === 'employee' ? 'mode' : 'role')}
              className="w-full text-center text-sm text-neutral-500 hover:text-indigo-600"
            >
              Back
            </button>

          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <h2 className="text-xl font-semibold">Verify OTP</h2>
            <p className="text-sm text-neutral-500">We've sent a 6-digit code to +91 {mobile}</p>
            <div>
              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center text-3xl font-bold tracking-[1em] focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 p-4 font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
              <CheckCircle2 size={20} />
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
