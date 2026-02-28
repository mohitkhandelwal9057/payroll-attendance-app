import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, Settings, LeaveRequest } from '../types';
import { 
  Users, Clock, Settings as SettingsIcon, FileText, LogOut, 
  Menu, X, ChevronRight, MapPin, Calendar, Download,
  CheckCircle2, AlertCircle, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SettingsView from './Settings';
import ReportsView from './Reports';
import LeavesView from './Leaves';

interface EmployerDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function EmployerDashboard({ user, onLogout }: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'leaves' | 'reports' | 'settings'>('overview');
  const [employees, setEmployees] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);

  // Form states
  const [empForm, setEmpForm] = useState({ name: '', mobile: '', employee_id: '', paid: 12, sick: 6, casual: 6 });
  const [attForm, setAttForm] = useState({ punch_in: '', punch_out: '', status: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [empRes, attRes, setRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/reports/attendance'),
      fetch('/api/settings')
    ]);
    setEmployees(await empRes.json());
    setAttendance(await attRes.json());
    setSettings(await setRes.json());
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: empForm.name,
        mobile: empForm.mobile,
        employee_id: empForm.employee_id,
        paid_leaves: empForm.paid,
        sick_leaves: empForm.sick,
        casual_leaves: empForm.casual
      }),
    });
    if (res.ok) {
      setIsAddModalOpen(false);
      setEmpForm({ name: '', mobile: '', employee_id: '', paid: 12, sick: 6, casual: 6 });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.message || 'Failed to add employee');
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: empForm.name,
        mobile: empForm.mobile,
        employee_id: empForm.employee_id,
        paid_leaves: empForm.paid,
        sick_leaves: empForm.sick,
        casual_leaves: empForm.casual
      }),
    });
    if (res.ok) {
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      fetchData();
    }
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    const res = await fetch(`/api/attendance/record/${editingAttendance.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        punch_in_time: attForm.punch_in,
        punch_out_time: attForm.punch_out,
        status: attForm.status
      }),
    });
    if (res.ok) {
      setEditingAttendance(null);
      fetchData();
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'leaves', label: 'Leave Requests', icon: FileText },
    { id: 'reports', label: 'Reports', icon: Download },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-6">
            <h1 className="text-2xl font-black tracking-tighter text-indigo-600">PayWorks</h1>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between bg-white px-8 py-4 shadow-sm border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-bold">{user.name}</span>
              <span className="text-xs text-neutral-500">Employer</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user.name[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Total Employees', value: employees.length, icon: Users, color: 'indigo' },
                    { label: 'Present Today', value: attendance.filter(a => a.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })).length, icon: CheckCircle2, color: 'emerald' },
                    { label: 'Late Marks', value: attendance.filter(a => a.status === 'Late').length, icon: AlertCircle, color: 'amber' },
                    { label: 'Pending Leaves', value: 0, icon: FileText, color: 'rose' },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-3xl bg-white p-6 shadow-sm border border-neutral-100">
                      <div className={`mb-4 inline-flex rounded-2xl bg-${stat.color}-100 p-3 text-${stat.color}-600`}>
                        <stat.icon size={24} />
                      </div>
                      <p className="text-sm font-medium text-neutral-500">{stat.label}</p>
                      <p className="text-3xl font-black">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Attendance */}
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-xl font-bold">Recent Attendance</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search employee..." 
                        className="rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-4 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-400">
                          <th className="pb-4">Employee</th>
                          <th className="pb-4">Date</th>
                          <th className="pb-4">Punch In</th>
                          <th className="pb-4">Punch Out</th>
                          <th className="pb-4">Status</th>
                          <th className="pb-4">Location</th>
                          <th className="pb-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {attendance.slice(0, 10).map((record) => (
                          <tr key={record.id} className="group hover:bg-neutral-50 transition-colors">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-xs">
                                  {record.name?.[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{record.name}</p>
                                  <p className="text-xs text-neutral-500">{record.mobile}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-sm font-medium">{record.date}</td>
                            <td className="py-4 text-sm font-bold text-indigo-600">{record.punch_in_time}</td>
                            <td className="py-4 text-sm font-bold text-emerald-600">{record.punch_out_time || '--:--'}</td>
                            <td className="py-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="py-4">
                              <button 
                                onClick={() => {
                                  if (record.punch_in_lat && record.punch_in_lng) {
                                    window.open(`https://www.google.com/maps?q=${record.punch_in_lat},${record.punch_in_lng}`, '_blank');
                                  }
                                }}
                                className={`text-neutral-400 hover:text-indigo-600 transition-colors ${!(record.punch_in_lat && record.punch_in_lng) ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={record.punch_in_lat ? 'View on Maps' : 'Location not available'}
                              >
                                <MapPin size={18} />
                              </button>
                            </td>
                            <td className="py-4">
                              <button 
                                onClick={() => {
                                  setEditingAttendance(record);
                                  setAttForm({ 
                                    punch_in: record.punch_in_time || '', 
                                    punch_out: record.punch_out_time || '', 
                                    status: record.status 
                                  });
                                }}
                                className="text-indigo-600 hover:underline text-xs font-bold"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'employees' && (
              <motion.div key="employees" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Employee Directory</h3>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                  >
                    Add Employee
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {employees.map((emp) => (
                    <div key={emp.id} className="rounded-3xl bg-white p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                          {emp.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold">{emp.name}</h4>
                          <p className="text-xs text-neutral-500">ID: {emp.employee_id || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Mobile</span>
                          <span className="font-medium">{emp.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Joined</span>
                          <span className="font-medium">{new Date(emp.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEmpForm({
                            name: emp.name,
                            mobile: emp.mobile,
                            employee_id: emp.employee_id || '',
                            paid: emp.paid_leaves || 12,
                            sick: emp.sick_leaves || 6,
                            casual: emp.casual_leaves || 6
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="mt-6 w-full rounded-xl border border-neutral-200 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'leaves' && <LeavesView />}
            {activeTab === 'reports' && <ReportsView attendance={attendance} />}
            {activeTab === 'settings' && <SettingsView initialSettings={settings} />}
          </AnimatePresence>
        </main>

        {/* Add Employee Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Add Employee</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={empForm.mobile}
                      onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Employee ID</label>
                    <input
                      type="text"
                      value={empForm.employee_id}
                      onChange={(e) => setEmpForm({ ...empForm, employee_id: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Paid Leave</label>
                      <input
                        type="number"
                        value={empForm.paid}
                        onChange={(e) => setEmpForm({ ...empForm, paid: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Sick Leave</label>
                      <input
                        type="number"
                        value={empForm.sick}
                        onChange={(e) => setEmpForm({ ...empForm, sick: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Casual Leave</label>
                      <input
                        type="number"
                        value={empForm.casual}
                        onChange={(e) => setEmpForm({ ...empForm, casual: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-700">
                    Create Employee
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Employee Modal */}
        <AnimatePresence>
          {isEditModalOpen && selectedEmployee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Edit Profile</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleUpdateEmployee} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      value={empForm.mobile}
                      onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Employee ID</label>
                    <input
                      type="text"
                      value={empForm.employee_id}
                      onChange={(e) => setEmpForm({ ...empForm, employee_id: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Paid Leave</label>
                      <input
                        type="number"
                        value={empForm.paid}
                        onChange={(e) => setEmpForm({ ...empForm, paid: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Sick Leave</label>
                      <input
                        type="number"
                        value={empForm.sick}
                        onChange={(e) => setEmpForm({ ...empForm, sick: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-neutral-400">Casual Leave</label>
                      <input
                        type="number"
                        value={empForm.casual}
                        onChange={(e) => setEmpForm({ ...empForm, casual: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-neutral-200 p-2 text-sm focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-700">
                    Update Profile
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Attendance Modal */}
        <AnimatePresence>
          {editingAttendance && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Edit Attendance</h3>
                  <button onClick={() => setEditingAttendance(null)} className="text-neutral-400 hover:text-neutral-600">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleUpdateAttendance} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Punch In Time (HH:MM)</label>
                    <input
                      type="text"
                      required
                      value={attForm.punch_in}
                      onChange={(e) => setAttForm({ ...attForm, punch_in: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Punch Out Time (HH:MM)</label>
                    <input
                      type="text"
                      value={attForm.punch_out}
                      onChange={(e) => setAttForm({ ...attForm, punch_out: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400">Status</label>
                    <select
                      value={attForm.status}
                      onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-200 p-3 focus:border-indigo-600 focus:outline-none"
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-indigo-600 py-4 font-bold text-white hover:bg-indigo-700">
                    Update Record
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
