import { auth } from './auth';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Routes protégées et leurs rôles autorisés (sans préfixe de locale)
const ROUTE_PERMISSIONS: { pattern: RegExp; roles: string[] }[] = [
  { pattern: /^\/superadmin(\/.*)?$/, roles: ['SUPER_ADMIN'] },
  { pattern: /^\/app\/settings(\/.*)?$/, roles: ['ADMIN_SCHOOL'] },
  { pattern: /^\/app\/year-end(\/.*)?$/, roles: ['ADMIN_SCHOOL'] },
  { pattern: /^\/app\/finance(\/.*)?$/, roles: ['ADMIN_SCHOOL', 'SECRETAIRE'] },
  { pattern: /^\/app\/students\/new$/, roles: ['ADMIN_SCHOOL', 'SECRETAIRE'] },
  { pattern: /^\/app\/grades\/bulk(\/.*)?$/, roles: ['ADMIN_SCHOOL', 'SECRETAIRE'] },
  // Route générique /app/* : tout utilisateur authentifié
  { pattern: /^\/app(\/.*)?$/, roles: ['SUPER_ADMIN', 'ADMIN_SCHOOL', 'SECRETAIRE', 'ENSEIGNANT', 'PARENT'] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extraire le chemin sans le préfixe de locale (/fr, /en)
  const localePrefix = /^\/(fr|en)/;
  const pathWithoutLocale = pathname.replace(localePrefix, '') || '/';

  console.log(`[Middleware] Pathname: ${pathname} | WithoutLocale: ${pathWithoutLocale}`);

  // Vérifier si c'est une route protégée
  const matchedRoute = ROUTE_PERMISSIONS.find(({ pattern }) =>
    pattern.test(pathWithoutLocale)
  );

  if (matchedRoute) {
    const session = await auth();

    // Pas de session → redirection vers la page de login
    if (!session) {
      const locale = pathname.match(localePrefix)?.[1] ?? 'fr';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Rôle non autorisé → 403
    const userRole = session.user?.role as string;
    if (!matchedRoute.roles.includes(userRole)) {
      const locale = pathname.match(localePrefix)?.[1] ?? 'fr';
      return NextResponse.redirect(new URL(`/${locale}/403`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*'],
};
