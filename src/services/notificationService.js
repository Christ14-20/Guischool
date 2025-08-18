import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Crée une notification interne et essaie d'émettre en realtime via Socket.IO.
 */
export const createNotification = async ({ expediteurId, destinataireId, message, type = "INFO", triggerEvent = null }, app) => {
  const notif = await prisma.notification.create({
    data: {
      expediteurId,
      destinataireId,
      message,
      type,
      status: "UNREAD",
      triggerEvent,
    },
  });

  try {
    if (app) {
      const io = app.get("io");
      if (io) {
        io.to(`user_${destinataireId}`).emit("notification", notif);
      }
    }
  } catch (err) {
    console.error("Socket emit failed:", err.message);
  }

  return notif;
};

/**
 * Fonction utilitaire pour émettre une notif simple (backward compatibility)
 */
export const notifyUser = (io, userId, event, data) => {
  try {
    io.to(`user_${userId}`).emit(event, data);
  } catch (err) {
    console.error("notifyUser failed:", err.message);
  }
};

// Marquer comme lu
export const markAsRead = async (id, userId) => {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.destinataireId !== userId) throw new Error("Notification non trouvée ou pas autorisé");
  return prisma.notification.update({ where: { id }, data: { status: "READ" } });
};

// Lister notifications d'un utilisateur
export const getNotificationsForUser = async ({ destinataireId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { destinataireId },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { destinataireId } }),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit || 1) };
};
