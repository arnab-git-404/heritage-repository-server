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

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// dotenv.config({ path: path.join(__dirname, ".env"), override: true });

dotenv.config()

const app = express();

// ===== CORS Configuration =====
const corsOptions = {
  origin: [
    'http://localhost:8080',
    `${process.env.FRONTEND_URL}`,
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
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

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toLocaleString() });
});

// ===== Serve Uploaded Files =====
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Do NOT Serve Frontend Here =====
// (Frontend will be deployed separately on Netlify/Vercel)
// Remove any 'dist' serving to prevent Render build errors

// ===== Connect to MongoDB =====
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error(
    "❌ MONGODB_URI is not set. Make sure backend/.env contains MONGODB_URI."
  );
  process.exit(1);
}

// Mask password in logs
try {
  const masked = mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
  console.log("Attempting MongoDB connection with URI:", masked);
} catch (_) {}

mongoose
  .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ===== Start Server (HTTP + Socket.IO) =====
const PORT = process.env.PORT || 5000;
const server = createServer(app);

// const io = new SocketIOServer(server, {
//   cors: { origin: "*" },
// });

// io.use((socket, next) => {
//   try {
//     const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, "");
//     if (!token) return next(new Error("Missing token"));
//     if (!process.env.JWT_SECRET) return next(new Error("Server misconfiguration"));
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     if (!payload || !payload.user || !payload.user.id) return next(new Error("Invalid token"));
//     socket.userId = String(payload.user.id);
//     next();
//   } catch (e) {
//     next(new Error("Invalid token"));
//   }
// });

// async function canChat(userA, userB) {
//   if (!userA || !userB) return false;
//   try {
//     const exists = await Collaboration.exists({
//       status: 'accepted',
//       $or: [
//         { requesterId: userA, recipientId: userB },
//         { requesterId: userB, recipientId: userA },
//       ],
//     });
//     return Boolean(exists);
//   } catch {
//     return false;
//   }
// }

// function roomFor(u1, u2) {
//   return [String(u1), String(u2)].sort().join('::');
// }

// io.on('connection', (socket) => {
//   socket.on('join', async ({ otherUserId }) => {
//     if (!otherUserId) return;
//     const allowed = await canChat(socket.userId, otherUserId);
//     if (!allowed) {
//       socket.emit('error', { message: 'Chat not allowed' });
//       return;
//     }
//     const room = roomFor(socket.userId, otherUserId);
//     socket.join(room);
//     socket.emit('joined', { roomId: room });
//   });

//   socket.on('message', async ({ otherUserId, text }) => {
//     const t = (text || '').toString().trim();
//     if (!t || !otherUserId) return;
//     const allowed = await canChat(socket.userId, otherUserId);
//     if (!allowed) return;
//     const room = roomFor(socket.userId, otherUserId);
//     io.to(room).emit('message', { from: socket.userId, text: t, ts: Date.now() });
//   });
// });

server.listen(PORT, () => {
  console.log(`🚀 Server (HTTP+WS) running on port ${PORT}`);
});
