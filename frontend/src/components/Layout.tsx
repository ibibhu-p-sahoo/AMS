import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode, useState } from "react";
import { useAuth } from "../lib/auth";
import { canAccess } from "../lib/access";
import NotificationBell from "./NotificationBell";

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
  { to: "/reports", label: "Reports & Analytics", icon: "📊" },
  { to: "/users", label: "Users", icon: "👤" },
  { to: "/audit", label: "Audit Log", icon: "🛡️" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  function toggleSidebar() {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-full">
      {/* ── sidebar ── */}
      <aside
        className={`relative flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {/* logo + toggle */}
        <div className={`flex items-center border-b border-slate-100 py-4 ${collapsed ? "justify-center px-0" : "justify-between px-4"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
                A
              </div>
              <div>
                <div className="text-sm font-bold leading-tight text-slate-900">Alumni MS</div>
                <div className="text-xs text-slate-400">Management System</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
              A
            </div>
          )}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${
              collapsed ? "absolute -right-3.5 top-5 z-10 border border-slate-200 bg-white shadow-sm" : ""
            }`}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* nav links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV.filter((n) => canAccess(user, n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  collapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`
              }
            >
              <span className="text-base">{n.icon}</span>
              {!collapsed && n.label}
            </NavLink>
          ))}
        </nav>

        {/* user footer */}
        <div className="border-t border-slate-200 px-2 py-3">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={user?.name}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
              >
                {(user?.name || "?").charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-lg text-red-400 hover:text-red-600"
              >
                ⏻
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {(user?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700">{user?.name}</div>
                  <div className="text-xs capitalize text-slate-400">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-2 px-1 text-xs font-medium text-red-500 hover:underline"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── main ── */}
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-8 py-3">
          <NotificationBell />
        </header>
        <div className="mx-auto max-w-7xl animate-[fadein_0.25s_ease-out] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
