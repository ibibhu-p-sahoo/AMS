import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { canAccess } from "../lib/access";

const NAV: { to: string; label: string; icon: string }[] = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/alumni", label: "Alumni", icon: "🎓" },
  { to: "/students", label: "Students", icon: "👨‍🎓" },
  { to: "/companies", label: "Companies", icon: "🏢" },
  { to: "/campaigns", label: "Outreach", icon: "✉️" },
  { to: "/events", label: "Events", icon: "📅" },
  { to: "/referrals", label: "Referrals", icon: "🔗" },
  { to: "/job-intel", label: "Job-Intel", icon: "📈" },
  { to: "/jobs", label: "Jobs", icon: "💼" },
  { to: "/tasks", label: "Tasks", icon: "✅" },
  { to: "/users", label: "Users", icon: "👤" },
  { to: "/audit", label: "Audit Log", icon: "🛡️" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">A</div>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-900">Alumni MS</div>
            <div className="text-xs text-slate-400">Management System</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.filter((n) => canAccess(user, n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {(user?.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-700">{user?.name}</div>
              <div className="text-xs capitalize text-slate-400">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-2 text-xs font-medium text-red-600 hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl animate-[fadein_0.25s_ease-out] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
