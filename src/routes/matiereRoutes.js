import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addMatiere, listMatieres, getMatiere, editMatiere, removeMatiere } from "../controllers/matiereController.js";

const router = express.Router();
router.use(authenticate);

// Admin + Directeur : plein accès ; Enseignant : lecture
router.post("/", authorize("ADMIN", "DIRECTEUR"), addMatiere);
router.get("/", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT"), listMatieres);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT"), getMatiere);
router.put("/:id", authorize("ADMIN", "DIRECTEUR"), editMatiere);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeMatiere);

export default router;
