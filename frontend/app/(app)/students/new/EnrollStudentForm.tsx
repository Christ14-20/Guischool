/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { UserPlus, Users, AlertTriangle, Loader2, Check } from "lucide-react";
import { enrollStudentAction } from "../actions";

interface Props {
  classes: { id: string; name: string; school_year?: string }[];
  schoolYears: { id: string; label: string; status?: string }[];
}

const schema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  prenom: z.string().min(1, "Le prénom est obligatoire"),
  date_naissance: z.string().min(1, "La date de naissance est obligatoire"),
  lieu_naissance: z.string().optional(),
  sexe: z.enum(["M", "F"], { message: "Le sexe est obligatoire" }),
  classe_id: z.string().min(1, "La classe est obligatoire"),
  school_year_id: z.string().min(1, "L'année scolaire est obligatoire"),
  type_inscription: z.enum([
    "NOUVELLE_INSCRIPTION",
    "REINSCRIPTION",
    "TRANSFERT_ENTRANT",
  ]),
  guardian_lien: z.enum(["PERE", "MERE", "TUTEUR", "AUTRE"], {
    message: "Le lien de parenté est obligatoire",
  }),
  guardian_nom_complet: z.string().min(1, "Le nom du responsable est obligatoire"),
  guardian_telephone: z
    .string()
    .regex(/^\+224\d{9}$/, "Format attendu : +224XXXXXXXXX"),
  guardian_email: z.string().email("Email invalide").optional().or(z.literal("")),
  guardian_is_contact_urgence: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors";

export default function EnrollStudentForm({ classes, schoolYears }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type_inscription: "NOUVELLE_INSCRIPTION",
      guardian_lien: "MERE",
      guardian_is_contact_urgence: true,
    },
  });

  const buildPayload = (v: FormValues) => ({
    nom: v.nom,
    prenom: v.prenom,
    date_naissance: v.date_naissance,
    lieu_naissance: v.lieu_naissance || "",
    sexe: v.sexe,
    classe_id: v.classe_id,
    school_year_id: v.school_year_id,
    type_inscription: v.type_inscription,
    guardian: {
      lien: v.guardian_lien,
      nom_complet: v.guardian_nom_complet,
      telephone: v.guardian_telephone,
      email: v.guardian_email || "",
      is_contact_urgence: v.guardian_is_contact_urgence,
    },
  });

  const submit = (force: boolean) => {
    setServerError(null);
    const values = getValues();
    startTransition(async () => {
      const res = await enrollStudentAction(buildPayload(values), force);
      if (res.success) {
        router.push(`/students/${res.data.id}`);
        return;
      }
      if (res.status === 409 && res.errors?.duplicate_candidate) {
        setDuplicateWarning(res.errors.duplicate_candidate);
        return;
      }
      setServerError(res.error);
    });
  };

  const onValid = () => submit(false);

  return (
    <div className="max-w-3xl mx-auto bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <UserPlus className="size-6 text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Inscription d&apos;un élève</h1>
      </div>

      {serverError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertTriangle className="size-5" />
            Un élève similaire existe déjà
          </div>
          <p className="text-xs text-slate-400">
            Matricule <span className="font-mono text-slate-200">{duplicateWarning.matricule}</span> —
            {" "}
            {duplicateWarning.similarity}. Confirmez-vous la création malgré tout ?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDuplicateWarning(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => submit(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Créer quand même
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onValid)} className="space-y-6">
        {/* Identité */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Identité
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Nom *</label>
              <input {...register("nom")} className={inputClass} placeholder="Camara" />
              {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Prénom *</label>
              <input {...register("prenom")} className={inputClass} placeholder="Fatoumata" />
              {errors.prenom && <p className="text-xs text-destructive">{errors.prenom.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Date de naissance *</label>
              <input type="date" {...register("date_naissance")} className={inputClass} />
              {errors.date_naissance && (
                <p className="text-xs text-destructive">{errors.date_naissance.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Lieu de naissance</label>
              <input {...register("lieu_naissance")} className={inputClass} placeholder="Kindia" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Sexe *</label>
              <select {...register("sexe")} className={inputClass} defaultValue="">
                <option value="">Sélectionner...</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
              {errors.sexe && <p className="text-xs text-destructive">{errors.sexe.message}</p>}
            </div>
          </div>
        </section>

        {/* Scolarité */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2">
            Scolarité
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Année scolaire *</label>
              <select {...register("school_year_id")} className={inputClass} defaultValue="">
                <option value="">Sélectionner...</option>
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.label}
                  </option>
                ))}
              </select>
              {errors.school_year_id && (
                <p className="text-xs text-destructive">{errors.school_year_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Classe *</label>
              <select {...register("classe_id")} className={inputClass} defaultValue="">
                <option value="">Sélectionner...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.classe_id && (
                <p className="text-xs text-destructive">{errors.classe_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Type d&apos;inscription *</label>
              <select {...register("type_inscription")} className={inputClass}>
                <option value="NOUVELLE_INSCRIPTION">Nouvelle inscription</option>
                <option value="REINSCRIPTION">Réinscription</option>
                <option value="TRANSFERT_ENTRANT">Transfert entrant</option>
              </select>
            </div>
          </div>
        </section>

        {/* Responsable */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-l-2 border-indigo-500 pl-2 flex items-center gap-2">
            <Users className="size-4" /> Responsable légal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Lien de parenté *</label>
              <select {...register("guardian_lien")} className={inputClass}>
                <option value="PERE">Père</option>
                <option value="MERE">Mère</option>
                <option value="TUTEUR">Tuteur</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Nom complet *</label>
              <input
                {...register("guardian_nom_complet")}
                className={inputClass}
                placeholder="Mariama Camara"
              />
              {errors.guardian_nom_complet && (
                <p className="text-xs text-destructive">{errors.guardian_nom_complet.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Téléphone *</label>
              <input
                {...register("guardian_telephone")}
                className={inputClass}
                placeholder="+224655112233"
              />
              {errors.guardian_telephone && (
                <p className="text-xs text-destructive">{errors.guardian_telephone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Email</label>
              <input
                {...register("guardian_email")}
                className={inputClass}
                placeholder="tuteur@email.gn"
              />
              {errors.guardian_email && (
                <p className="text-xs text-destructive">{errors.guardian_email.message}</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
              <input
                type="checkbox"
                {...register("guardian_is_contact_urgence")}
                className="size-4 rounded border-slate-700 bg-slate-950"
              />
              Contact d&apos;urgence
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-4 border-t border-slate-800 pt-6">
          <button
            type="submit"
            disabled={isPending || !!duplicateWarning}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Inscrire l&apos;élève
          </button>
        </div>
      </form>
    </div>
  );
}
