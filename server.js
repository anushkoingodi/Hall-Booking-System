const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());
app.use(express.static("frontend"));

// ── MongoDB Connection ──────────────────────────────────────────
mongoose.connect("mongodb://anushkoingodi:eWpn8oJucmXQCEQ6@ac-bgpps8t-shard-00-00.onoe5sw.mongodb.net:27017,ac-bgpps8t-shard-00-01.onoe5sw.mongodb.net:27017,ac-bgpps8t-shard-00-02.onoe5sw.mongodb.net:27017/hallbooking?ssl=true&replicaSet=atlas-281qpd-shard-0&authSource=admin")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err.message));

// ── Schema ─────────────────────────────────────────────────────
const bookingSchema = new mongoose.Schema({
  hallId:    { type: Number, required: true },
  date:      { type: String, required: true },
  time:      { type: String, required: true },   // human-readable "09:00 AM - 11:00 AM"
  startMin:  { type: Number, required: true },   // minutes from midnight, for overlap checks
  endMin:    { type: Number, required: true },
  userEmail: { type: String, default: "" },
  userName:  { type: String, default: "" },
  bookedAt:  { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);

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
app.get("/db-status", (req, res) => {
  const state = mongoose.connection.readyState;
  res.json({ connected: state === 1, state });
});

// ── Get bookings (filtered by email if provided) ───────────────
app.get("/bookings", async (req, res) => {
  try {
    const filter = {};
    if (req.query.email) filter.userEmail = req.query.email;
    const data = await Booking.find(filter).sort({ date: 1, time: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "DB not connected. Whitelist your IP on MongoDB Atlas." });
  }
});

// ── Get ALL bookings (for availability checks, no filter) ───────
app.get("/bookings/all", async (req, res) => {
  try {
    const data = await Booking.find().sort({ date: 1, time: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "DB not connected. Whitelist your IP on MongoDB Atlas." });
  }
});

// ── Book a hall ────────────────────────────────────────────────
app.post("/book", async (req, res) => {
  const { hallId, date, time, userEmail, userName } = req.body;

  if (!hallId || !date || !time) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
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
    // Overlap check: any existing booking on same hall+date where ranges intersect
    // Two ranges [s1,e1] and [s2,e2] overlap when s1 < e2 AND s2 < e1
    const conflict = await Booking.findOne({
      hallId: Number(hallId),
      date,
      startMin: { $lt: newEnd },
      endMin:   { $gt: newStart }
    });

    if (conflict) {
      return res.json({
        success: false,
        message: `❌ Time overlap with an existing booking (${conflict.time}). Please choose a different time.`
      });
    }

    const newBooking = new Booking({
      hallId: Number(hallId), date, time,
      startMin: newStart,
      endMin:   newEnd,
      userEmail: userEmail || "",
      userName:  userName  || ""
    });
    await newBooking.save();

    res.json({
      success: true,
      message: `✅ ${HALLS[hallId].name} booked successfully!`,
      booking: newBooking
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error. Try again.", error: error.message });
  }
});

// ── Delete single booking ──────────────────────────────────────
app.delete("/bookings/:id", async (req, res) => {
  try {
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
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// ── Admin: Stats ───────────────────────────────────────────────
app.get("/admin/stats", async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    const byHall = await Booking.aggregate([
      { $group: { _id: "$hallId", count: { $sum: 1 } } }
    ]);
    const today = new Date().toISOString().split("T")[0];
    const todayCount = await Booking.countDocuments({ date: today });
    res.json({ total, byHall, todayCount });
  } catch (err) {
    res.status(500).json({ error: "DB error", message: err.message });
  }
});

// ── Admin: Delete ALL bookings ─────────────────────────────────
app.delete("/admin/bookings", async (req, res) => {
  try {
    const result = await Booking.deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} bookings.` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// backwards compat
app.post("/admin/delete-all", async (req, res) => {
  try {
    await Booking.deleteMany({});
    res.json({ success: true, message: "All bookings deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
});

// ── Start server ───────────────────────────────────────────────
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});