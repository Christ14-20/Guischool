import { createClasse, getClasses, getClasseById, updateClasse, deleteClasse } from "../services/classeService.js";
import { createAudit } from "../services/auditService.js";

// Créer classe + audit
export const addClasse = async (req, res) => {
  try {
    const data = { ...req.body, createurId: req.user.id };
    const classe = await createClasse(data);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Classe",
      itemId: classe.id,
      details: data,
    });
    res.json(classe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création classe" });
  }
};

// Lister classes
export const listClasses = async (req, res) => {
  const { page, limit, search } = req.query;
  const ecoleId = req.user.ecoleId;
  try {
    const classes = await getClasses({ page: Number(page) || 1, limit: Number(limit) || 10, search: search || "", ecoleId });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération classes" });
  }
};

// Récupérer classe par ID
export const getClasse = async (req, res) => {
  try {
    const classe = await getClasseById(Number(req.params.id));
    if (!classe) return res.status(404).json({ error: "Classe non trouvée" });
    res.json(classe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération classe" });
  }
};

// Mettre à jour classe + audit
export const editClasse = async (req, res) => {
  try {
    const classe = await updateClasse(Number(req.params.id), req.body);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Classe",
      itemId: classe.id,
      details: req.body,
    });
    res.json(classe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour classe" });
  }
};

// Supprimer classe + audit
export const removeClasse = async (req, res) => {
  try {
    const classe = await deleteClasse(Number(req.params.id));
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Classe",
      itemId: classe.id,
      details: null,
    });
    res.json({ message: "Classe désactivée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression classe" });
  }
};
