import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "payroll.db"));

  // Initialize Database Schema
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        role TEXT CHECK(role IN ('employer', 'employee', 'admin')) NOT NULL,
        employee_id TEXT,
        paid_leaves REAL DEFAULT 12.0,
        sick_leaves REAL DEFAULT 6.0,
        casual_leaves REAL DEFAULT 6.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Migration: Add leave columns if they don't exist (for existing DBs)
      PRAGMA table_info(users);
    `);

    // Check if columns exist and add them if missing
    const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
    const columnNames = columns.map(c => c.name);
    if (!columnNames.includes('paid_leaves')) {
      db.exec("ALTER TABLE users ADD COLUMN paid_leaves REAL DEFAULT 12.0");
    }
    if (!columnNames.includes('sick_leaves')) {
      db.exec("ALTER TABLE users ADD COLUMN sick_leaves REAL DEFAULT 6.0");
    }
    if (!columnNames.includes('casual_leaves')) {
      db.exec("ALTER TABLE users ADD COLUMN casual_leaves REAL DEFAULT 6.0");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        office_start_time TEXT DEFAULT '09:00',
        office_end_time TEXT DEFAULT '18:00',
        total_working_hours REAL DEFAULT 8.0,
        first_half_end TEXT DEFAULT '13:00',
        second_half_start TEXT DEFAULT '14:00',
        weekend_days TEXT DEFAULT 'Sunday',
        late_mark_grace_minutes INTEGER DEFAULT 15,
        overtime_rate REAL DEFAULT 1.5,
        office_lat REAL,
        office_lng REAL,
        office_radius_meters INTEGER DEFAULT 100
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        punch_in_time TEXT,
        punch_in_lat REAL,
        punch_in_lng REAL,
        punch_out_time TEXT,
        punch_out_lat REAL,
        punch_out_lng REAL,
        total_hours REAL,
        status TEXT, -- 'Present', 'Absent', 'Half Day', 'Late'
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'Paid', 'Casual', 'Sick'
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
        reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS otps (
        mobile TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at DATETIME NOT NULL
      );

      -- Insert default settings if not exists
      INSERT OR IGNORE INTO settings (id) VALUES (1);
    `);
    console.log("[DB] Database initialized successfully");
  } catch (err) {
    console.error("[DB] Error initializing database:", err);
  }

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is alive" });
  });

  // --- API ROUTES ---

  // Auth: Check if employer exists
  app.get("/api/auth/employer-exists", (req, res) => {
    const employer = db.prepare("SELECT * FROM users WHERE role = 'employer'").get();
    res.json({ exists: !!employer });
  });

  // Auth: Send OTP (Mock)
  app.post("/api/auth/send-otp", (req, res) => {
    try {
      const { mobile, authMode, role } = req.body;
      if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ success: false, message: "Valid 10-digit mobile number is required" });
      }

      // Early check for existing user
      const user = db.prepare("SELECT * FROM users WHERE mobile = ?").get(mobile) as any;
      if (user) {
        if (authMode === 'register') {
          return res.status(400).json({ success: false, message: "User already created with this number. Please login." });
        }
        if (authMode === 'login' && user.role !== role) {
          return res.status(403).json({ success: false, message: `This number is registered as an ${user.role}. Please login with the correct role.` });
        }
      } else if (authMode === 'login') {
        return res.status(404).json({ success: false, message: "User not found. Please register first." });
      }

      console.log(`[AUTH] Sending OTP to ${mobile}`);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      
      db.prepare("INSERT OR REPLACE INTO otps (mobile, otp, expires_at) VALUES (?, ?, ?)")
        .run(mobile, otp, expiresAt);
      
      console.log(`[MOCK OTP] For ${mobile}: ${otp}`);
      res.json({ success: true, message: `OTP sent successfully. Your code is ${otp}` });
    } catch (err: any) {
      console.error("[AUTH] Error sending OTP:", err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });

  // Auth: Verify OTP & Login/Register
  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { mobile, otp, name, role, authMode } = req.body;
      console.log(`[AUTH] Verifying OTP for ${mobile}`);
      
      const otpRecord = db.prepare("SELECT * FROM otps WHERE mobile = ?").get(mobile) as any;
      
      if (!otpRecord || otpRecord.otp !== otp || new Date(otpRecord.expires_at) < new Date()) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
      }

      // Clear OTP
      db.prepare("DELETE FROM otps WHERE mobile = ?").run(mobile);

      let user = db.prepare("SELECT * FROM users WHERE mobile = ?").get(mobile) as any;

      if (user) {
        if (authMode === 'register') {
          return res.status(400).json({ success: false, message: "User already created with this number. Please login." });
        }
        if (authMode === 'login' && user.role !== role) {
          return res.status(403).json({ success: false, message: `This number is registered as an ${user.role}. Please login with the correct role.` });
        }
      }

      if (!user) {
        if (authMode === 'login') {
          return res.status(404).json({ success: false, message: "User not found. Please register first." });
        }
        
        if (role === 'employer') {
          const employerExists = db.prepare("SELECT * FROM users WHERE role = 'employer'").get();
          if (employerExists) {
            return res.status(403).json({ success: false, message: "Employer already registered" });
          }
        }
        
        if (!name) {
          return res.status(400).json({ success: false, message: "Name is required for registration" });
        }
        
        const result = db.prepare("INSERT INTO users (name, mobile, role) VALUES (?, ?, ?)")
          .run(name, mobile, role);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(result.lastInsertRowid));
      }

      res.json({ success: true, user });
    } catch (err: any) {
      console.error("[AUTH] Error verifying OTP:", err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });

  // User: Get Profile
  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  // User: Update Profile (Employer only for now)
  app.put("/api/users/:id", (req, res) => {
    const { name, mobile } = req.body;
    db.prepare("UPDATE users SET name = ?, mobile = ? WHERE id = ?")
      .run(name, mobile, req.params.id);
    res.json({ success: true });
  });

  // Employees: List (Employer only)
  app.get("/api/employees", (req, res) => {
    const employees = db.prepare("SELECT * FROM users WHERE role = 'employee'").all();
    res.json(employees);
  });

  // Employees: Add (Employer only)
  app.post("/api/employees", (req, res) => {
    const { name, mobile, employee_id, paid_leaves, sick_leaves, casual_leaves } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, mobile, role, employee_id, paid_leaves, sick_leaves, casual_leaves) VALUES (?, ?, 'employee', ?, ?, ?, ?)")
        .run(name, mobile, employee_id, paid_leaves || 12, sick_leaves || 6, casual_leaves || 6);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Employees: Update (Employer only)
  app.put("/api/employees/:id", (req, res) => {
    const { name, mobile, employee_id, paid_leaves, sick_leaves, casual_leaves } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, mobile = ?, employee_id = ?, paid_leaves = ?, sick_leaves = ?, casual_leaves = ? WHERE id = ?")
        .run(name, mobile, employee_id, paid_leaves, sick_leaves, casual_leaves, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Attendance: Update Record (Employer only)
  app.put("/api/attendance/record/:id", (req, res) => {
    const { punch_in_time, punch_out_time, status } = req.body;
    try {
      const record = db.prepare("SELECT * FROM attendance WHERE id = ?").get(req.params.id) as any;
      if (!record) return res.status(404).json({ message: "Record not found" });

      let total_hours = record.total_hours;
      if (punch_in_time && punch_out_time) {
        const start = new Date(`${record.date}T${punch_in_time}`);
        const end = new Date(`${record.date}T${punch_out_time}`);
        total_hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);
      }

      db.prepare("UPDATE attendance SET punch_in_time = ?, punch_out_time = ?, status = ?, total_hours = ? WHERE id = ?")
        .run(punch_in_time, punch_out_time, status, total_hours, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Attendance: Punch In
  app.post("/api/attendance/punch-in", (req, res) => {
    const { userId, lat, lng } = req.body;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { 
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });

    // Check if already punched in
    const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(userId, date);
    if (existing) return res.status(400).json({ message: "Already punched in today" });

    db.prepare("INSERT INTO attendance (user_id, date, punch_in_time, punch_in_lat, punch_in_lng, status) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, date, time, lat, lng, 'Present');
    
    res.json({ success: true });
  });

  // Attendance: Punch Out
  app.post("/api/attendance/punch-out", (req, res) => {
    const { userId, lat, lng } = req.body;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { 
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });

    const record = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(userId, date) as any;
    if (!record) return res.status(400).json({ message: "Not punched in today" });

    // Calculate hours
    const start = new Date(`${date}T${record.punch_in_time}`);
    const end = new Date(`${date}T${time}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    db.prepare("UPDATE attendance SET punch_out_time = ?, punch_out_lat = ?, punch_out_lng = ?, total_hours = ? WHERE id = ?")
      .run(time, lat, lng, hours.toFixed(2), record.id);
    
    res.json({ success: true });
  });

  // Attendance: History
  app.get("/api/attendance/:userId", (req, res) => {
    const history = db.prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC").all(req.params.userId);
    res.json(history);
  });

  // Settings: Get
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    res.json(settings);
  });

  // Settings: Update
  app.put("/api/settings", (req, res) => {
    const s = req.body;
    db.prepare(`
      UPDATE settings SET 
        office_start_time = ?, office_end_time = ?, total_working_hours = ?,
        first_half_end = ?, second_half_start = ?, weekend_days = ?,
        late_mark_grace_minutes = ?, overtime_rate = ?,
        office_lat = ?, office_lng = ?, office_radius_meters = ?
      WHERE id = 1
    `).run(
      s.office_start_time, s.office_end_time, s.total_working_hours,
      s.first_half_end, s.second_half_start, s.weekend_days,
      s.late_mark_grace_minutes, s.overtime_rate,
      s.office_lat, s.office_lng, s.office_radius_meters
    );
    res.json({ success: true });
  });

  // Leaves: Request
  app.post("/api/leaves", (req, res) => {
    const { userId, type, startDate, endDate, reason } = req.body;
    db.prepare("INSERT INTO leaves (user_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)")
      .run(userId, type, startDate, endDate, reason);
    res.json({ success: true });
  });

  // Leaves: List
  app.get("/api/leaves", (req, res) => {
    const leaves = db.prepare(`
      SELECT l.*, u.name as employee_name 
      FROM leaves l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.start_date DESC
    `).all();
    res.json(leaves);
  });

  // Leaves: Update Status
  app.put("/api/leaves/:id", (req, res) => {
    const { status } = req.body;
    try {
      const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(req.params.id) as any;
      if (!leave) return res.status(404).json({ message: "Leave not found" });

      if (status === 'Approved' && leave.status !== 'Approved') {
        // Calculate days
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(leave.user_id) as any;
        let column = '';
        if (leave.type === 'Paid') column = 'paid_leaves';
        else if (leave.type === 'Sick') column = 'sick_leaves';
        else if (leave.type === 'Casual') column = 'casual_leaves';

        if (column) {
          db.prepare(`UPDATE users SET ${column} = ${column} - ? WHERE id = ?`)
            .run(diffDays, leave.user_id);
        }
      }

      db.prepare("UPDATE leaves SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Reports: Attendance Summary
  app.get("/api/reports/attendance", (req, res) => {
    const data = db.prepare(`
      SELECT a.*, u.name, u.mobile, u.employee_id
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.date DESC
    `).all();
    res.json(data);
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
