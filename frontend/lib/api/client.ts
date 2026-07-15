import axios from "axios";

// URL de base de l'API Django (côté serveur Next.js)
const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || "http://localhost:8000/api/v1";

/**
 * Client Axios pour les appels côté serveur (Next.js -> Django)
 * Ce client doit recevoir le token JWT explicitement depuis la session Auth.js.
 */
export const serverApi = axios.create({
  baseURL: DJANGO_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Client Axios pour les appels côté navigateur (Browser -> Next.js BFF)
 * Ce client appelle les route handlers Next.js (/api/*). Le cookie de session NextAuth
 * est automatiquement transmis par le navigateur.
 */
export const clientApi = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur global de réponse pour normaliser la gestion des erreurs côté client
clientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si l'erreur a une réponse structurée de notre API
    if (error.response?.data) {
      return Promise.reject(error.response.data);
    }
    // Erreur réseau ou autre
    return Promise.reject({
      status: "error",
      message: error.message || "Une erreur réseau est survenue",
    });
  }
);
