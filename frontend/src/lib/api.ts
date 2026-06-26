import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ams_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh the access token once on 401, then retry.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const refresh = localStorage.getItem("ams_refresh");
    if (error.response?.status === 401 && refresh && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh/`, { refresh });
        localStorage.setItem("ams_access", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem("ams_access");
        localStorage.removeItem("ams_refresh");
        localStorage.removeItem("ams_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Generic helpers for paginated list endpoints (DRF PageNumberPagination).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function fetchList<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<Paginated<T>> {
  const { data } = await api.get<Paginated<T>>(url, { params });
  return data;
}
