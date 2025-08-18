import express from "express";
import { getNotificationsForUser, markAsRead, createNotification } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotificationsForUser);
router.put("/:id/read", markAsRead);
router.post("/", createNotification);

export default router; // ✅ export par défaut
