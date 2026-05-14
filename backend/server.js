const express = require("express");
const cors = require("cors");
require("dotenv").config();

const supabase = require("./db");

// Import routes
const authRoutes = require("./routes/auth");
const facultiesRoutes = require("./routes/faculties");
const roomsRoutes = require("./routes/rooms");
const studentsRoutes = require("./routes/students");
const batchesRoutes = require("./routes/batches");
const subjectsRoutes = require("./routes/subjects");
const schedulesRoutes = require("./routes/schedules");
const timetablesRoutes = require("./routes/timetables");
const timetableManagementRoutes = require("./routes/timetable_management");
const preferencesRoutes = require("./routes/preferences");
const institutionsRoutes = require("./routes/institutions");
const semestersRoutes = require("./routes/semesters");

const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174").split(',').map(s => s.trim());
    // Allow requests with no origin (e.g. curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Timetable Management System API",
    status: "running",
    version: "1.0.0"
  });
});

// Database health check
app.get("/api/health", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase error in /api/health:", error);
      return res
        .status(500)
        .json({ ok: false, error: error.message, details: error });
    }

    res.json({
      ok: true,
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Unexpected error in /api/health:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// API Routes
app.use("/api/auth", authRoutes.router);
app.use("/api/faculties", facultiesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/batches", batchesRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/timetables", timetablesRoutes);
app.use("/api/timetable-management", timetableManagementRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/institutions", institutionsRoutes);
app.use("/api/semesters", semestersRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || "development"}`);
});