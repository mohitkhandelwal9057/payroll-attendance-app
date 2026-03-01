import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";

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
  name: String, 
  mobile: { type: String, unique: true }, 
  role: { type: String, enum: ['employer', 'employee', 'admin'] },
  employee_id: String, 
  base_salary: { type: Number, default: 0 },
  paid_leaves: { type: Number, default: 12 }, 
  sick_leaves: { type: Number, default: 6 }, 
  casual_leaves: { type: Number, default: 6 }
}));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String, 
  punch_in_time: String, 
  punch_out_time: String,
  total_hours: Number, 
  status: String, 
  lat: Number, 
  lng: Number
}));

const Leave = mongoose.model('Leave', new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, 
  start_date: String, 
  end_date: String,
  reason: String, 
  status: { type: String, default: 'Pending' }
}));

const Otp = mongoose.model('Otp', new mongoose.Schema({
  mobile: String, 
  otp: String, 
  expires_at: Date
}));

// --- API ROUTES ---

// 1. Test Route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is alive and MongoDB is ready!" });
});

// 2. Auth: Check Employer
app.get("/api/auth/employer-exists", async (req, res) => {
  try {
    const employer = await User.findOne({ role: 'employer' });
    res.json({ exists: !!employer });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
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

// 4. Auth: Verify OTP & Register/Login
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, name, role, authMode } = req.body;
    const otpRecord = await Otp.findOne({ mobile, otp });

    if (!otpRecord || otpRecord.expires_at < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    let user = await User.findOne({ mobile });

    if (authMode === 'register' && !user) {
      user = new User({ name, mobile, role, employee_id: `EMP${Date.now().toString().slice(-4)}` });
      await user.save();
    } else if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please register." });
    }

    await Otp.deleteOne({ mobile });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Attendance: Punch-In/Out
app.post("/api/attendance/punch-in", async (req, res) => {
  try {
    const { userId, lat, lng } = req.body;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });

    const newRecord = new Attendance({ user_id: userId, date, punch_in_time: time, status: 'Present', lat, lng });
    await newRecord.save();
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

app.post("/api/attendance/punch-out", async (req, res) => {
  try {
    const { userId } = req.body;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });

    const record = await Attendance.findOne({ user_id: userId, date });
    if (!record) return res.status(400).json({ message: "No punch-in found today" });

    record.punch_out_time = time;
    const start = new Date(`${date}T${record.punch_in_time}`);
    const end = new Date(`${date}T${time}`);
    record.total_hours = Number(((end.getTime() - start.getTime()) / 3600000).toFixed(2));
    
    await record.save();
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// 6. Salary Slip PDF
app.get("/api/reports/salary-slip/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const attendance = await Attendance.find({ user_id: userId, date: { $regex: `^${year}-${month}` } });
    const daysPresent = attendance.length;
    const salary = ((user.base_salary || 0) / 30 * daysPresent).toFixed(2);

    const doc = new PDFDocument();
    res.setHeader('Content-disposition', `attachment; filename=SalarySlip_${user.name}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.fontSize(20).text('ADSAR PAYROLL - SALARY SLIP', { align: 'center' });
    doc.moveDown().fontSize(14).text(`Employee: ${user.name}\nID: ${user.employee_id}\nMonth: ${month}/${year}`);
    doc.moveDown().text(`Days Present: ${daysPresent}\nBase Salary: Rs. ${user.base_salary}`);
    doc.moveDown().fontSize(16).text(`FINAL SALARY: Rs. ${salary}`, { bold: true });
    
    doc.pipe(res); doc.end();
  } catch (err: any) { res.status(500).send(err.message); }
});

// Server Start (Render Fix)
const PORT: number = parseInt(process.env.PORT || "10000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Full Payroll System with PDF is Live on port ${PORT}`);
});
