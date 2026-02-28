import React, { useState } from 'react';
import { Settings } from '../types';
import { Save, Clock, MapPin, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  initialSettings: Settings | null;
}

export default function SettingsView({ initialSettings }: SettingsProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings || {
    id: 1,
    office_start_time: '09:00',
    office_end_time: '18:00',
    total_working_hours: 8.0,
    first_half_end: '13:00',
    second_half_start: '14:00',
    weekend_days: 'Sunday',
    late_mark_grace_minutes: 15,
    overtime_rate: 1.5,
    office_radius_meters: 100
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Company Settings</h3>
          <p className="text-neutral-500">Configure office timings and payroll rules</p>
        </div>
        {success && (
          <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600 border border-emerald-100">
            Settings saved successfully!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Office Timings */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 space-y-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <Clock size={24} />
            <h4 className="font-bold">Office Timings</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Start Time</label>
              <input
                type="time"
                name="office_start_time"
                value={settings.office_start_time}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">End Time</label>
              <input
                type="time"
                name="office_end_time"
                value={settings.office_end_time}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-neutral-400">Weekend Days</label>
            <select
              name="weekend_days"
              value={settings.weekend_days}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
            >
              <option>Saturday, Sunday</option>
              <option>Sunday</option>
              <option>None</option>
            </select>
          </div>
        </div>

        {/* Geo-fencing */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 space-y-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <MapPin size={24} />
            <h4 className="font-bold">Geo-fencing</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Latitude</label>
              <input
                type="number"
                step="any"
                name="office_lat"
                value={settings.office_lat || ''}
                onChange={handleChange}
                placeholder="e.g. 28.6139"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Longitude</label>
              <input
                type="number"
                step="any"
                name="office_lng"
                value={settings.office_lng || ''}
                onChange={handleChange}
                placeholder="e.g. 77.2090"
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-neutral-400">Radius (Meters)</label>
            <input
              type="number"
              name="office_radius_meters"
              value={settings.office_radius_meters}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Payroll Rules */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 space-y-6 md:col-span-2">
          <div className="flex items-center gap-3 text-amber-600">
            <Calendar size={24} />
            <h4 className="font-bold">Payroll & Attendance Rules</h4>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Late Grace (Mins)</label>
              <input
                type="number"
                name="late_mark_grace_minutes"
                value={settings.late_mark_grace_minutes}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Overtime Multiplier</label>
              <input
                type="number"
                step="0.1"
                name="overtime_rate"
                value={settings.overtime_rate}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Min Working Hrs</label>
              <input
                type="number"
                step="0.5"
                name="total_working_hours"
                value={settings.total_working_hours}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 p-4 font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
