import { PrismaClient } from "@prisma/client";
import { createObjectCsvStringifier } from "csv-writer";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

// CSV export for paiements
export const exportPaiementsCSV = async (req, res) => {
  try {
    const { dateFrom, dateTo, statut } = req.query;
    const where = { ecoleId: req.user.ecoleId };
    if (statut) where.statut = statut;
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);

    const items = await prisma.paiement.findMany({
      where,
      include: { eleve: true, effectuePar: true }
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "referencePaiement", title: "Reference" },
        { id: "date", title: "Date" },
        { id: "eleve", title: "Eleve" },
        { id: "type", title: "Type" },
        { id: "montant", title: "Montant" },
        { id: "modePaiement", title: "Mode" },
        { id: "statut", title: "Statut" },
        { id: "effectuePar", title: "EffectuePar" }
      ]
    });

    const records = items.map(i => ({
      referencePaiement: i.referencePaiement,
      date: i.date.toISOString(),
      eleve: i.eleve ? `${i.eleve.nom} ${i.eleve.prenom}` : "",
      type: i.type,
      montant: i.montant,
      modePaiement: i.modePaiement,
      statut: i.statut,
      effectuePar: i.effectuePar ? `${i.effectuePar.nom} ${i.effectuePar.prenom}` : ""
    }));

    const header = csvStringifier.getHeaderString();
    const body = csvStringifier.stringifyRecords(records);
    const csv = header + body;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="paiements_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Excel export for paiements
export const exportPaiementsExcel = async (req, res) => {
  try {
    const { dateFrom, dateTo, statut } = req.query;
    const where = { ecoleId: req.user.ecoleId };
    if (statut) where.statut = statut;
    if (dateFrom || dateTo) where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);

    const items = await prisma.paiement.findMany({
      where,
      include: { eleve: true, effectuePar: true }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Paiements");

    sheet.columns = [
      { header: "Reference", key: "ref", width: 25 },
      { header: "Date", key: "date", width: 25 },
      { header: "Eleve", key: "eleve", width: 30 },
      { header: "Type", key: "type", width: 20 },
      { header: "Montant", key: "montant", width: 15 },
      { header: "Mode", key: "mode", width: 20 },
      { header: "Statut", key: "statut", width: 15 },
      { header: "Effectué par", key: "par", width: 25 }
    ];

    items.forEach(i =>
      sheet.addRow({
        ref: i.referencePaiement,
        date: i.date.toISOString(),
        eleve: i.eleve ? `${i.eleve.nom} ${i.eleve.prenom}` : "",
        type: i.type,
        montant: i.montant,
        mode: i.modePaiement,
        statut: i.statut,
        par: i.effectuePar ? `${i.effectuePar.nom} ${i.effectuePar.prenom}` : ""
      })
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="paiements_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
