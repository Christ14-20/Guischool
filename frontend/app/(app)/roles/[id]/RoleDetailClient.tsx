/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Pencil,
  Check,
  X,
  Loader2,
  Users,
  Trash2,
} from "lucide-react";
import { updateRoleAction, deleteRoleAction } from "../actions";

interface PermissionCatalogItem {
  codename: string;
  name: string;
  module: string;
}

interface RoleData {
  id: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  is_base: boolean;
  staff_count: number;
}

interface Props {
  role: RoleData;
  permissionsCatalog: PermissionCatalogItem[];
  canUpdate?: boolean;
  canDelete?: boolean;
}

// Miroir de role_service.DIRECTOR_PERMISSION_FLOOR (backend) — socle
// anti-verrouillage non retirable sur le rôle DIRECTOR. Dupliqué côté
// front pour l'affichage (chips grisées + cadenas), la vérification
// faisant foi reste côté serveur (rejet 400 si violé).
const DIRECTOR_PERMISSION_FLOOR = new Set(["roles:update", "staff:update", "staff:create"]);

const inputClass =
  "w-full bg-paper-alt border border-line rounded-lg px-4 py-2.5 text-sm text-text placeholder-text-faint outline-none focus:border-accent-line transition-colors";

export default function RoleDetailClient({ role, permissionsCatalog, canUpdate, canDelete }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editingInfo, setEditingInfo] = useState(false);
  const [labelValue, setLabelValue] = useState(role.label);
  const [descriptionValue, setDescriptionValue] = useState(role.description);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [editingPermissions, setEditingPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);
  const [permError, setPermError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const lockedSet = role.name === "DIRECTOR" ? DIRECTOR_PERMISSION_FLOOR : new Set<string>();

  const permissionsByModule = permissionsCatalog.reduce((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {} as Record<string, PermissionCatalogItem[]>);

  const togglePermission = (codename: string) => {
    if (lockedSet.has(codename)) return;
    setSelectedPermissions((prev) =>
      prev.includes(codename) ? prev.filter((c) => c !== codename) : [...prev, codename]
    );
  };

  const handleSavePermissions = () => {
    setPermError(null);
    startTransition(async () => {
      const res = await updateRoleAction(role.id, { permissions: selectedPermissions });
      if (res.success) {
        setEditingPermissions(false);
        router.refresh();
      } else {
        setPermError(res.error);
      }
    });
  };

  const handleSaveInfo = () => {
    setInfoError(null);
    if (!labelValue.trim()) {
      setInfoError("Le nom du rôle est obligatoire.");
      return;
    }
    startTransition(async () => {
      const res = await updateRoleAction(role.id, { label: labelValue, description: descriptionValue });
      if (res.success) {
        setEditingInfo(false);
        router.refresh();
      } else {
        setInfoError(res.error);
      }
    });
  };

  const handleDelete = () => {
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteRoleAction(role.id);
      if (res.success) {
        router.push("/roles");
      } else {
        setDeleteError(res.error);
      }
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* En-tête / identité */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {role.is_base ? (
              <Lock className="size-5 text-text-faint shrink-0" />
            ) : (
              <ShieldCheck className="size-5 text-accent shrink-0" />
            )}
            {editingInfo ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value)}
                  className={inputClass}
                  placeholder="Nom du rôle"
                />
                <input
                  type="text"
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  className={inputClass}
                  placeholder="Description (optionnel)"
                />
              </div>
            ) : (
              <div>
                <h1 className="font-serif text-xl font-medium">{role.label || role.name}</h1>
                {role.description && <p className="text-text-soft text-[13px] mt-0.5">{role.description}</p>}
              </div>
            )}
          </div>
          {!role.is_base && canUpdate && !editingInfo && (
            <button
              onClick={() => {
                setInfoError(null);
                setLabelValue(role.label);
                setDescriptionValue(role.description);
                setEditingInfo(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:opacity-80 cursor-pointer shrink-0"
            >
              <Pencil className="size-3.5" />
              Modifier
            </button>
          )}
        </div>

        {role.is_base && (
          <p className="text-xs text-text-faint">
            Rôle de base — le nom n&apos;est pas modifiable, seules les permissions ci-dessous le sont.
          </p>
        )}

        {infoError && <p className="text-xs text-danger">{infoError}</p>}

        {editingInfo && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveInfo}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Enregistrer
            </button>
            <button
              onClick={() => setEditingInfo(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-xs font-medium transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
              Annuler
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 text-[12.5px] text-text-faint pt-2 border-t border-line">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {role.staff_count} membre{role.staff_count > 1 ? "s" : ""} du personnel
          </span>
        </div>
      </div>

      {/* Permissions */}
      <div className="border border-line bg-card rounded-xl p-6 shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Permissions
          </h3>
          {canUpdate && !editingPermissions && permissionsCatalog.length > 0 && (
            <button
              onClick={() => {
                setPermError(null);
                setSelectedPermissions(role.permissions);
                setEditingPermissions(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:opacity-80 cursor-pointer shrink-0"
            >
              <Pencil className="size-3.5" />
              Modifier
            </button>
          )}
        </div>

        {permissionsCatalog.length === 0 ? (
          <p className="text-xs text-text-faint">Catalogue des permissions indisponible.</p>
        ) : editingPermissions ? (
          <div className="space-y-4">
            {Object.entries(permissionsByModule).map(([module, perms]) => (
              <div key={module}>
                <p className="text-[10.5px] text-text-faint uppercase tracking-[.08em] mb-2">{module}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {perms.map((p) => {
                    const locked = lockedSet.has(p.codename);
                    const isSelected = locked || selectedPermissions.includes(p.codename);
                    return (
                      <button
                        key={p.codename}
                        type="button"
                        disabled={locked}
                        onClick={() => togglePermission(p.codename)}
                        title={locked ? "Socle minimal du rôle DIRECTOR — non retirable" : p.name}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                          locked
                            ? "bg-paper-alt border-line text-text-faint opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-accent-soft border-accent-line text-accent cursor-pointer"
                            : "bg-paper-alt border-line text-text-faint hover:border-accent-line cursor-pointer"
                        }`}
                      >
                        <span
                          className={`size-3.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                            locked ? "bg-paper-alt border-line" : isSelected ? "bg-accent border-accent" : "border-line"
                          }`}
                        >
                          {locked ? (
                            <Lock className="size-2.5 text-text-faint" />
                          ) : (
                            isSelected && <Check className="size-3 text-white" />
                          )}
                        </span>
                        <span className="text-xs font-medium truncate">{p.codename}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {permError && <p className="text-xs text-danger">{permError}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePermissions}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:opacity-90 text-white text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setEditingPermissions(false);
                  setSelectedPermissions(role.permissions);
                  setPermError(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-line text-text-soft hover:border-accent-line hover:text-text text-xs font-medium transition-colors cursor-pointer"
              >
                <X className="size-3.5" />
                Annuler
              </button>
            </div>
          </div>
        ) : role.permissions.length === 0 ? (
          <p className="text-xs text-text-faint">Aucune permission accordée.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {role.permissions.map((code) => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-accent-soft text-accent"
              >
                {lockedSet.has(code) && <Lock className="size-3" />}
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Suppression */}
      {!role.is_base && canDelete && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={role.staff_count > 0}
            title={role.staff_count > 0 ? "Réassignez les membres du personnel avant de supprimer ce rôle." : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ color: "var(--danger)", boxShadow: "inset 0 0 0 1px var(--danger)" }}
          >
            <Trash2 className="size-4" />
            Supprimer ce rôle
          </button>
        </div>
      )}

      {showDeleteModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-line rounded-2xl p-6 w-full max-w-md shadow-[var(--shadow)] space-y-4">
            <div>
              <h3 className="font-serif text-lg font-medium">Supprimer le rôle</h3>
              <p className="text-text-soft text-sm mt-1">
                Voulez-vous vraiment supprimer le rôle <strong>{role.label || role.name}</strong> ? Cette action est irréversible.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg text-xs bg-danger/10 border border-danger/20 text-danger">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-line text-text-soft font-medium text-sm hover:border-accent-line hover:text-text transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50 flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                style={{ background: "var(--danger)" }}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
