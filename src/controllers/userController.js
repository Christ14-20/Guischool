import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../services/userService.js";
import { createAudit } from "../services/auditService.js";

// Créer utilisateur + audit
export const addUser = async (req, res) => {
  try {
    const user = await createUser(req.body);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "User",
      itemId: user.id,
      details: req.body,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création utilisateur" });
  }
};

// Lister utilisateurs
export const listUsers = async (req, res) => {
  const { page, limit, search } = req.query;
  try {
    const users = await getUsers({ page: Number(page) || 1, limit: Number(limit) || 10, search: search || "" });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération utilisateurs" });
  }
};

// Récupérer utilisateur par ID
export const getUser = async (req, res) => {
  try {
    const user = await getUserById(Number(req.params.id));
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération utilisateur" });
  }
};

// Mettre à jour utilisateur + audit
export const editUser = async (req, res) => {
  try {
    const user = await updateUser(Number(req.params.id), req.body);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "User",
      itemId: user.id,
      details: req.body,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour utilisateur" });
  }
};

// Supprimer utilisateur + audit
export const removeUser = async (req, res) => {
  try {
    const user = await deleteUser(Number(req.params.id));
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "User",
      itemId: user.id,
      details: null,
    });
    res.json({ message: "Utilisateur désactivé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression utilisateur" });
  }
};
