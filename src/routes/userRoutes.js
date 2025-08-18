import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addUser, listUsers, getUser, editUser, removeUser } from "../controllers/userController.js";

const router = express.Router();

// Toutes les routes Users nécessitent Auth
router.use(authenticate);

// CRUD accessible uniquement aux Admin / Directeur
router.post("/", authorize("ADMIN", "DIRECTEUR"), addUser);
router.get("/", authorize("ADMIN", "DIRECTEUR"), listUsers);
router.get("/:id", authorize("ADMIN", "DIRECTEUR"), getUser);
router.put("/:id", authorize("ADMIN", "DIRECTEUR"), editUser);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeUser);

export default router;
