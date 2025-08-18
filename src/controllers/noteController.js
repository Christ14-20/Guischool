import { createNoteSchema, updateNoteSchema } from "../validation/noteSchema.js";
import {
  createNote as createNoteService,
  getNotes as getNotesService,
  getNoteById,
  updateNote as updateNoteService,
  deleteNote as deleteNoteService,
  moyenneEleveParMatiere,
  moyenneGeneraleEleve,
  moyennesClasse,
} from "../services/noteService.js";
import { createAudit } from "../services/auditService.js";

// ✅ Créer une note
export const createNote = async (req, res) => {
  try {
    const payload = createNoteSchema.parse(req.body);
    const note = await createNoteService(payload, req.user);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Note",
      itemId: note.id,
      details: payload,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

// ✅ Lister les notes
export const getNotes = async (req, res) => {
  try {
    const { page, limit, eleveId, matiereId, classeId, dateFrom, dateTo } =
      req.query;
    const data = await getNotesService({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      ecoleId: req.user.ecoleId,
      eleveId,
      matiereId,
      classeId,
      dateFrom,
      dateTo,
    });
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur récupération notes" });
  }
};

// ✅ Récupérer une note
export const getNoteByIdController = async (req, res) => {
  try {
    const note = await getNoteById(Number(req.params.id), req.user.ecoleId);
    if (!note) return res.status(404).json({ error: "Note non trouvée" });
    res.json(note);
  } catch {
    res.status(500).json({ error: "Erreur récupération note" });
  }
};

// ✅ Modifier une note
export const updateNote = async (req, res) => {
  try {
    const payload = updateNoteSchema.parse(req.body);
    const note = await updateNoteService(
      Number(req.params.id),
      payload,
      req.user.ecoleId
    );
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Note",
      itemId: note.id,
      details: payload,
    });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

// ✅ Supprimer une note
export const deleteNote = async (req, res) => {
  try {
    const note = await deleteNoteService(Number(req.params.id), req.user.ecoleId);
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Note",
      itemId: note.id,
      details: null,
    });
    res.json({ message: "Note supprimée" });
  } catch {
    res.status(500).json({ error: "Erreur suppression note" });
  }
};

// --- Endpoints de calcul ---
// ✅ Moyenne élève par matière
export const moyenneEleveMatiere = async (req, res) => {
  try {
    const { eleveId, matiereId, dateFrom, dateTo } = req.query;
    const data = await moyenneEleveParMatiere({
      eleveId: Number(eleveId),
      matiereId: Number(matiereId),
      dateFrom,
      dateTo,
      ecoleId: req.user.ecoleId,
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Moyenne générale élève
export const moyenneGenerale = async (req, res) => {
  try {
    const { eleveId, dateFrom, dateTo } = req.query;
    const data = await moyenneGeneraleEleve({
      eleveId: Number(eleveId),
      dateFrom,
      dateTo,
      ecoleId: req.user.ecoleId,
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Moyennes d'une classe
export const moyennesParClasse = async (req, res) => {
  try {
    const { classeId, dateFrom, dateTo } = req.query;
    const data = await moyennesClasse({
      classeId: Number(classeId),
      dateFrom,
      dateTo,
      ecoleId: req.user.ecoleId,
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
