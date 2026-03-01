import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- MongoDB Connection ---
const mongoURI = process.env.MONGODB_URI || "";
mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// --- Schemas ---
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  mobile: { type: String, unique: true },
  role: { type: String, enum: ['employer', 'employee'] },
  employee_id: String
}));

// OTP को स्टोर करने के लिए Schema (यह 5 मिनट बाद खुद डिलीट हो जाएगा)
const OtpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: '5m' } } 
});
const Otp = mongoose.model('Otp', OtpSchema);

// --- API Routes ---

// 1. Test Route
app.get("/api/test", (req, res) => {
  res.json({ status: "Success", message: "Server is Running with Random OTP System!" });
});

// 2. Check if Employer Exists
app.get("/api/auth/employer-exists", async (req, res) => {
  try {
    const employer = await User.findOne({ role: 'employer' });
    res.json({ exists: !!employer });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 3. Send Random OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    // 6-digit Random OTP जनरेट करें
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // पुराने OTP को डिलीट करें और नया सेव करें
    await Otp.findOneAndDelete({ mobile });
    const newOtp = new Otp({ mobile, otp: generatedOtp });
    await newOtp.save();

    // अभी हम Console में OTP दिखा रहे हैं (जब तक आप SMS API न जोड़ें)
    console.log(`[SMS-Simulator] OTP for ${mobile} is: ${generatedOtp}`);
    
    res.json({ 
      success: true, 
      message: "OTP generated successfully!",
      debugOtp: generatedOtp // टेस्टिंग के लिए यहाँ भेज रहे हैं, बाद में इसे हटा सकते हैं
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error sending OTP" });
  }
});

// 4. Verify OTP & Login/Register
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, name, role, authMode } = req.body;

    // डेटाबेस में OTP चेक करें
    const otpRecord = await Otp.findOne({ mobile, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or Expired OTP" });
    }

    // OTP सही होने पर उसे डिलीट कर दें
    await Otp.deleteOne({ _id: otpRecord._id });

    let user = await User.findOne({ mobile });

    if (authMode === 'register' && !user) {
      user = new User({ 
        name, 
        mobile, 
        role, 
        employee_id: "EMP" + Math.floor(1000 + Math.random() * 9000) 
      });
      await user.save();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please register." });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Verification Error" });
  }
});

// --- Server Start ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Live on Port ${PORT}`);
});
