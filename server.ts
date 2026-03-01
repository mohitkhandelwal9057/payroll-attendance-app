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

// --- SCHEMAS (Database Structure) ---
const userSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  role: { type: String, enum: ['employer', 'employee', 'admin'] },
  employee_id: String,
  paid_leaves: { type: Number, default: 12 },
  sick_leaves: { type: Number, default: 6 },
  casual_leaves: { type: Number, default: 6 }
});
const User = mongoose.model('User', userSchema);

const attendanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String,
  punch_in_time: String,
  punch_out_time: String,
  total_hours: Number,
  status: String
});
const Attendance = mongoose.model('Attendance', attendanceSchema);

const otpSchema = new mongoose.Schema({
  mobile: String,
  otp: String,
  expires_at: Date
});
const Otp = mongoose.model('Otp', otpSchema);

// --- API ROUTES ---

// 1. Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is alive with MongoDB" });
});

// 2. Auth: Check Employer
app.get("/api/auth/employer-exists", async (req, res) => {
  const employer = await User.findOne({ role: 'employer' });
  res.json({ exists: !!employer });
});

// 3. Auth: Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await Otp.findOneAndUpdate({ mobile }, { otp, expires_at: expiresAt }, { upsert: true });
    console.log(`[OTP] For ${mobile}: ${otp}`);
    res.json({ success: true, message: `OTP sent: ${otp}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Employees: List
app.get("/api/employees", async (req, res) => {
  const employees = await User.find({ role: 'employee' });
  res.json(employees);
});

// Port for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
