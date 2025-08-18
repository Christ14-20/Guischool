import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addEleve, listEleves, getEleve, editEleve, removeEleve } from "../controllers/eleveController.js";

const router = express.Router();

router.use(authenticate);

// CRUD Élèves accessible aux Admin, Directeur, Secrétaire
router.post("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), addEleve);
router.get("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), listEleves);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), getEleve);
router.put("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), editEleve);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeEleve); // suppression stricte pour Admin/Directeur

export default router;
