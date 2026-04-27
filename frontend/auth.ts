import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import axios from "axios"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        try {
          // Exemple d'appel, à adapter au backend DRF exact
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/login/`, {
            email: credentials.email,
            password: credentials.password
          })

          // Réponse backend : { status, data: { user: {...}, tokens: { access, refresh } } }
          const payload = response.data?.data

          if (payload?.tokens?.access) {
            return {
              id: payload.user.id,
              email: payload.user.email,
              name: `${payload.user.first_name} ${payload.user.last_name}`.trim(),
              role: payload.user.role,
              tenantId: payload.user.tenant_id,
              accessToken: payload.tokens.access,
              refreshToken: payload.tokens.refresh,
            }
          }
          return null
        } catch (error) {
          console.error("Login failed", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.role = user.role
        token.tenantId = user.tenantId
      }
      return token
    },
    async session({ session, token }) {
      session.user.role = token.role as string
      session.user.tenantId = token.tenantId as string | undefined
      session.accessToken = token.accessToken as string
      return session
    }
  },
  pages: {
    signIn: '/login',
  }
})
