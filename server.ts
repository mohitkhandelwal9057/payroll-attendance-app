import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";

dotenv.config();

const app = express();

// --- 1. CORS FIX (Sabse Jaruri) ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- 2. MONGODB CONNECTION ---
const mongoURI = process.env.MONGODB_URI || "";
mongoose.connect(mongoURI)
  .then(() => console.log("[DB] Connected to MongoDB"))
  .catch(err => console.error("[DB] Connection Error:", err));

// --- 3. SCHEMAS ---
const userSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  role: { type: String, enum: ['employer', 'employee', 'admin'] },
  employee_id: String,
  base_salary: { type: Number, default: 0 }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const otpSchema = new mongoose.Schema({
  mobile: String,
  otp: String,
  expires_at: Date
});
const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

// --- 4. API ROUTES ---

// Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working perfectly!" });
});

// Check Employer Route
app.get("/api/auth/employer-exists", async (req, res) => {
  try {
    const employer = await User.findOne({ role: 'employer' });
    res.json({ exists: !!employer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send OTP Route (FIXED OTP: 123456)
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    const otp = "123456"; // Testing ke liye fix kar diya hai
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await Otp.findOneAndUpdate({ mobile }, { otp, expires_at: expiresAt }, { upsert: true });
    res.json({ success: true, message: "OTP sent (Use 123456)" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Verify OTP Route
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, name, role, authMode } = req.body;
    const otpRecord = await Otp.findOne({ mobile, otp });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    let user = await User.findOne({ mobile });
    if (authMode === 'register' && !user) {
      user = new User({ name, mobile, role, employee_id: `EMP${Date.now().toString().slice(-4)}` });
      await user.save();
    } else if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- 5. SERVER START ---
const PORT = Number(process.env.PORT) || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});
