/*
  Warnings:

  - The `justification` column on the `Absence` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[eleveId,matiereId,date]` on the table `Absence` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Absence" ADD COLUMN     "justified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ABSENT',
DROP COLUMN "justification",
ADD COLUMN     "justification" TEXT;

-- DropEnum
DROP TYPE "public"."AbsenceJustification";

-- CreateIndex
CREATE INDEX "idx_absences_date" ON "public"."Absence"("date");

-- CreateIndex
CREATE INDEX "idx_absences_eleve_date" ON "public"."Absence"("eleveId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_absence_eleve_matiere_date" ON "public"."Absence"("eleveId", "matiereId", "date");

-- CreateIndex
CREATE INDEX "idx_note_eleve_matiere_date" ON "public"."Note"("eleveId", "matiereId", "date");

-- CreateIndex
CREATE INDEX "idx_paiements_ecole_date" ON "public"."Paiement"("ecoleId", "date");

-- CreateIndex
CREATE INDEX "idx_paiements_eleve_date" ON "public"."Paiement"("eleveId", "date");

-- CreateIndex
CREATE INDEX "idx_paiements_statut" ON "public"."Paiement"("statut");
