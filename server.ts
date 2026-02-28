import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MONGODB MODELS (Schema) ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, unique: true, required: true },
  role: { type: String, enum: ['employer', 'employee', 'admin'], required: true },
  employee_id: String,
  paid_leaves: { type: Number, default: 12.0 },
  sick_leaves: { type: Number, default: 6.0 },
  casual_leaves: { type: Number, default: 6.0 },
  created_at: { type: Date, default: Date.now }
});

const SettingSchema = new mongoose.Schema({
  office_start_time: { type: String, default: '09:00' },
  office_end_time: { type: String, default: '18:00' },
  total_working_hours: { type: Number, default: 8.0 },
  office_lat: Number,
  office_lng: Number,
  office_radius_meters: { type: Number, default: 100 }
});

const AttendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String,
  punch_in_time: String,
  punch_out_time: String,
  total_hours: Number,
  status: String
});

const User = mongoose.model('User', UserSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  // MongoDB Connection
  const mongoURI = process.env.MONGODB_URI || "";
  await mongoose.connect(mongoURI);
  console.log("[DB] Connected to MongoDB Atlas");

  // --- API ROUTES ---
  app.get("/api/test", (req, res) => res.json({ message: "Server is alive with MongoDB" }));

  // Employer Check
  app.get("/api/auth/employer-exists", async (req, res) => {
    const employer = await User.findOne({ role: 'employer' });
    res.json({ exists: !!employer });
  });

  // Add Employee
  app.post("/api/employees", async (req, res) => {
    try {
      const newEmployee = new User({ ...req.body, role: 'employee' });
      await newEmployee.save();
      res.json({ success: true, id: newEmployee._id });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Get All Employees
  app.get("/api/employees", async (req, res) => {
    const employees = await User.find({ role: 'employee' });
    res.json(employees);
  });

  // Punch In
  app.post("/api/attendance/punch-in", async (req, res) => {
    const { userId, lat, lng } = req.body;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });

    const newAttendance = new Attendance({
      user_id: userId,
      date,
      punch_in_time: time,
      status: 'Present'
    });
    await newAttendance.save();
    res.json({ success: true });
  });

  // Static files for Production (Render)
  const distPath = path.resolve(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.resolve(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
