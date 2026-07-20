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

    return {
      ...token,
      accessToken: access_token,
      expiresAt: decodeExp(access_token),
    };
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token :", error);
    return {
      ...token,
      error: "RefreshTokenError",
    };
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
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

          // On renvoie un objet combiné qui sera stocké dans le JWT callback
          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
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
    async jwt({ token, user, account }) {
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
            mustChangePassword: u.mustChangePassword,
            tenant: u.tenant,
          },
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
      }
      return session;
    },
  },
});
