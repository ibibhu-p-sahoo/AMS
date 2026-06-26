import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "./api";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "coordinator" | "volunteer" | "alumnus" | "readonly";
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("ams_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login/", { email, password });
    localStorage.setItem("ams_access", data.access);
    localStorage.setItem("ams_refresh", data.refresh);
    localStorage.setItem("ams_user", JSON.stringify(data.user));
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("ams_access");
    localStorage.removeItem("ams_refresh");
    localStorage.removeItem("ams_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Roles allowed to create/edit/delete through the UI (mirrors backend RBAC).
const WRITE_ROLES = ["admin", "coordinator", "volunteer"];
export function canWrite(user: User | null) {
  return !!user && WRITE_ROLES.includes(user.role);
}
