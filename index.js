import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";
import { serve } from "inngest/express";
import {inngest} from "./inngest/client.js"
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";

// Load environment variables
dotenv.config();


const app = express();

// Enhanced CORS configuration for Vercel deployment
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', 
  'https://ai-based-mentor-assigner-fe.vercel.app',
  'https://ai-based-mentor-assigner-fe.vercel.app/'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json());

// Basic route to verify backend is running
app.get("/", (req, res) => {
  try {
    res.status(200).json({ 
      message: "AI Ticket Assistant Backend is running successfully!", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cors_origins: allowedOrigins
    });
  } catch (error) {
    console.error('Root route error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  try {
    res.status(200).json({ 
      status: "OK", 
      message: "AI Ticket Assistant Backend is healthy",
      timestamp: new Date().toISOString(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: "ERROR", 
      message: error.message 
    });
  }
});

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({ 
    message: "Test endpoint working",
    timestamp: new Date().toISOString(),
    vercel: !!process.env.VERCEL
  });
});

app.use("/api/auth", userRoutes);
app.use("/api/tickets", TicketRoutes);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  })
);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Application Error:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection with better error handling
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
        console.log("MongoDB connected successfully");
        // Only start server if not in Vercel environment
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
          const PORT = process.env.PORT || 5000;
          app.listen(PORT, () => {
              console.log(`Server is running on port ${PORT}`);
          });
        }
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        // Don't exit in production, let Vercel handle it
        if (process.env.NODE_ENV !== 'production') {
          process.exit(1);
        }
    });
} else {
  console.error("MONGO_URI environment variable is not set");
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// Export the Express app for Vercel
export default app;
