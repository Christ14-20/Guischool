"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useParams, usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  app: "App",
  superadmin: "Super Admin",
  dashboard: "Dashboard",
  pedagogie: "Pedagogie",
  students: "Eleves",
  grades: "Notes",
  finance: "Finance",
  support: "Support",
  settings: "Parametres",
  schools: "Ecoles",
  plans: "Plans",
  users: "Utilisateurs",
  logs: "Logs",
  alerts: "Alertes",
};

function prettyLabel(segment: string) {
  return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, " ");
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "fr";

  const pathWithoutLocale = pathname.replace(/^\/(fr|en)/, "");
  const segments = pathWithoutLocale.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${locale}/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;

          return (
            <Fragment key={`crumb-${segment}-${index}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{prettyLabel(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>
                    {prettyLabel(segment)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
