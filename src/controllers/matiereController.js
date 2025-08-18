import { createMatiereSchema, updateMatiereSchema } from "../validation/matiereSchema.js";
import { createMatiere, getMatieres, getMatiereById, updateMatiere, deleteMatiere } from "../services/matiereService.js";
import { createAudit } from "../services/auditService.js";

export const addMatiere = async (req, res) => {
  try {
    const payload = createMatiereSchema.parse({ ...req.body, ecoleId: req.user.ecoleId });
    const matiere = await createMatiere(payload);
    await createAudit({ userId: req.user.id, action: "CREATE", tableName: "Matiere", itemId: matiere.id, details: payload });
    res.status(201).json(matiere);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

export const listMatieres = async (req, res) => {
  try {
    const { page, limit, search, classeId } = req.query;
    const data = await getMatieres({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search: search || "",
      classeId,
      ecoleId: req.user.ecoleId
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération matières" });
  }
};

export const getMatiere = async (req, res) => {
  try {
    const m = await getMatiereById(Number(req.params.id), req.user.ecoleId);
    if (!m) return res.status(404).json({ error: "Matière non trouvée" });
    res.json(m);
  } catch {
    res.status(500).json({ error: "Erreur récupération matière" });
  }
};

export const editMatiere = async (req, res) => {
  try {
    const payload = updateMatiereSchema.parse(req.body);
    const m = await updateMatiere(Number(req.params.id), payload, req.user.ecoleId);
    await createAudit({ userId: req.user.id, action: "UPDATE", tableName: "Matiere", itemId: m.id, details: payload });
    res.json(m);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

export const removeMatiere = async (req, res) => {
  try {
    const m = await deleteMatiere(Number(req.params.id), req.user.ecoleId);
    await createAudit({ userId: req.user.id, action: "DELETE", tableName: "Matiere", itemId: m.id, details: null });
    res.json({ message: "Matière supprimée" });
  } catch {
    res.status(500).json({ error: "Erreur suppression matière" });
  }
};
