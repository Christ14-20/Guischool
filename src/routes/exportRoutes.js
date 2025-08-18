import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { exportPaiementsCSV, exportPaiementsExcel } from "../controllers/exportController.js";

const router = express.Router();
router.use(authenticate);

// Comptable + Directeur + Admin
router.get("/paiements/csv", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), exportPaiementsCSV);
router.get("/paiements/excel", authorize("ADMIN", "DIRECTEUR", "COMPTABLE"), exportPaiementsExcel);

export default router;
