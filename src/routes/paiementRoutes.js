import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addPaiement, listPaiements, getPaiement, editPaiement, removePaiement } from "../controllers/paiementController.js";

const router = express.Router();
router.use(authenticate);

// Comptable + Directeur + Admin
router.post("/", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), addPaiement);
router.get("/", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), listPaiements);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), getPaiement);
router.put("/:id", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), editPaiement);
// Annulation stricte: Directeur/Admin
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removePaiement);

export default router;
