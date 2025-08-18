import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Créer un nouvel utilisateur
export const createUser = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      role: data.role,
      passwordHash: hashedPassword,
      passwordInitial: true,
      ecoleId: data.ecoleId,
      actif: true,
      permissionsDynamiques: data.permissionsDynamiques || {},
    },
  });
};

// Vérifier mot de passe
export const verifyPassword = async (user, password) => {
  return bcrypt.compare(password, user.passwordHash);
};

// Trouver utilisateur par email
export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

// Changer mot de passe
export const changePassword = async (userId, newPassword) => {
  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashed, passwordInitial: false },
  });
};






// Récupérer tous les utilisateurs avec pagination et filtre
export const getUsers = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  return prisma.user.findMany({
    where: {
      OR: [
        { nom: { contains: search, mode: "insensitive" } },
        { prenom: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

// Récupérer utilisateur par ID
export const getUserById = async (id) => {
  return prisma.user.findUnique({ where: { id } });
};

// Mettre à jour utilisateur
export const updateUser = async (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

// Supprimer utilisateur (soft delete)
export const deleteUser = async (id) => {
  return prisma.user.update({
    where: { id },
    data: { actif: false, updatedAt: new Date() },
  });
};
