import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protège toutes les routes sauf les fichiers statiques, les images, le favicon et les routes API internes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)"],
};
