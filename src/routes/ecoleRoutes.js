import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addEcole, listEcoles, getEcole, editEcole, removeEcole } from "../controllers/ecoleController.js";

const router = express.Router();

router.use(authenticate);

// CRUD écoles accessible uniquement aux Admin / Directeur
router.post("/", authorize("ADMIN", "DIRECTEUR"), addEcole);
router.get("/", authorize("ADMIN", "DIRECTEUR"), listEcoles);
router.get("/:id", authorize("ADMIN", "DIRECTEUR"), getEcole);
router.put("/:id", authorize("ADMIN", "DIRECTEUR"), editEcole);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeEcole);

export default router;
