import express from "express";
import {
  getNotes,
  createNote,
  getNoteByIdController,
  updateNote,
  deleteNote,
  moyenneEleveMatiere,
  moyenneGenerale,
  moyennesParClasse,
} from "../controllers/noteController.js";

const router = express.Router();

router.get("/", getNotes);
router.post("/", createNote);
router.get("/:id", getNoteByIdController);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

// calculs
router.get("/moyenne/eleve/matiere", moyenneEleveMatiere);
router.get("/moyenne/eleve", moyenneGenerale);
router.get("/moyenne/classe", moyennesParClasse);

export default router;
