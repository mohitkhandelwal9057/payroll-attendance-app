export type Role = 'employer' | 'employee' | 'admin';

export interface User {
  id: number;
  name: string;
  mobile: string;
  role: Role;
  employee_id?: string;
  paid_leaves?: number;
  sick_leaves?: number;
  casual_leaves?: number;
  created_at: string;
}

export interface Settings {
  id: number;
  office_start_time: string;
  office_end_time: string;
  total_working_hours: number;
  first_half_end: string;
  second_half_start: string;
  weekend_days: string;
  late_mark_grace_minutes: number;
  overtime_rate: number;
  office_lat?: number;
  office_lng?: number;
  office_radius_meters: number;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  date: string;
  punch_in_time?: string;
  punch_in_lat?: number;
  punch_in_lng?: number;
  punch_out_time?: string;
  punch_out_lat?: number;
  punch_out_lng?: number;
  total_hours?: number;
  status: string;
  name?: string;
  mobile?: string;
  employee_id?: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  type: 'Paid' | 'Casual' | 'Sick';
  start_date: string;
  end_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  employee_name?: string;
}
