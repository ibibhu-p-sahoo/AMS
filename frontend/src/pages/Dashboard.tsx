import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Activity {
  id: number;
  action: string;
  entity: string;
  summary: string;
  user: string;
  timestamp: string;
}

interface Dashboard {
  alumni_total: number;
  alumni_active: number;
  super_alumni: number;
  students_total: number;
  companies_total: number;
  companies_in_placement: number;
  campaigns_total: number;
  outreach_sent: number;
  outreach_replied: number;
  events_upcoming: number;
  referrals_open: number;
  referrals_placed: number;
  referrals_sla_breached: number;
  tasks_open: number;
  hiring_now: number;
  jobs_open: number;
  users_total: number;
  my_tasks_open: number;
  referrals_by_stage: { stage: string; count: number }[];
  alumni_by_branch: { branch: string; count: number }[];
  alumni_growth: { month: string; alumni: number }[];
  recent_activities: Activity[];
}

const BRANCH_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ENTITY_ICON: Record<string, string> = {
  Alumni: "🎓",
  Student: "👨‍🎓",
  Company: "🏢",
  Event: "📅",
  JobPosting: "💼",
  ReferralLead: "🔗",
  OutreachCampaign: "📣",
  Task: "✅",
  User: "👤",
};

const ACTION_COLOR: Record<string, string> = {
  created: "text-emerald-600 bg-emerald-50",
  updated: "text-blue-600 bg-blue-50",
  deleted: "text-red-600 bg-red-50",
};

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: string;
  label: string;
  value: number;
  iconBg: string;
  trend?: number; // % change, optional
  to?: string;
}

function KpiCard({ icon, label, value, iconBg, trend, to }: KpiProps) {
  const inner = (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${iconBg}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-extrabold text-slate-800">{value.toLocaleString()}</div>
        <div className="mt-0.5 text-sm text-slate-400">{label}</div>
      </div>
      {trend !== undefined && (
        <p className={`text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% this month
        </p>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── charts ───────────────────────────────────────────────────────────────────

function GrowthChart({ data }: { data: Dashboard["alumni_growth"] }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Alumni Growth</h3>
          <p className="text-xs text-slate-400">Cumulative registered alumni this year</p>
        </div>
        <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
          This Year
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="alumniGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="alumni"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#alumniGrad)"
            dot={{ fill: "#4f46e5", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BranchDonut({ data }: { data: Dashboard["alumni_by_branch"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="mb-0.5 font-semibold text-slate-800">Alumni by Branch</h3>
      <p className="mb-3 text-xs text-slate-400">Branch-wise distribution</p>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="branch"
                innerRadius={48}
                outerRadius={75}
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-slate-800">{total}</span>
            <span className="text-[10px] text-slate-400">Total</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2">
          {data.slice(0, 5).map((d, i) => (
            <li key={d.branch} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }} />
              <span className="flex-1 truncate font-medium text-slate-600">{d.branch}</span>
              <span className="font-semibold text-slate-400">{total ? Math.round((d.count / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RecentActivities({ data }: { data: Activity[] }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Recent Activities</h3>
        <Link to="/audit" className="text-xs font-medium text-brand-600 hover:underline">
          View All
        </Link>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {data.map((act) => (
            <li key={act.id} className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-base">
                {ENTITY_ICON[act.entity] ?? "📋"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700" title={act.summary}>
                  {act.summary || `${act.entity} ${act.action}`}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${ACTION_COLOR[act.action] ?? "text-slate-500 bg-slate-100"}`}>
                    {act.action}
                  </span>
                  <span className="text-[10px] text-slate-400">{timeAgo(act.timestamp)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/dashboard/")).data,
  });

  if (isLoading || !data)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );

  const firstName = (user?.name || "there").split(" ")[0];
  const role = user?.role || "readonly";

  const kpis = role === "admin" || role === "coordinator" ? (
    <>
      <KpiCard icon="🎓" label="Total Alumni"    value={data.alumni_total}    iconBg="bg-indigo-100"  trend={12} to="/alumni" />
      <KpiCard icon="🟢" label="Active Alumni"   value={data.alumni_active}   iconBg="bg-emerald-100" trend={8}  to="/alumni" />
      <KpiCard icon="📅" label="Events"          value={data.events_upcoming} iconBg="bg-violet-100"  trend={4}  to="/events" />
      <KpiCard icon="💼" label="Jobs Posted"     value={data.jobs_open}       iconBg="bg-amber-100"   trend={6}  to="/jobs" />
      <KpiCard icon="🏢" label="Companies"       value={data.companies_total} iconBg="bg-rose-100"    trend={3}  to="/companies" />
    </>
  ) : role === "volunteer" ? (
    <>
      <KpiCard icon="📋" label="My Open Tasks"   value={data.my_tasks_open}          iconBg="bg-amber-100"   to="/tasks" />
      <KpiCard icon="🔗" label="Open Referrals"  value={data.referrals_open}         iconBg="bg-indigo-100"  to="/referrals" />
      <KpiCard icon="⏰" label="SLA Breached"    value={data.referrals_sla_breached} iconBg="bg-red-100"     to="/referrals" />
      <KpiCard icon="📅" label="Upcoming Events" value={data.events_upcoming}        iconBg="bg-cyan-100"    to="/events" />
      <KpiCard icon="💼" label="Open Jobs"       value={data.jobs_open}              iconBg="bg-green-100"   to="/jobs" />
    </>
  ) : (
    <>
      <KpiCard icon="🎓" label="Total Alumni"    value={data.alumni_total}    iconBg="bg-indigo-100"  to="/alumni" />
      <KpiCard icon="🟢" label="Active Alumni"   value={data.alumni_active}   iconBg="bg-emerald-100" to="/alumni" />
      <KpiCard icon="📅" label="Upcoming Events" value={data.events_upcoming} iconBg="bg-violet-100"  to="/events" />
      <KpiCard icon="💼" label="Open Jobs"       value={data.jobs_open}       iconBg="bg-amber-100"   to="/jobs" />
      <KpiCard icon="🏢" label="Companies"       value={data.companies_total} iconBg="bg-rose-100"    to="/companies" />
    </>
  );

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Here's what's happening with your alumni network today.
          </p>
        </div>
        <div className="flex gap-2">
          {(role === "admin" || role === "coordinator") && (
            <div className="relative">
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95">
                  + Add New
                  <span className="text-white/70">▾</span>
                </button>
                {/* dropdown */}
                <div className="invisible absolute right-0 top-full z-20 mt-2 w-44 origin-top-right scale-95 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg transition-all group-focus-within:visible group-focus-within:scale-100 group-hover:visible group-hover:scale-100">
                  {[
                    { label: "Alumni",   to: "/alumni" },
                    { label: "Student",  to: "/students" },
                    { label: "Company",  to: "/companies" },
                    { label: "Event",    to: "/events" },
                    { label: "Job",      to: "/jobs" },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      className="block px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SLA alert ── */}
      {data.referrals_sla_breached > 0 && (role === "admin" || role === "coordinator") && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-3.5">
          <span className="text-xl">⏰</span>
          <p className="flex-1 text-sm font-medium text-red-700">
            {data.referrals_sla_breached} referral(s) past the 48h SLA — follow up to keep leads warm.
          </p>
          <Link to="/referrals" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
            Review →
          </Link>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis}
      </div>

      {/* ── charts + activity ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <GrowthChart data={data.alumni_growth ?? []} />
        </div>
        <div className="lg:col-span-2">
          <BranchDonut data={data.alumni_by_branch} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivities data={data.recent_activities ?? []} />
        </div>
      </div>

      {/* ── quick stats row (admin only) ── */}
      {(role === "admin") && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Open Referrals",  value: data.referrals_open,    icon: "🔗", to: "/referrals",  color: "text-indigo-600" },
            { label: "Campaigns",       value: data.campaigns_total,   icon: "📣", to: "/outreach",   color: "text-violet-600" },
            { label: "Open Tasks",      value: data.tasks_open,        icon: "📋", to: "/tasks",      color: "text-amber-600"  },
            { label: "User Accounts",   value: data.users_total,       icon: "👤", to: "/users",      color: "text-slate-600"  },
          ].map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
