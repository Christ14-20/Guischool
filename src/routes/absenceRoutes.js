import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addAbsence, listAbsences, getAbsence, editAbsence, removeAbsence, justify, bulkCreate } from "../controllers/absenceController.js";

const router = express.Router();
router.use(authenticate);

// Création par Enseignant/Directeur/Admin
router.post("/", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT"), addAbsence);

// Lecture pour Admin/Directeur/Enseignant/Secrétaire
router.get("/", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT", "SECRETAIRE"), listAbsences);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT", "SECRETAIRE"), getAbsence);

// MAJ par Enseignant/Directeur/Admin
router.put("/:id", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT"), editAbsence);

// Justifier (Directeur/Admin/Secrétaire)
router.patch("/:id/justify", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), justify);

// Suppression stricte: Directeur/Admin
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeAbsence);

// Marquage en masse (prise d'appel)
router.post("/bulk", authorize("ADMIN", "DIRECTEUR", "ENSEIGNANT"), bulkCreate);

export default router;
