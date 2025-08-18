import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { addClasse, listClasses, getClasse, editClasse, removeClasse } from "../controllers/classeController.js";

const router = express.Router();

router.use(authenticate);

// CRUD Classes accessible aux Admin, Directeur, Secrétaire
router.post("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), addClasse);
router.get("/", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), listClasses);
router.get("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), getClasse);
router.put("/:id", authorize("ADMIN", "DIRECTEUR", "SECRETAIRE"), editClasse);
router.delete("/:id", authorize("ADMIN", "DIRECTEUR"), removeClasse); // suppression stricte pour Admin/Directeur

export default router;
