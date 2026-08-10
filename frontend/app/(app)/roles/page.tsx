/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getBackendClient } from "@/lib/api/client";
import { Plus, ShieldCheck, Lock, Users } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface RoleItem {
  id: string;
  name: string;
  label: string;
  description: string;
  permissions: string[];
  is_base: boolean;
  staff_count: number;
}

export default async function RolesPage() {
  const session = await auth();
  const permissions: string[] = (session as any)?.user?.permissions ?? [];
  if (!hasPermission(permissions, PERMISSIONS.ROLES_READ)) {
    return <AccessDenied message="Vous n'avez pas la permission de consulter les rôles." />;
  }
  const canCreate = hasPermission(permissions, PERMISSIONS.ROLES_CREATE);

  let roles: RoleItem[] = [];
  let errorMsg: string | null = null;

  try {
    const client = await getBackendClient();
    const resp = await client.get("/auth/roles/");
    if (resp.data?.status === "success") {
      roles = resp.data.data.results ?? [];
    }
  } catch {
    errorMsg = "Impossible de charger la liste des rôles.";
  }

  const baseRoles = roles.filter((r) => r.is_base);
  const customRoles = roles.filter((r) => !r.is_base);

  const RoleCard = ({ role }: { role: RoleItem }) => (
    <Link
      href={`/roles/${role.id}`}
      className="block border border-line bg-card rounded-xl p-5 shadow-[var(--shadow)] hover:border-accent-line transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {role.is_base ? (
            <Lock className="size-3.5 text-text-faint shrink-0" />
          ) : (
            <ShieldCheck className="size-3.5 text-accent shrink-0" />
          )}
          <h3 className="font-serif text-[15px] font-medium">{role.label || role.name}</h3>
        </div>
      </div>
      {role.description && (
        <p className="text-xs text-text-faint mb-3 line-clamp-2">{role.description}</p>
      )}
      <div className="flex items-center gap-4 text-[11px] text-text-faint">
        <span>{role.permissions.length} permission{role.permissions.length > 1 ? "s" : ""}</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" />
          {role.staff_count} membre{role.staff_count > 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-paper text-text">
      <div className="flex items-start justify-between px-11 pt-9 pb-[22px]">
        <div>
          <h1 className="font-serif text-[26px] font-medium m-0 mb-1.5">Rôles</h1>
          <p className="m-0 text-text-soft text-[13.5px]">
            Gérez les permissions des rôles de base et créez des rôles personnalisés.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/roles/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white text-[13px] font-semibold px-4 py-2.5 hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Nouveau rôle
          </Link>
        )}
      </div>

      <div className="px-11 pb-12 space-y-8">
        {errorMsg && (
          <div className="p-4 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Rôles de base
          </h2>
          <p className="text-xs text-text-faint -mt-2">
            Nom fixe — seules les permissions attachées sont modifiables.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {baseRoles.map((role) => <RoleCard key={role.id} role={role} />)}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-[10.5px] font-semibold text-text-faint uppercase tracking-[.08em]">
            Rôles personnalisés
          </h2>
          {customRoles.length === 0 ? (
            <div className="p-8 text-center text-text-faint border border-line bg-card rounded-xl">
              Aucun rôle personnalisé pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customRoles.map((role) => <RoleCard key={role.id} role={role} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
