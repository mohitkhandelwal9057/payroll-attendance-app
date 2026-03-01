import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const mongoURI = process.env.MONGODB_URI || "";
mongoose.connect(mongoURI)
  .then(() => console.log("[DB] Successfully connected to MongoDB Atlas"))
  .catch(err => console.error("[DB] Connection Error:", err));

// --- SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
  name: String, mobile: { type: String, unique: true }, role: String,
  employee_id: String, paid_leaves: { type: Number, default: 12 },
  sick_leaves: { type: Number, default: 6 }, casual_leaves: { type: Number, default: 6 }
}));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String, punch_in_time: String, punch_out_time: String,
  total_hours: Number, status: String, lat: Number, lng: Number
}));

const Leave = mongoose.model('Leave', new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, start_date: String, end_date: String,
  reason: String, status: { type: String, default: 'Pending' }
}));

const Otp = mongoose.model('Otp', new mongoose.Schema({
  mobile: String, otp: String, expires_at: Date
}));

// --- API ROUTES ---

// 1. Test Route
app.get("/api/test", (req, res) => res.json({ message: "Server is alive with MongoDB" }));

// 2. Auth: OTP & Login
app.post("/api/auth/send-otp", async (req, res) => {
  const { mobile } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await Otp.findOneAndUpdate({ mobile }, { otp, expires_at: new Date(Date.now() + 5*60000) }, { upsert: true });
  console.log(`[OTP] ${mobile}: ${otp}`);
  res.json({ success: true, otp }); // Production में सिर्फ success भेजें
});

// 3. Attendance: Punch-In
app.post("/api/attendance/punch-in", async (req, res) => {
  const { userId, lat, lng } = req.body;
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });

  const newRecord = new Attendance({ user_id: userId, date, punch_in_time: time, status: 'Present', lat, lng });
  await newRecord.save();
  res.json({ success: true });
});

// 4. Attendance: Punch-Out
app.post("/api/attendance/punch-out", async (req, res) => {
  const { userId } = req.body;
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });

  const record = await Attendance.findOne({ user_id: userId, date });
  if (!record) return res.status(400).json({ message: "No punch-in found" });

  record.punch_out_time = time;
  // Calculate hours (simple version)
  const start = new Date(`${date}T${record.punch_in_time}`);
  const end = new Date(`${date}T${time}`);
  record.total_hours = Number(((end.getTime() - start.getTime()) / 3600000).toFixed(2));
  
  await record.save();
  res.json({ success: true });
});

// 5. Leaves: Apply
app.post("/api/leaves", async (req, res) => {
  const newLeave = new Leave(req.body);
  await newLeave.save();
  res.json({ success: true });
});

// 6. Leaves: List (For Admin/Employer)
app.get("/api/leaves", async (req, res) => {
  const leaves = await Leave.find().populate('user_id', 'name');
  res.json(leaves);
});

// Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
