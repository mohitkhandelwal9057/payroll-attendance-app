import { useState, useEffect } from 'react';
import { LeaveRequest } from '../types';
import { CheckCircle2, XCircle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LeavesView() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    const res = await fetch('/api/leaves');
    const data = await res.json();
    setLeaves(data);
  };

  const handleStatusUpdate = async (id: number, status: 'Approved' | 'Rejected') => {
    setLoading(true);
    try {
      await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchLeaves();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Leave Management</h3>
          <p className="text-neutral-500">Review and manage employee leave requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center border border-neutral-100">
            <div className="mb-4 rounded-full bg-neutral-50 p-6 text-neutral-300">
              <Calendar size={48} />
            </div>
            <p className="font-bold text-neutral-500">No leave requests found</p>
          </div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="rounded-3xl bg-white p-6 shadow-sm border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {leave.employee_name?.[0]}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{leave.employee_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      leave.type === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 
                      leave.type === 'Sick' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {leave.type} Leave
                    </span>
                    <span>•</span>
                    <Clock size={14} />
                    {leave.start_date} to {leave.end_date}
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md">
                <p className="text-sm text-neutral-600 italic">"{leave.reason}"</p>
              </div>

              <div className="flex items-center gap-3">
                {leave.status === 'Pending' ? (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      Approve
                    </button>
                  </>
                ) : (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                    leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {leave.status === 'Approved' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {leave.status}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
