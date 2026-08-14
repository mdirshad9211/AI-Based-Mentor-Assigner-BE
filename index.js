import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";

import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";

import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

// ======================================================
// ENVIRONMENT CONFIGURATION
// ======================================================

dotenv.config({ override: true });

// Fix SRV lookup issues on some Windows/Node DNS setups
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
  "1.1.1.1",
]);

const app = express();

// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ai-based-mentor-assigner-fe.vercel.app",
  "https://ai-based-mentor-assigner-fe.vercel.app/",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // such as mobile apps, curl, Postman, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

// Handle preflight requests
app.options("/{*splat}", cors());

app.use(express.json());

// ======================================================
// BASIC ROUTE
// ======================================================

app.get("/", (req, res) => {
  try {
    res.status(200).json({
      message: "AI Ticket Assistant Backend is running successfully!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",

      mongodb_status:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",

      cors_origins: allowedOrigins,
    });
  } catch (error) {
    console.error("Root route error:", error);

    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  try {
    res.status(200).json({
      status: "OK",
      message: "AI Ticket Assistant Backend is healthy",
      timestamp: new Date().toISOString(),

      mongodb:
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected",
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  }
});

// ======================================================
// TEST ROUTE
// ======================================================

app.get("/api/test", (req, res) => {
  res.status(200).json({
    message: "Test endpoint working",
    timestamp: new Date().toISOString(),
    vercel: !!process.env.VERCEL,
  });
});

// ======================================================
// API ROUTES
// ======================================================

app.use("/api/auth", userRoutes);

app.use("/api/tickets", TicketRoutes);

// ======================================================
// INNGEST
// ======================================================

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      onUserSignup,
      onTicketCreated,
    ],
  })
);

// ======================================================
// ERROR HANDLING
// ======================================================

app.use((err, req, res, next) => {
  console.error("Application Error:", err);
  console.error("Stack:", err.stack);

  res.status(500).json({
    message: "Internal server error",

    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong!",

    timestamp: new Date().toISOString(),
  });
});

// ======================================================
// 404 HANDLER
// ======================================================

app.use("/{*splat}", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// ======================================================
// MONGODB CONNECTION
// ======================================================

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
  console.log(`Using database: ${mongoose.connection.name}`);
});

mongoose.connection.on("error", (err) => {
  console.error(
    "MongoDB connection error:",
    err.message
  );
});

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "family-dentist";

  if (!uri) {
    throw new Error(
      "MONGO_URI environment variable is not set"
    );
  }

  await mongoose.connect(uri, {
    dbName: dbName,
    tls: true,
    serverSelectionTimeoutMS: 15000,
  });

  console.log("MongoDB connected successfully");
  console.log(
    `Using database: ${mongoose.connection.name}`
  );
};

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  try {
    await connectDB();

    // Don't start a local HTTP server on Vercel
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.VERCEL
    ) {
      const PORT = process.env.PORT || 5000;

      app.listen(PORT, () => {
        console.log(
          `Server is running on port ${PORT}`
        );
      });
    }
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error.message
    );

    // Don't crash production/Vercel
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env.VERCEL
    ) {
      process.exit(1);
    }
  }
};

startServer();

// ======================================================
// EXPORT FOR VERCEL
// ======================================================

export default app;