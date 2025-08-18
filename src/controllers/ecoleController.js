import {
  createEcole,
  getEcoles,
  getEcoleById,
  updateEcole,
  deleteEcole,
} from "../services/ecoleService.js";
import { createAudit } from "../services/auditService.js";

// Créer école + audit
export const addEcole = async (req, res) => {
  try {
    const ecole = await createEcole(req.body);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Ecole",
      itemId: ecole.id,
      details: req.body,
    });
    res.json(ecole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création école" });
  }
};

// Lister écoles
export const listEcoles = async (req, res) => {
  const { page, limit, search } = req.query;
  try {
    const ecoles = await getEcoles({ page: Number(page) || 1, limit: Number(limit) || 10, search: search || "" });
    res.json(ecoles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération écoles" });
  }
};

// Récupérer école par ID
export const getEcole = async (req, res) => {
  try {
    const ecole = await getEcoleById(Number(req.params.id));
    if (!ecole) return res.status(404).json({ error: "École non trouvée" });
    res.json(ecole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération école" });
  }
};

// Mettre à jour école + audit
export const editEcole = async (req, res) => {
  try {
    const ecole = await updateEcole(Number(req.params.id), req.body);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Ecole",
      itemId: ecole.id,
      details: req.body,
    });
    res.json(ecole);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour école" });
  }
};

// Désactiver école + audit
export const removeEcole = async (req, res) => {
  try {
    const ecole = await deleteEcole(Number(req.params.id));
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Ecole",
      itemId: ecole.id,
      details: null,
    });
    res.json({ message: "École désactivée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression école" });
  }
};
