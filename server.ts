import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import PDFDocument from "pdfkit"; // PDF के लिए

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGODB_URI || "")
  .then(() => console.log("[DB] Full Payroll System with PDF is Live"))
  .catch(err => console.error("[DB] Connection Error:", err));

// --- SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
  name: String, mobile: String, role: String, employee_id: String, base_salary: Number
}));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: String, total_hours: Number, status: String
}));

// --- SALARY SLIP PDF ROUTE ---
app.get("/api/reports/salary-slip/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found");

    const attendance = await Attendance.find({
      user_id: userId,
      date: { $regex: `^${year}-${month}` }
    });

    const daysPresent = attendance.length;
    const salary = ((user.base_salary || 0) / 30 * daysPresent).toFixed(2);

    // PDF बनाना शुरू करें
    const doc = new PDFDocument();
    let filename = `Salary_Slip_${user.name}_${month}_${year}.pdf`;
    
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'application/pdf');

    doc.fontSize(20).text('ADSAR PAYROLL - SALARY SLIP', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Employee Name: ${user.name}`);
    doc.text(`Employee ID: ${user.employee_id || 'N/A'}`);
    doc.text(`Month/Year: ${month}/${year}`);
    doc.moveDown();
    doc.text(`Base Salary: Rs. ${user.base_salary}`);
    doc.text(`Total Days Present: ${daysPresent}`);
    doc.moveDown();
    doc.fontSize(16).text(`FINAL PAYABLE SALARY: Rs. ${salary}`, { bolds: true });
    
    doc.pipe(res);
    doc.end();

  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// Basic Routes
app.get("/api/test", (req, res) => res.json({ message: "PDF System Ready" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server on ${PORT}`));
