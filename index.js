import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import submissionsRoutes from "./routes/submissions.js";
import approvedRoutes from "./routes/approved.js";
import uploadsRoutes from "./routes/uploads.js";
import referenceRoutes from "./routes/reference.js";
import path from "path";
import { fileURLToPath } from "url";
import collaborationRoutes from "./routes/collaboration.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import Collaboration from "./models/Collaboration.js";
import { dbConnect } from "./utils/db.js";
import Amendment from "./routes/Amendment.js"

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== CORS Configuration =====
const corsOptions = {
  origin: ["http://localhost:8080", `${process.env.FRONTEND_URL}` , "*" ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// ===== Middleware =====
app.use(cors(corsOptions));
app.use(express.json());

// ===== API Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/approved", approvedRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/collab", collaborationRoutes);
app.use("/api/amendments", Amendment);

// ===== Health Check Endpoint =====
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toLocaleString() });
});

app.get("/", (req, res) => {
  res.send("Heritage Repository Backend Server is running.");
});


// Graceful shutdown handler
const gracefulShutdown = (server) => {
  return (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };
};

const startServer = async () => {
  try {
    await dbConnect();

    const server = createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🗄️  MongoDB: Connected successfully`);
      console.log(`📦 Image storage ready`);
      // console.log(`📝 Environment: ${NODE_ENV || "development"}`);
      // console.log(`⚡ Redis: Cache layer active`);
      // console.log(`🔗 Socket.IO enabled`);
    });
    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server error:", error);
      }
      process.exit(1);
    });

    // Graceful shutdown on signals
    process.on("SIGTERM", gracefulShutdown(server));
    process.on("SIGINT", gracefulShutdown(server));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      gracefulShutdown(server)("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown(server)("unhandledRejection");
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
