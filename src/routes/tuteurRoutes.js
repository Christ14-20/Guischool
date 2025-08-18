import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addTuteur, listTuteurs, getTuteur, editTuteur, removeTuteur } from "../controllers/tuteurController.js";

const router = express.Router();

router.use(authenticate);

// CRUD Tuteurs accessible aux Admin, Directeur, Secrétaire
router.post("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), addTuteur);
router.get("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), listTuteurs);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), getTuteur);
router.put("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), editTuteur);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeTuteur); // suppression stricte

export default router;
