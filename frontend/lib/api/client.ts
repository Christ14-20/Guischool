import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  // TODO: Implement getSession and inject token
  // const session = await getSession();
  // if (session?.accessToken) {
  //   config.headers.Authorization = `Bearer ${session.accessToken}`;
  // }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // TODO: Implement refresh token logic
    if (error.response?.status === 401) {
      // Refresh logic here
    }
    return Promise.reject(error);
  },
);

export default apiClient;
