import { createEleve, getEleves, getEleveById, updateEleve, deleteEleve } from "../services/eleveService.js";
import { createAudit } from "../services/auditService.js";

// Créer élève + audit
export const addEleve = async (req, res) => {
  try {
    const data = { ...req.body, ecoleId: req.user.ecoleId };
    const eleve = await createEleve(data);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Eleve",
      itemId: eleve.id,
      details: data,
    });
    res.json(eleve);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création élève" });
  }
};

// Lister élèves
export const listEleves = async (req, res) => {
  const { page, limit, search } = req.query;
  const ecoleId = req.user.ecoleId;
  try {
    const eleves = await getEleves({ page: Number(page) || 1, limit: Number(limit) || 10, search: search || "", ecoleId });
    res.json(eleves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération élèves" });
  }
};

// Récupérer élève par ID
export const getEleve = async (req, res) => {
  try {
    const eleve = await getEleveById(Number(req.params.id));
    if (!eleve || eleve.deletedAt) return res.status(404).json({ error: "Élève non trouvé" });
    res.json(eleve);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération élève" });
  }
};

// Mettre à jour élève + audit
export const editEleve = async (req, res) => {
  try {
    const eleve = await updateEleve(Number(req.params.id), req.body);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Eleve",
      itemId: eleve.id,
      details: req.body,
    });
    res.json(eleve);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour élève" });
  }
};

// Supprimer élève (soft delete) + audit
export const removeEleve = async (req, res) => {
  try {
    const eleve = await deleteEleve(Number(req.params.id));
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Eleve",
      itemId: eleve.id,
      details: null,
    });
    res.json({ message: "Élève supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression élève" });
  }
};
