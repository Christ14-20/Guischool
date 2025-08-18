import { createTuteur, getTuteurs, getTuteurById, updateTuteur, deleteTuteur } from "../services/tuteurService.js";
import { createAudit } from "../services/auditService.js";

// Créer tuteur + audit
export const addTuteur = async (req, res) => {
  try {
    const tuteur = await createTuteur(req.body);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Tuteur",
      itemId: tuteur.id,
      details: req.body,
    });
    res.json(tuteur);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création tuteur" });
  }
};

// Lister tuteurs
export const listTuteurs = async (req, res) => {
  const { page, limit, search } = req.query;
  try {
    const tuteurs = await getTuteurs({ page: Number(page) || 1, limit: Number(limit) || 10, search: search || "" });
    res.json(tuteurs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération tuteurs" });
  }
};

// Récupérer tuteur par ID
export const getTuteur = async (req, res) => {
  try {
    const tuteur = await getTuteurById(Number(req.params.id));
    if (!tuteur) return res.status(404).json({ error: "Tuteur non trouvé" });
    res.json(tuteur);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération tuteur" });
  }
};

// Mettre à jour tuteur + audit
export const editTuteur = async (req, res) => {
  try {
    const tuteur = await updateTuteur(Number(req.params.id), req.body);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Tuteur",
      itemId: tuteur.id,
      details: req.body,
    });
    res.json(tuteur);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour tuteur" });
  }
};

// Supprimer tuteur + audit
export const removeTuteur = async (req, res) => {
  try {
    const tuteur = await deleteTuteur(Number(req.params.id));
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Tuteur",
      itemId: tuteur.id,
      details: null,
    });
    res.json({ message: "Tuteur supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression tuteur" });
  }
};
