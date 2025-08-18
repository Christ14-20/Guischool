// src/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Import des routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import ecoleRoutes from "./routes/ecoleRoutes.js";
import classeRoutes from "./routes/classeRoutes.js";
import eleveRoutes from "./routes/eleveRoutes.js";
import tuteurRoutes from "./routes/tuteurRoutes.js";
import paiementRoutes from "./routes/paiementRoutes.js";
import matiereRoutes from "./routes/matiereRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import absenceRoutes from "./routes/absenceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";

dotenv.config();

// Initialisation
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
});
const prisma = new PrismaClient();

// Middleware
app.set("io", io); // rendre io dispo dans req.app.get("io")
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Gestion des sockets
io.on("connection", (socket) => {
  console.log("🔌 Nouveau client connecté");

  socket.on("auth", (payload) => {
    if (payload && payload.userId) {
      const room = `user_${payload.userId}`;
      socket.join(room);
      console.log(`👤 Utilisateur ${payload.userId} rejoint la room ${room}`);
      socket.emit("connected", { room });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Client déconnecté");
  });
});

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ecoles", ecoleRoutes);
app.use("/api/classes", classeRoutes);
app.use("/api/eleves", eleveRoutes);
app.use("/api/tuteurs", tuteurRoutes);
app.use("/api/paiements", paiementRoutes);
app.use("/api/matieres", matiereRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/absences", absenceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/exports", exportRoutes);

// Route test
app.get("/", (req, res) => {
  res.json({ message: "🚀 Guischool API OK" });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`)
);
