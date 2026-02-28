import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "";
mongoose.connect(mongoURI)
  .then(() => console.log("[DB] Connected to MongoDB Atlas"))
  .catch(err => console.error("[DB] Connection Error:", err));

// --- MONGODB SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
  name: String, mobile: { type: String, unique: true }, role: String,
  employee_id: String, paid_leaves: Number, sick_leaves: Number, casual_leaves: Number
}));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  user_id: String, date: String, punch_in_time: String, punch_out_time: String,
  total_hours: Number, status: String
}));

// --- API ROUTES ---

// Test Route
app.get("/api/test", (req, res) => res.json({ message: "Server is alive with MongoDB" }));

// Get Employees
app.get("/api/employees", async (req, res) => {
  const employees = await User.find({ role: 'employee' });
  res.json(employees);
});

// Add Employee
app.post("/api/employees", async (req, res) => {
  try {
    const newEmp = new User({ ...req.body, role: 'employee' });
    await newEmp.save();
    res.json({ success: true, id: newEmp._id });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Attendance Punch-In
app.post("/api/attendance/punch-in", async (req, res) => {
  const { userId } = req.body;
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Kolkata' });
  
  const record = new Attendance({ user_id: userId, date, punch_in_time: time, status: 'Present' });
  await record.save();
  res.json({ success: true });
});

// Port for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
