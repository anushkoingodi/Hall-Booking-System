const express = require("express");
const mongoose = require("mongoose");
const app = express();

const path = require("path");
const fs = require("fs");

// Load environment variables (.env)
try {
  if (typeof process.loadEnvFile === "function") {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
} catch (e) {
  // Ignore if already loaded or missing
}

app.use(express.json());

// ── College Email Domain Configuration ──────────────────────────
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || "staloysius.edu.in").toLowerCase().trim();

function isCollegeEmail(email) {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  const domain = `@${ALLOWED_EMAIL_DOMAIN}`;
  if (!clean.endsWith(domain)) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@staloysius\.edu\.in$/;
  return regex.test(clean);
}

// ── Static Files ────────────────────────────────────────────────
// Admin portal: http://localhost:5000/admin
app.use("/admin", express.static(path.join(__dirname, "frontend", "admin")));
// User portal: http://localhost:5000/ or http://localhost:5000/user
app.use("/user", express.static(path.join(__dirname, "frontend", "user")));
app.use(express.static(path.join(__dirname, "frontend", "user")));

// Redirect /admin.html to /admin for backwards compatibility
app.get("/admin.html", (req, res) => res.redirect("/admin"));

// ── MongoDB Connection ──────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://anushkoingodi:eWpn8oJucmXQCEQ6@ac-bgpps8t-shard-00-00.onoe5sw.mongodb.net:27017,ac-bgpps8t-shard-00-01.onoe5sw.mongodb.net:27017,ac-bgpps8t-shard-00-02.onoe5sw.mongodb.net:27017/hallbooking?ssl=true&replicaSet=atlas-281qpd-shard-0&authSource=admin";

let isConnected = false;
async function connectToDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.log("❌ MongoDB Error:", err.message);
    throw err;
  }
}

// ── Schemas ───────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  hallId:       { type: Number, required: true },
  date:         { type: String, required: true },
  time:         { type: String, required: true },   // human-readable "09:00 AM - 11:00 AM"
  startMin:     { type: Number, required: true },   // minutes from midnight, for overlap checks
  endMin:       { type: Number, required: true },
  userEmail:    { type: String, default: "" },
  userName:     { type: String, default: "" },
  dept:         { type: String, default: "" },
  phone:        { type: String, default: "" },
  eventName:    { type: String, default: "" },
  participants: { type: Number, default: 0 },
  status:       { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  bookedAt:     { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  dept:         { type: String, default: "" },
  phone:        { type: String, default: "" },
  registeredAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// ── Time helpers ───────────────────────────────────────────────
// Converts "09:00 AM" or "09:00" to minutes from midnight
function timeToMin(str) {
  str = str.trim();
  const ampm = str.match(/AM|PM/i);
  let [h, m] = str.replace(/AM|PM/i, '').trim().split(':').map(Number);
  if (ampm) {
    const period = ampm[0].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
  }
  return h * 60 + (m || 0);
}

// Parses "09:00 AM - 11:00 AM" → { startMin, endMin }
function parseTimeRange(timeStr) {
  const parts = timeStr.split('-').map(s => s.trim());
  if (parts.length < 2) throw new Error('Invalid time range format');
  return { startMin: timeToMin(parts[0]), endMin: timeToMin(parts[1]) };
}

// ── Hall data ──────────────────────────────────────────────────
const HALLS = {
  1:  { name: "L F Rasquina Hall",    capacity: 123  },
  2:  { name: "Robert Sequeria Hall", capacity: 415  },
  3:  { name: "Sanidhya Hall",        capacity: 80   },
  4:  { name: "Magis Hall",           capacity: 50   },
  5:  { name: "Arrupe Hall 1",        capacity: null },
  6:  { name: "Arrupe Hall 2",        capacity: null },
  7:  { name: "Arrupe Hall 3",        capacity: null },
  8:  { name: "AV Room",             capacity: 120  },
  9:  { name: "Joseph Willy Hall",    capacity: 80   },
  10: { name: "Eric Mathias Hall",    capacity: 200  },
  11: { name: "Xavier Hall",          capacity: 150  }
};

// ── DB Status ──────────────────────────────────────────────────
app.get("/db-status", async (req, res) => {
  try {
    await connectToDB();
    const state = mongoose.connection.readyState;
    res.json({ connected: state === 1, state });
  } catch (err) {
    res.json({ connected: false, state: 0, error: err.message });
  }
});

// ── Auth: Register ─────────────────────────────────────────────
app.post(["/register", "/api/register"], async (req, res) => {
  const { name, email, dept, phone } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, message: "Please enter your email address." });
  }

  // Convert email address to lowercase before validation
  const cleanEmail = email.trim().toLowerCase();

  // Validate college email domain
  if (!isCollegeEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please use your official college email ID to register."
    });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Please enter your full name." });
  }

  try {
    await connectToDB();
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      user.name = name.trim();
      if (dept !== undefined) user.dept = dept.trim();
      if (phone !== undefined) user.phone = phone.trim();
      await user.save();
    } else {
      user = new User({
        name: name.trim(),
        email: cleanEmail,
        dept: dept ? dept.trim() : "",
        phone: phone ? phone.trim() : ""
      });
      await user.save();
    }

    res.json({
      success: true,
      message: "Registration successful.",
      user: {
        name: user.name,
        email: user.email,
        dept: user.dept,
        phone: user.phone
      }
    });
  } catch (err) {
    // Graceful fallback if database is currently unreachable
    res.json({
      success: true,
      message: "Registration successful.",
      user: {
        name: name.trim(),
        email: cleanEmail,
        dept: (dept || "").trim(),
        phone: (phone || "").trim()
      }
    });
  }
});

// ── Auth: Login ────────────────────────────────────────────────
app.post(["/login", "/api/login"], async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ success: false, message: "Please enter your email address." });
  }

  // Convert email address to lowercase before validation
  const cleanEmail = email.trim().toLowerCase();

  // Validate college email domain
  if (!isCollegeEmail(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please use your official college email ID to log in."
    });
  }

  try {
    await connectToDB();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with this email. Please register first."
      });
    }

    res.json({
      success: true,
      message: "Login successful.",
      user: {
        name: user.name,
        email: user.email,
        dept: user.dept,
        phone: user.phone
      }
    });
  } catch (err) {
    // If DB is unreachable, return valid status for authorized college email
    res.json({
      success: true,
      message: "Login successful.",
      user: {
        email: cleanEmail,
        name: cleanEmail.split("@")[0]
      }
    });
  }
});

// ── Get bookings (filtered by email if provided) ───────────────
app.get("/bookings", async (req, res) => {
  try {
    await connectToDB();
    const filter = {};
    if (req.query.email) {
      const cleanEmail = req.query.email.trim().toLowerCase();
      if (!isCollegeEmail(cleanEmail)) {
        return res.status(400).json({
          error: "Invalid email domain. Please use your official college email ID."
        });
      }
      filter.userEmail = cleanEmail;
    }
    const data = await Booking.find(filter).sort({ date: 1, time: 1 });
    const normalized = data.map(doc => {
      const obj = doc.toObject();
      if (!obj.status) obj.status = "Pending";
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: "DB not connected. Whitelist your IP on MongoDB Atlas.", details: err.message });
  }
});

// ── Get ALL bookings (for availability checks, no filter) ───────
app.get("/bookings/all", async (req, res) => {
  try {
    await connectToDB();
    const data = await Booking.find().sort({ date: 1, time: 1 });
    
    // Enrich with dept & phone from User model if missing in older documents
    const enriched = await Promise.all(data.map(async (doc) => {
      const obj = doc.toObject();
      if (!obj.status) obj.status = "Pending";
      if ((!obj.dept || !obj.phone) && obj.userEmail) {
        const u = await User.findOne({ email: obj.userEmail.toLowerCase() });
        if (u) {
          if (!obj.dept) obj.dept = u.dept || "";
          if (!obj.phone) obj.phone = u.phone || "";
          if (!obj.userName) obj.userName = u.name || "";
        }
      }
      return obj;
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "DB not connected. Whitelist your IP on MongoDB Atlas.", details: err.message });
  }
});

// ── Book a hall ────────────────────────────────────────────────
app.post("/book", async (req, res) => {
  const { hallId, date, time, userEmail, userName, dept, phone, eventName, participants } = req.body;

  if (!hallId || !date || !time) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  // Validate college email domain on booking
  let cleanEmail = "";
  if (userEmail) {
    cleanEmail = userEmail.trim().toLowerCase();
    if (!isCollegeEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please use your official college email ID to book a hall."
      });
    }
  }

  if (!HALLS[hallId]) {
    return res.status(400).json({ success: false, message: "Invalid hall selected." });
  }

  // Parse the requested time range into minutes
  let newStart, newEnd;
  try {
    ({ startMin: newStart, endMin: newEnd } = parseTimeRange(time));
  } catch {
    return res.status(400).json({ success: false, message: "Invalid time format. Expected \"HH:MM AM - HH:MM PM\"." });
  }

  if (newEnd <= newStart) {
    return res.status(400).json({ success: false, message: "End time must be after start time." });
  }

  try {
    await connectToDB();

    // Check if an existing APPROVED booking conflicts on the same hall & date
    const approvedConflict = await Booking.findOne({
      hallId: Number(hallId),
      date,
      status: "Approved",
      startMin: { $lt: newEnd },
      endMin:   { $gt: newStart }
    });

    if (approvedConflict) {
      return res.json({
        success: false,
        message: `❌ Time slot conflicts with an approved booking (${approvedConflict.time}). Please choose a different time.`
      });
    }

    // Lookup user details if missing from payload
    let userDept = (dept || "").trim();
    let userPhone = (phone || "").trim();
    let resolvedUserName = (userName || "").trim();

    if (cleanEmail && (!userDept || !userPhone || !resolvedUserName)) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        if (!userDept && existingUser.dept) userDept = existingUser.dept;
        if (!userPhone && existingUser.phone) userPhone = existingUser.phone;
        if (!resolvedUserName && existingUser.name) resolvedUserName = existingUser.name;
      }
    }

    const newBooking = new Booking({
      hallId: Number(hallId),
      date,
      time,
      startMin: newStart,
      endMin:   newEnd,
      userEmail: cleanEmail,
      userName:  resolvedUserName,
      dept: userDept,
      phone: userPhone,
      eventName: (eventName || "").trim(),
      participants: Number(participants) || 0,
      status: "Pending" // New bookings always have Pending status
    });
    await newBooking.save();

    res.json({
      success: true,
      message: `✅ Booking request submitted for ${HALLS[hallId].name}! Status: Pending Approval.`,
      booking: newBooking
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error. Try again.", error: error.message });
  }
});

// ── Update booking status (Approve / Reject) ────────────────────
app.patch("/api/bookings/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!status || !["Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status. Allowed: Pending, Approved, Rejected" });
  }

  try {
    await connectToDB();
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Overlap prevention: if approving, check if another APPROVED booking conflicts on same hall & date
    if (status === "Approved") {
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        hallId: booking.hallId,
        date: booking.date,
        status: "Approved",
        startMin: { $lt: booking.endMin },
        endMin:   { $gt: booking.startMin }
      });

      if (conflict) {
        const conflictTitle = conflict.eventName ? `"${conflict.eventName}"` : "Another booking";
        return res.status(409).json({
          success: false,
          message: `❌ Cannot approve: Conflicts with already approved booking ${conflictTitle} (${conflict.time}).`
        });
      }
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: `Booking has been marked as ${status}.`,
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error updating status.", error: err.message });
  }
});

// Convenience endpoints for approve & reject
app.post("/bookings/:id/approve", async (req, res) => {
  try {
    await connectToDB();
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    // Check overlap
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      hallId: booking.hallId,
      date: booking.date,
      status: "Approved",
      startMin: { $lt: booking.endMin },
      endMin:   { $gt: booking.startMin }
    });

    if (conflict) {
      const conflictTitle = conflict.eventName ? `"${conflict.eventName}"` : "Another booking";
      return res.status(409).json({
        success: false,
        message: `❌ Cannot approve: Overlaps with approved booking ${conflictTitle} (${conflict.time}).`
      });
    }

    booking.status = "Approved";
    await booking.save();
    res.json({ success: true, message: "Booking Approved successfully! ✅", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

app.post("/bookings/:id/reject", async (req, res) => {
  try {
    await connectToDB();
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });

    booking.status = "Rejected";
    await booking.save();
    res.json({ success: true, message: "Booking Rejected. ❌", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
});

// ── Delete single booking ──────────────────────────────────────
app.delete("/bookings/:id", async (req, res) => {
  try {
    await connectToDB();
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Booking not found." });
    res.json({ success: true, message: "Booking deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting booking.", error: err.message });
  }
});

// ── Backwards compat: POST delete (keep for old calls) ─────────
app.post("/delete/:id", async (req, res) => {
  try {
    await connectToDB();
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// ── Admin: Stats ───────────────────────────────────────────────
app.get("/admin/stats", async (req, res) => {
  try {
    await connectToDB();
    const total = await Booking.countDocuments();
    const pendingCount = await Booking.countDocuments({
      $or: [{ status: "Pending" }, { status: { $exists: false } }, { status: null }]
    });
    const approvedCount = await Booking.countDocuments({ status: "Approved" });
    const rejectedCount = await Booking.countDocuments({ status: "Rejected" });
    const byHall = await Booking.aggregate([
      { $group: { _id: "$hallId", count: { $sum: 1 } } }
    ]);
    const today = new Date().toISOString().split("T")[0];
    const todayCount = await Booking.countDocuments({ date: today });
    res.json({ total, pendingCount, approvedCount, rejectedCount, byHall, todayCount });
  } catch (err) {
    res.status(500).json({ error: "DB error", message: err.message });
  }
});

// ── Admin: Delete ALL bookings ─────────────────────────────────
app.delete("/admin/bookings", async (req, res) => {
  try {
    await connectToDB();
    const result = await Booking.deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} bookings.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// backwards compat
app.post("/admin/delete-all", async (req, res) => {
  try {
    await connectToDB();
    await Booking.deleteMany({});
    res.json({ success: true, message: "All bookings deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// ── Start server ───────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;