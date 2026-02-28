import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, Settings, LeaveRequest } from '../types';
import { MapPin, Clock, Calendar, LogOut, User as UserIcon, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime, calculateDistance } from '../utils';

interface EmployeeDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function EmployeeDashboard({ user, onLogout }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'profile'>('attendance');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [error, setError] = useState('');

  // Leave Form State
  const [leaveType, setLeaveType] = useState<'Paid' | 'Casual' | 'Sick'>('Paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    fetchAttendance();
    fetchSettings();
    fetchLeaves();
    // Try to capture location on mount to show "Captured" status
    const initLocation = async () => {
      try {
        const pos = await getPosition();
        setLocation(pos);
      } catch (err: any) {
        console.warn('Initial location capture failed:', err);
        // If permission is denied on mount, we don't show an error yet
        // We'll show it when they try to punch
      }
    };
    initLocation();
  }, []);

  const fetchAttendance = async () => {
    const res = await fetch(`/api/attendance/${user.id}`);
    const data = await res.json();
    setAttendance(data);
  };

  const fetchLeaves = async () => {
    const res = await fetch('/api/leaves');
    const data = await res.json();
    // Filter leaves for this user
    setLeaves(data.filter((l: any) => l.user_id === user.id));
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, type: leaveType, startDate, endDate, reason }),
      });
      if (res.ok) {
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
        alert('Leave request submitted successfully');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setSettings(data);
  };

  const getPosition = () => {
    return new Promise<{ lat: number, lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handlePunch = async (type: 'in' | 'out') => {
    setLoading(true);
    setError('');
    try {
      const pos = await getPosition();
      setLocation(pos);

      if (settings?.office_lat && settings?.office_lng) {
        const dist = calculateDistance(pos.lat, pos.lng, settings.office_lat, settings.office_lng);
        if (dist > settings.office_radius_meters) {
          setError(`You are outside the office radius (${Math.round(dist)}m away)`);
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/attendance/punch-${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, lat: pos.lat, lng: pos.lng }),
      });

      if (res.ok) {
        fetchAttendance();
      } else {
        const data = await res.json();
        setError(data.message || 'Punch failed');
      }
    } catch (err: any) {
      console.error('Location error:', err);
      if (err.code === 1) {
        setError('Location permission denied. Please click the lock icon in your browser address bar and allow location for this site.');
      } else if (err.code === 2) {
        setError('Location unavailable. Please check your GPS signal or try moving to an open area.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Please enable location and grant permission to mark attendance.');
      }
    } finally {
      setLoading(false);
    }
  };

  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayRecord = attendance.find(r => r.date === todayDate);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-indigo-600 p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-2">
              <UserIcon size={24} />
            </div>
            <div>
              <h1 className="font-bold">{user.name}</h1>
              <p className="text-xs opacity-80">Employee Dashboard</p>
            </div>
          </div>
          <button onClick={onLogout} className="rounded-full bg-white/10 p-2 hover:bg-white/20">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Punch Card */}
              <section className="rounded-3xl bg-white p-6 shadow-sm border border-neutral-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold">Attendance</h2>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100 space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                    <button 
                      onClick={() => handlePunch(todayRecord?.punch_in_time ? 'out' : 'in')}
                      className="text-xs font-bold underline hover:text-red-800"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wider">Punch In</p>
                    <p className="text-xl font-bold text-indigo-600">{formatTime(todayRecord?.punch_in_time)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-500 uppercase font-semibold tracking-wider">Punch Out</p>
                    <p className="text-xl font-bold text-emerald-600">{formatTime(todayRecord?.punch_out_time)}</p>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  {!todayRecord?.punch_in_time ? (
                    <button
                      onClick={() => handlePunch('in')}
                      disabled={loading}
                      className="flex-1 rounded-2xl bg-indigo-600 p-4 font-bold text-white shadow-lg shadow-indigo-100 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Punch In'}
                    </button>
                  ) : !todayRecord?.punch_out_time ? (
                    <button
                      onClick={() => handlePunch('out')}
                      disabled={loading}
                      className="flex-1 rounded-2xl bg-emerald-600 p-4 font-bold text-white shadow-lg shadow-emerald-100 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Punch Out'}
                    </button>
                  ) : (
                    <div className="flex-1 rounded-2xl bg-neutral-100 p-4 text-center font-bold text-neutral-500 flex items-center justify-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-500" />
                      Shift Completed
                    </div>
                  )}
                </div>
              </section>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white p-4 shadow-sm border border-neutral-100">
                  <div className="flex items-center gap-2 text-neutral-500 mb-2">
                    <Clock size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Working Hrs</span>
                  </div>
                  <p className="text-2xl font-bold">{todayRecord?.total_hours || '0.00'}</p>
                </div>
                <div className="rounded-3xl bg-white p-4 shadow-sm border border-neutral-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-neutral-500">
                      <MapPin size={16} />
                      <span className="text-xs font-semibold uppercase tracking-wider">Location</span>
                    </div>
                    <button 
                      onClick={() => {
                        setLoading(true);
                        getPosition()
                          .then(pos => {
                            setLocation(pos);
                            setError('');
                          })
                          .catch(err => {
                            console.error(err);
                            setError('Failed to capture location. Please check permissions.');
                          })
                          .finally(() => setLoading(false));
                      }}
                      className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-full transition-colors"
                      title="Refresh Location"
                    >
                      <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Clock size={14} className="rotate-180" />
                      </motion.div>
                    </button>
                  </div>
                  <p className="text-sm font-bold text-neutral-800">{location ? 'Captured' : 'Not Captured'}</p>
                  {location && (
                    <p className="text-[10px] text-neutral-400 mt-1 truncate">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>

              {/* Recent History */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Recent History</h2>
                  <button className="text-sm font-medium text-indigo-600">View All</button>
                </div>
                <div className="space-y-3">
                  {attendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-neutral-100">
                      <div>
                        <p className="font-bold">{new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                        <p className="text-xs text-neutral-500">{record.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{record.punch_in_time} - {record.punch_out_time || '--:--'}</p>
                        <p className="text-xs text-neutral-400">{record.total_hours || '0'} hrs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'leaves' && (
            <motion.div
              key="leaves"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Leave Balances */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-neutral-100 text-center">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Paid</p>
                  <p className="text-lg font-bold text-indigo-600">{user.paid_leaves ?? 12}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-neutral-100 text-center">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Sick</p>
                  <p className="text-lg font-bold text-rose-600">{user.sick_leaves ?? 6}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-neutral-100 text-center">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Casual</p>
                  <p className="text-lg font-bold text-amber-600">{user.casual_leaves ?? 6}</p>
                </div>
              </div>

              <section className="rounded-3xl bg-white p-6 shadow-sm border border-neutral-100">
                <h2 className="text-lg font-bold mb-4">Request Leave</h2>
                <form onSubmit={handleLeaveRequest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase">Start Date</label>
                      <input 
                        type="date" 
                        required 
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-indigo-600 focus:outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase">End Date</label>
                      <input 
                        type="date" 
                        required 
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-indigo-600 focus:outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Leave Type</label>
                    <select 
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value as any)}
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="Paid">Paid Leave</option>
                      <option value="Casual">Casual Leave</option>
                      <option value="Sick">Sick Leave</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase">Reason</label>
                    <textarea 
                      required 
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Reason for leave..."
                      className="w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-indigo-600 focus:outline-none h-24"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-indigo-600 p-4 font-bold text-white shadow-lg shadow-indigo-100 disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-bold">My Leave Requests</h2>
                <div className="space-y-3">
                  {leaves.length === 0 ? (
                    <p className="text-center py-8 text-neutral-400 text-sm">No leave requests yet</p>
                  ) : (
                    leaves.map((leave) => (
                      <div key={leave.id} className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{leave.type} Leave</p>
                          <p className="text-xs text-neutral-500">{leave.start_date} to {leave.end_date}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                          leave.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {leave.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <section className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 text-center">
                <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-4xl font-black">
                  {user.name[0]}
                </div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-neutral-500">Employee ID: {user.employee_id || 'N/A'}</p>
                
                <div className="mt-8 grid grid-cols-1 gap-4 text-left">
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Mobile Number</p>
                    <p className="font-bold text-neutral-800">+91 {user.mobile}</p>
                  </div>
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Role</p>
                    <p className="font-bold text-neutral-800 capitalize">{user.role}</p>
                  </div>
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Joined Date</p>
                    <p className="font-bold text-neutral-800">{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <button 
                  onClick={onLogout}
                  className="mt-8 w-full rounded-2xl border border-rose-200 p-4 font-bold text-rose-600 hover:bg-rose-50"
                >
                  Logout from Device
                </button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav (Mobile Feel) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white p-4 flex justify-around items-center z-20">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'attendance' ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <Clock size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Attendance</span>
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'leaves' ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <Calendar size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Leaves</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <UserIcon size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
        </button>
      </nav>
    </div>
  );
}
