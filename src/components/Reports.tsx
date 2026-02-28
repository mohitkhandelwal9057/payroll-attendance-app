import { useState } from 'react';
import { AttendanceRecord } from '../types';
import { Download, FileSpreadsheet, FileText, Calendar, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportsProps {
  attendance: AttendanceRecord[];
}

export default function ReportsView({ attendance }: ReportsProps) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    doc.autoTable({
      startY: 20,
      head: [['Employee', 'Date', 'In', 'Out', 'Status', 'Hours']],
      body: attendance.map(a => [
        a.name, 
        a.date, 
        a.punch_in_time, 
        a.punch_out_time || '-', 
        a.status, 
        a.total_hours || '0'
      ]),
    });
    doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Reports & Analytics</h3>
          <p className="text-neutral-500">Generate and download detailed attendance reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Filters */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 space-y-6">
          <div className="flex items-center gap-3 text-indigo-600">
            <Filter size={24} />
            <h4 className="font-bold">Filter Data</h4>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-neutral-400">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-medium focus:border-indigo-600 focus:outline-none"
              />
            </div>
            <button className="w-full rounded-xl bg-neutral-100 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-200">
              Apply Filters
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-neutral-100 space-y-6 lg:col-span-2">
          <div className="flex items-center gap-3 text-emerald-600">
            <Download size={24} />
            <h4 className="font-bold">Export Options</h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              onClick={exportToExcel}
              className="flex items-center justify-between rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-6 text-left transition-all hover:border-emerald-600 group"
            >
              <div className="space-y-1">
                <p className="font-bold text-emerald-900">Excel Report</p>
                <p className="text-xs text-emerald-600">Detailed .xlsx format</p>
              </div>
              <FileSpreadsheet size={32} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center justify-between rounded-2xl border-2 border-rose-100 bg-rose-50 p-6 text-left transition-all hover:border-rose-600 group"
            >
              <div className="space-y-1">
                <p className="font-bold text-rose-900">PDF Report</p>
                <p className="text-xs text-rose-600">Printable .pdf format</p>
              </div>
              <FileText size={32} className="text-rose-600 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="mt-8 rounded-2xl bg-neutral-50 p-6 border border-dashed border-neutral-200">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
                <Calendar size={24} />
              </div>
              <div>
                <p className="font-bold">Monthly Summary</p>
                <p className="text-sm text-neutral-500">Generate a summary report for the current month</p>
              </div>
              <button className="ml-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
