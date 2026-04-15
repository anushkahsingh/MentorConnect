const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/booking");


// Import global exception handlers
const { notFoundHandler, errorHandler, registerGlobalHandlers } = require("./globalhandle/globalexception");

// Optional dependencies
let nodemailer;
let twilio;
try {
  nodemailer = require("nodemailer");
} catch (_) {
  nodemailer = null;
}
try {
  twilio = require("twilio");
} catch (_) {
  twilio = null;
}

const app = express();

// CORS Configuration
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://localhost:8080"
  ],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", authRoutes);
app.use("/api/bookings", bookingRoutes);




// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mentor";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });




// Email Configuration (Nodemailer)
const setupEmailTransporter = () => {
  const hasMailCreds = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  
  if (hasMailCreds && nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Boolean(process.env.SMTP_SECURE === "true"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
      });
      app.set("mailTransporter", transporter);
      console.log("📧 Email transporter configured");
    } catch (error) {
      console.warn("⚠️  Email transporter setup failed:", error.message);
      console.log("📧 OTPs will be logged to console");
    }
  } else {
    console.log("📧 Email transporter not configured; OTPs will be logged to console");
  }
};

// SMS Configuration (Twilio)
const setupSmsClient = () => {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || "";
  const twilioToken = process.env.TWILIO_AUTH_TOKEN || "";
  const twilioFrom = process.env.TWILIO_FROM_NUMBER || "";
  
  const looksLikeSid = /^AC[0-9a-f]{32}$/i.test(twilioSid);
  const looksLikeToken = /^[0-9a-f]{32}$/i.test(twilioToken);
  const hasValidTwilio = looksLikeSid && looksLikeToken && /^\+\d{7,15}$/.test(twilioFrom);

  if (hasValidTwilio && twilio) {
    try {
      const client = twilio(twilioSid, twilioToken);
      app.set("smsClient", client);
      console.log("📱 Twilio SMS client configured");
    } catch (error) {
      console.warn("⚠️  Twilio setup failed:", error.message);
      console.log("📱 SMS OTPs will be logged to console");
    }
  } else {
    if (twilioSid || twilioToken || twilioFrom) {
      console.warn("⚠️  Twilio env vars present but invalid; expected SID to start with 'AC' and from number to be E.164");
    }
    console.log("📱 Twilio client not configured; SMS OTPs will be logged to console");
  }
};

// Initialize services
setupEmailTransporter();
setupSmsClient();

// Error Handlers (Must be last)
app.use(notFoundHandler);
app.use(errorHandler);


module.exports = app;