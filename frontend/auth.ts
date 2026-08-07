import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://localhost:8000/api/v1";

interface JWTToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: any;
  error?: string;
}

/**
 * Tente de rafraîchir l'access_token en appelant l'API Django
 */
function decodeExp(accessToken: string): number {
  // Décode le payload JWT (base64url) sans dépendance Node (compatible Edge)
  const base64 = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(base64);
  const payload = JSON.parse(json);
  return payload.exp * 1000;
}

/**
 * Récupère l'ensemble effectif de permissions (rôle + custom_permissions)
 * de l'utilisateur courant. Source de vérité : GET /auth/permissions/me/
 * (cf. backend/apps/authentication/views.py::PermissionsMeView).
 * N'échoue jamais bruyamment — un tableau vide dégrade gracieusement vers
 * "aucune permission visible" plutôt que de casser la connexion.
 */
async function fetchPermissions(accessToken: string): Promise<string[]> {
  try {
    const response = await fetch(`${DJANGO_API_URL}/auth/permissions/me/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json();
    if (!response.ok || body?.status !== "success") return [];
    return body.data?.permissions ?? [];
  } catch (error) {
    console.error("Erreur lors du chargement des permissions :", error);
    return [];
  }
}

async function refreshAccessToken(token: JWTToken): Promise<JWTToken> {
  try {
    const response = await fetch(`${DJANGO_API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });

    const body = await response.json();
    if (!response.ok || body?.status !== "success") {
      throw new Error(body?.message || "Refresh failed");
    }

    const { access_token } = body.data;

    // Rafraîchi en même temps que le token : les permissions restent à jour
    // au pire toutes les JWT_ACCESS_TOKEN_LIFETIME_MINUTES (15 min par
    // défaut) — même caractéristique de fraîcheur que `role`, déjà acceptée
    // ailleurs dans le projet (cf. StaffViewSet.change_role côté backend).
    const permissions = await fetchPermissions(access_token);

    return {
      ...token,
      accessToken: access_token,
      expiresAt: decodeExp(access_token),
      user: {
        ...token.user,
        permissions,
      },
    };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token :", error);
    return {
      ...token,
      error: "RefreshTokenError",
    };
  }
}

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          // Appel à l'API de login Django
          const response = await fetch(`${DJANGO_API_URL}/auth/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const body = await response.json();

          if (!response.ok || body?.status !== "success") {
            // Passer le message d'erreur précis (ex: "Compte suspendu")
            throw new Error(body?.message || "Identifiants incorrects");
          }

          const { access_token, refresh_token, user } = body.data;
          const permissions = await fetchPermissions(access_token);

          // On renvoie un objet combiné qui sera stocké dans le JWT callback
          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            permissions,
            mustChangePassword: user.must_change_password,
            tenant: user.tenant,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: decodeExp(access_token),
          } as any;
        } catch (error: any) {
          throw new Error(error?.message || "Identifiants incorrects");
        }
      },
    }),
  ],
  callbacks: {
    // authConfig.callbacks.authorized doit être conservé ici : ce bloc
    // écrasait auparavant ...authConfig avec { jwt, session } au lieu de
    // fusionner, ce qui supprimait silencieusement le callback `authorized`
    // (garde mustChangePassword, protection /superadmin, redirection
    // /login) — le middleware retombait alors sur le comportement par
    // défaut de NextAuth (authentifié = autorisé, sans aucune des règles
    // métier ci-dessus).
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger, session }) {
      // Mise à jour explicite déclenchée par unstable_update() (ex :
      // après un changement de mot de passe réussi) — cf.
      // app/(auth)/change-password/actions.ts. `session` contient ici le
      // payload passé à unstable_update().
      if (trigger === "update" && session) {
        const patch = (session as any).user ?? session;
        return {
          ...token,
          user: { ...(token.user as any), ...patch },
          mustChangePassword:
            patch.mustChangePassword ?? (token as any).mustChangePassword,
        };
      }

      // Initialisation (au moment de la connexion)
      if (user && account) {
        const u = user as any;
        return {
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          expiresAt: u.expiresAt,
          user: {
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            permissions: u.permissions ?? [],
            mustChangePassword: u.mustChangePassword,
            tenant: u.tenant,
          },
          mustChangePassword: u.mustChangePassword,
          role: u.role,
          tenant: u.tenant,
        };
      }

      // Si le token n'a pas encore expiré, on le renvoie tel quel
      // Marge de sécurité de 30 secondes
      if (Date.now() < (token.expiresAt as number) - 30 * 1000) {
        return token;
      }

      // Si le token a expiré, on tente de le rafraîchir
      return refreshAccessToken(token as any) as any;
    },
    async session({ session, token }: any) {
      if (token) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.error = token.error;
        session.user = token.user;
        session.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
});
