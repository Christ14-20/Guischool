import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isAuthRoute = nextUrl.pathname.startsWith("/login");
      const isChangePasswordRoute = nextUrl.pathname.startsWith("/change-password");
      const isSuperAdminRoute = nextUrl.pathname.startsWith("/superadmin");
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mustChangePassword = (auth?.user as any)?.must_change_password;

      // Laisser passer les API routes (NextAuth gère lui-même ses routes,
      // et d'autres APIs peuvent être appelées librement)
      if (isApiRoute) return true;

      if (isAuthRoute) {
        if (isLoggedIn) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const role = (auth as any)?.user?.role;
          if (mustChangePassword) {
            return Response.redirect(new URL("/change-password", nextUrl));
          }
          if (role === "SUPER_ADMIN") {
            return Response.redirect(new URL("/superadmin/dashboard", nextUrl));
          } else {
            return Response.redirect(new URL("/dashboard", nextUrl));
          }
        }
        return true;
      }

      if (!isLoggedIn) {
        return false; // Redirige vers /login
      }

      // Forcer le changement de mot de passe avant tout accès
      if (mustChangePassword && !isChangePasswordRoute) {
        return Response.redirect(new URL("/change-password", nextUrl));
      }

      // Protection par rôle
      if (isSuperAdminRoute) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (auth as any)?.user?.role === "SUPER_ADMIN";
      }

      // Pour toutes les autres routes protégées (/dashboard, etc.)
      return true;
    },
  },
  providers: [], // Configuré dans auth.ts pour éviter les imports de modules Node sur l'Edge runtime
} satisfies NextAuthConfig;
