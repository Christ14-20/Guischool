import jwt from "jsonwebtoken";
import { findUserByEmail, verifyPassword, changePassword } from "../services/userService.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = "2h";

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user || !user.actif) return res.status(401).json({ error: "Utilisateur non trouvé ou inactif" });

    const valid = await verifyPassword(user, password);
    if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user.id, role: user.role, ecoleId: user.ecoleId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ token, passwordInitial: user.passwordInitial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Changement mot de passe initial
export const updatePassword = async (req, res) => {
  const { userId, newPassword } = req.body; // userId à récupérer depuis le token middleware
  try {
    await changePassword(userId, newPassword);
    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
