-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'DIRECTEUR', 'SECRETAIRE', 'COMPTABLE', 'ENSEIGNANT', 'PERSONNEL');

-- CreateEnum
CREATE TYPE "public"."EleveStatus" AS ENUM ('ACTIF', 'TRANSFERE', 'ABANDONNE', 'DIPLOME');

-- CreateEnum
CREATE TYPE "public"."PaiementStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AbsenceJustification" AS ENUM ('JUSTIFIE', 'NON_JUSTIFIE');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INFO', 'ALERT', 'WARNING');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "public"."Ecole" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "niveauDisponible" TEXT,
    "bareme" TEXT,
    "horaires" TEXT,
    "optionsPaiement" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ecole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordInitial" BOOLEAN NOT NULL DEFAULT true,
    "ecoleId" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "permissionsDynamiques" JSONB,
    "dernierLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Classe" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "filiere" TEXT,
    "capacite" INTEGER,
    "ecoleId" INTEGER NOT NULL,
    "createurId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Setting" (
    "id" SERIAL NOT NULL,
    "ecoleId" INTEGER NOT NULL,
    "parametre" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tarif" DOUBLE PRECISION,
    "ecoleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "createurId" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cantine" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "repas" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "ecoleId" INTEGER NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cantine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Eleve" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "classeId" INTEGER NOT NULL,
    "ecoleId" INTEGER NOT NULL,
    "tuteurId" INTEGER,
    "status" "public"."EleveStatus" NOT NULL DEFAULT 'ACTIF',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Eleve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tuteur" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tuteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Paiement" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "modePaiement" TEXT NOT NULL,
    "referencePaiement" TEXT NOT NULL,
    "effectueParId" INTEGER NOT NULL,
    "statut" "public"."PaiementStatus" NOT NULL,
    "comptableId" INTEGER,
    "ecoleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Note" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "note" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "enseignantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Matiere" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "classeId" INTEGER NOT NULL,
    "coef" DOUBLE PRECISION NOT NULL,
    "enseignantId" INTEGER NOT NULL,
    "ecoleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Absence" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "matiereId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "justification" "public"."AbsenceJustification" NOT NULL,
    "enseignantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Audit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "details" JSONB,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "expediteurId" INTEGER NOT NULL,
    "destinataireId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerEvent" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" SERIAL NOT NULL,
    "eleveId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "fichierUrl" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Personnel" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ecoleId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemLog" (
    "id" SERIAL NOT NULL,
    "erreur" TEXT NOT NULL,
    "stacktrace" TEXT,
    "niveau" "public"."LogLevel" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_referencePaiement_key" ON "public"."Paiement"("referencePaiement");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Classe" ADD CONSTRAINT "Classe_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Classe" ADD CONSTRAINT "Classe_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Setting" ADD CONSTRAINT "Setting_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cantine" ADD CONSTRAINT "Cantine_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Eleve" ADD CONSTRAINT "Eleve_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "public"."Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Eleve" ADD CONSTRAINT "Eleve_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Eleve" ADD CONSTRAINT "Eleve_tuteurId_fkey" FOREIGN KEY ("tuteurId") REFERENCES "public"."Tuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_effectueParId_fkey" FOREIGN KEY ("effectueParId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "public"."Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Matiere" ADD CONSTRAINT "Matiere_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "public"."Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Matiere" ADD CONSTRAINT "Matiere_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Matiere" ADD CONSTRAINT "Matiere_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Absence" ADD CONSTRAINT "Absence_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Absence" ADD CONSTRAINT "Absence_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "public"."Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Absence" ADD CONSTRAINT "Absence_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Audit" ADD CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_expediteurId_fkey" FOREIGN KEY ("expediteurId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "public"."Eleve"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Personnel" ADD CONSTRAINT "Personnel_ecoleId_fkey" FOREIGN KEY ("ecoleId") REFERENCES "public"."Ecole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
