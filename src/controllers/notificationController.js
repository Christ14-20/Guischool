import { createNotification as serviceCreateNotification, getNotificationsForUser as serviceGetNotificationsForUser, markAsRead as serviceMarkAsRead } from "../services/notificationService.js";
import { createAudit } from "../services/auditService.js";

// POST /api/notifications -> crée et notifie
export const createNotification = async (req, res) => {
  try {
    const { destinataireId, message, type, triggerEvent } = req.body;
    const notif = await serviceCreateNotification(
      { expediteurId: req.user.id, destinataireId, message, type, triggerEvent },
      req.app
    );
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Notification",
      itemId: notif.id,
      details: { message, destinataireId },
    });
    res.status(201).json(notif);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/notifications -> lister notifications
export const getNotificationsForUser = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await serviceGetNotificationsForUser({
      destinataireId: req.user.id,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read -> marquer comme lu
export const markAsRead = async (req, res) => {
  try {
    const n = await serviceMarkAsRead(Number(req.params.id), req.user.id);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Notification",
      itemId: n.id,
      details: { status: "READ" },
    });
    res.json(n);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
