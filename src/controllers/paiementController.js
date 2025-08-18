import { createPaiementSchema, updatePaiementSchema } from "../validation/paiementSchema.js";
import { createPaiement, getPaiements, getPaiementById, updatePaiement, cancelPaiement } from "../services/paiementService.js";
import { createAudit } from "../services/auditService.js";

// POST /api/paiements
export const addPaiement = async (req, res) => {
  try {
    const parsed = createPaiementSchema.parse(req.body);
    const paiement = await createPaiement(parsed, req.user);
    await createAudit({
      userId: req.user.id,
      action: "CREATE",
      tableName: "Paiement",
      itemId: paiement.id,
      details: { ...parsed, reference: paiement.referencePaiement },
    });
    res.status(201).json(paiement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err?.issues || err.message || "Erreur création paiement" });
  }
};

// GET /api/paiements
export const listPaiements = async (req, res) => {
  try {
    const { page, limit, search, eleveId, statut, mode, dateFrom, dateTo } = req.query;
    const data = await getPaiements({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search: search || "",
      filters: { eleveId, statut, mode, dateFrom, dateTo },
      ecoleId: req.user.ecoleId,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération paiements" });
  }
};

// GET /api/paiements/:id
export const getPaiement = async (req, res) => {
  try {
    const paiement = await getPaiementById(Number(req.params.id), req.user.ecoleId);
    if (!paiement) return res.status(404).json({ error: "Paiement non trouvé" });
    res.json(paiement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération paiement" });
  }
};

// PUT /api/paiements/:id
export const editPaiement = async (req, res) => {
  try {
    const parsed = updatePaiementSchema.parse(req.body);
    const paiement = await updatePaiement(Number(req.params.id), parsed, req.user.ecoleId);
    await createAudit({
      userId: req.user.id,
      action: "UPDATE",
      tableName: "Paiement",
      itemId: paiement.id,
      details: parsed,
    });
    res.json(paiement);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err?.issues || err.message || "Erreur mise à jour paiement" });
  }
};

// DELETE /api/paiements/:id  (annulation)
export const removePaiement = async (req, res) => {
  try {
    const paiement = await cancelPaiement(Number(req.params.id), req.user.ecoleId);
    await createAudit({
      userId: req.user.id,
      action: "DELETE",
      tableName: "Paiement",
      itemId: paiement.id,
      details: { previousStatus: paiement.statut, newStatus: "FAILED" },
    });
    res.json({ message: "Paiement annulé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur annulation paiement" });
  }
};
