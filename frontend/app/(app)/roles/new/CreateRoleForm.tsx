/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, ShieldCheck, Check, Loader2 } from "lucide-react";
import { createRoleAction } from "../actions";

interface PermissionCatalogItem {
  codename: string;
  name: string;
  module: string;
}

interface Props {
  permissionsCatalog: PermissionCatalogItem[];
}

const inputClass =
  "w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function CreateRoleForm({ permissionsCatalog }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<any>({});

  const permissionsByModule = permissionsCatalog.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {} as Record<string, PermissionCatalogItem[]>);

  const togglePermission = (codename: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(codename) ? prev.filter((c) => c !== codename) : [...prev, codename]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    if (!label.trim()) {
      setFieldErrors({ label: ["Le nom du rôle est obligatoire."] });
      return;
    }

    startTransition(async () => {
      const res = await createRoleAction({ label, description, permissions: selectedPermissions });
      if (res.success) {
        router.push(`/roles/${res.data.id}`);
      } else {
        setErrorMsg(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto border border-line bg-card rounded-2xl p-8 shadow-[var(--shadow)] space-y-6">
      <div className="flex items-center justify-between border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-6 text-accent" />
          <h2 className="font-serif text-xl font-medium">Nouveau rôle personnalisé</h2>
        </div>
        <Link
          href="/roles"
          className="inline-flex items-center gap-1.5 text-xs text-text-soft hover:text-accent transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
              Nom du rôle *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Surveillant général"
              className={inputClass}
            />
            {fieldErrors.label && <p className="text-xs text-danger">{fieldErrors.label[0]}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionnel"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em] border-l-2 border-accent pl-2">
            Permissions
          </h3>
          {permissionsCatalog.length === 0 ? (
            <p className="text-xs text-text-faint">Catalogue des permissions indisponible.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-[10.5px] text-text-faint uppercase tracking-[.08em] mb-2">{module}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {perms.map((p) => {
                      const isSelected = selectedPermissions.includes(p.codename);
                      return (
                        <button
                          key={p.codename}
                          type="button"
                          onClick={() => togglePermission(p.codename)}
                          title={p.name}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent-soft border-accent-line text-accent"
                              : "bg-paper-alt border-line text-text-faint hover:border-accent-line"
                          }`}
                        >
                          <span
                            className={`size-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected ? "bg-accent border-accent" : "border-line"
                            }`}
                          >
                            {isSelected && <Check className="size-3 text-white" />}
                          </span>
                          <span className="text-xs font-medium truncate">{p.codename}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-line">
          <Link
            href="/roles"
            className="px-5 py-2.5 bg-paper-alt border border-line hover:border-accent-line text-text font-medium rounded-xl text-sm transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:opacity-90 text-white font-medium rounded-xl text-sm transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Créer le rôle
          </button>
        </div>
      </form>
    </div>
  );
}
