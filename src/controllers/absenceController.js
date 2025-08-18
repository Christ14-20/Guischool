import { createAbsenceSchema, updateAbsenceSchema, justifyAbsenceSchema } from "../validation/absenceSchema.js";
import { createAbsence, getAbsences, getAbsenceById, updateAbsence, deleteAbsence, justifyAbsence, bulkMarkAbsences } from "../services/absenceService.js";
import { notifyUser } from "../services/notificationService.js";
import { createAudit } from "../services/auditService.js";

// POST
export const addAbsence = async (req, res) => {
  try {
    const payload = createAbsenceSchema.parse(req.body);
    const absence = await createAbsence(payload, req.user);

    // Notification tuteur si disponible
    if (absence.eleve?.tuteurId) {
      const msg = `Absence de ${absence.eleve.prenom} ${absence.eleve.nom} en ${absence.matiere?.nom} le ${new Date(absence.date).toLocaleDateString()}.`;
      await notifyUser({
        expediteurId: req.user.id,
        destinataireId: absence.eleve.tuteurId,
        message: msg,
        type: "ABSENCE",
        triggerEvent: "ABSENCE_CREATED"
      });
    }

    await createAudit({ userId: req.user.id, action: "CREATE", tableName: "Absence", itemId: absence.id, details: payload });
    res.status(201).json(absence);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

// GET list
export const listAbsences = async (req, res) => {
  try {
    const { page, limit, search, eleveId, classeId, matiereId, justified, status, dateFrom, dateTo } = req.query;
    const data = await getAbsences({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      ecoleId: req.user.ecoleId,
      search: search || "",
      eleveId, classeId, matiereId, justified, status, dateFrom, dateTo
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération absences" });
  }
};

// GET one
export const getAbsence = async (req, res) => {
  try {
    const a = await getAbsenceById(Number(req.params.id), req.user.ecoleId);
    if (!a) return res.status(404).json({ error: "Absence non trouvée" });
    res.json(a);
  } catch {
    res.status(500).json({ error: "Erreur récupération absence" });
  }
};

// PUT
export const editAbsence = async (req, res) => {
  try {
    const payload = updateAbsenceSchema.parse(req.body);
    const a = await updateAbsence(Number(req.params.id), payload, req.user.ecoleId);
    await createAudit({ userId: req.user.id, action: "UPDATE", tableName: "Absence", itemId: a.id, details: payload });
    res.json(a);
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

// PATCH justify
export const justify = async (req, res) => {
  try {
    const { justificationText } = justifyAbsenceSchema.parse({ ...req.body, justified: true });
    const a = await justifyAbsence(Number(req.params.id), justificationText, req.user.ecoleId);
    await createAudit({ userId: req.user.id, action: "UPDATE", tableName: "Absence", itemId: a.id, details: { justified: true, justificationText } });
    res.json({ message: "Absence justifiée", absence: a });
  } catch (err) {
    res.status(400).json({ error: err?.issues || err.message });
  }
};

// DELETE
export const removeAbsence = async (req, res) => {
  try {
    const a = await deleteAbsence(Number(req.params.id), req.user.ecoleId);
    await createAudit({ userId: req.user.id, action: "DELETE", tableName: "Absence", itemId: a.id, details: null });
    res.json({ message: "Absence supprimée" });
  } catch {
    res.status(500).json({ error: "Erreur suppression absence" });
  }
};

// POST bulk
export const bulkCreate = async (req, res) => {
  try {
    const { classeId, matiereId, date, elevesIds } = req.body;
    if (!classeId || !matiereId || !date) return res.status(400).json({ error: "classeId, matiereId et date sont requis" });

    const results = await bulkMarkAbsences({
      classeId: Number(classeId),
      matiereId: Number(matiereId),
      date: new Date(date),
      elevesIds: Array.isArray(elevesIds) ? elevesIds.map(Number) : undefined,
      enseignantId: req.user.id,
      ecoleId: req.user.ecoleId
    });

    await createAudit({ userId: req.user.id, action: "CREATE", tableName: "Absence", itemId: 0, details: { bulk: true, classeId, matiereId, date } });
    res.json({ message: "Marquage en masse terminé", results });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
