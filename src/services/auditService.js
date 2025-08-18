import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createAudit = async ({ userId, action, tableName, itemId, details }) => {
  return prisma.audit.create({
    data: { userId, action, tableName, itemId, details },
  });
};
