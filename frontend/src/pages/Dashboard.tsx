import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Activity {
  id: number; action: string; entity: string; summary: string; user: string; timestamp: string;
}
interface Slice { label: string; value: number; }
interface MonthEvent {
  id: number; title: string; type: string; date: string | null; venue: string; participant_count: number;
}
interface Dashboard {
  alumni_total: number; alumni_active: number; super_alumni: number;
  companies_total: number; jobs_total: number; jobs_open: number;
  events_total: number; events_upcoming: number;
  referrals_open: number; referrals_placed: number; referrals_sla_breached: number;
  campaigns_total: number; tasks_open: number; users_total: number; my_tasks_open: number;
  alumni_delta_pct: number | null; events_delta_pct: number | null; jobs_delta_pct: number | null;
  alumni_by_branch: { branch: string; count: number }[];
  alumni_by_location: Slice[];
  alumni_growth: { month: string; alumni: number }[];
  events_this_month: MonthEvent[];
  top_companies: { company: string; openings: number }[];
  jobs_by_type: Slice[];
  recent_activities: Activity[];
}

const DONUT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
const LOGO_COLORS = [
  "bg-red-100 text-red-600", "bg-blue-100 text-blue-600", "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600", "bg-violet-100 text-violet-600", "bg-cyan-100 text-cyan-600",
];
function logoColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ENTITY_ICON: Record<string, string> = {
  Alumni: "🎓", Student: "👨‍🎓", Company: "🏢", Event: "📅",
  JobPosting: "💼", ReferralLead: "🔗", OutreachCampaign: "📣", Task: "✅", User: "👤",
};

// ── KPI card (colored tint, like reference) ──
function KpiCard({ icon, iconBg, label, value, trend, to }: {
  icon: string; iconBg: string; label: string; value: number; trend?: number | null; to?: string;
}) {
  const inner = (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">{label}</div>
          <div className="text-2xl font-extrabold text-slate-800">{value.toLocaleString()}</div>
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-2 text-xs font-medium">
          {trend == null ? (
            <span className="text-slate-300">— new this month</span>
          ) : (
            <span className={trend >= 0 ? "text-emerald-500" : "text-red-500"}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% from last month
            </span>
          )}
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ── donut ──
function Donut({ title, subtitle, data, centerLabel }: {
  title: string; subtitle?: string; data: Slice[]; centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-slate-400">{subtitle}</p>}
      {total === 0 ? (
        <p className="flex-1 py-10 text-center text-sm text-slate-300">No data yet.</p>
      ) : (
        <div className="mt-2 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={46} outerRadius={70} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-slate-800">{total}</span>
              <span className="text-[10px] text-slate-400">{centerLabel}</span>
            </div>
          </div>
          <ul className="flex-1 space-y-2">
            {data.map((d, i) => (
              <li key={d.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="flex-1 truncate text-slate-600">{d.label}</span>
                <span className="font-semibold text-slate-400">{Math.round((d.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AvatarDots({ count }: { count: number }) {
  const shown = Math.min(count, 4);
  const colors = ["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"];
  if (count === 0) return <span className="text-xs text-slate-300">No RSVPs</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <div key={i} className={`h-6 w-6 rounded-full border-2 border-white ${colors[i]}`} />
        ))}
      </div>
      {count > 4 && <span className="text-xs text-slate-400">+{count - 4}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [actPage, setActPage] = useState(1);
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
  const isStaff = role === "admin" || role === "coordinator";

  const acts = data.recent_activities ?? [];
  const ACT_PER = 4;
  const actTotalPages = Math.max(1, Math.ceil(acts.length / ACT_PER));
  const actPageSafe = Math.min(actPage, actTotalPages);
  const actSlice = acts.slice((actPageSafe - 1) * ACT_PER, actPageSafe * ACT_PER);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Welcome back, {firstName}! 👋</h1>
          <p className="mt-1 text-sm text-slate-400">Here's what's happening with your alumni network today.</p>
        </div>
        {isStaff && (
          <div className="group relative">
            <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95">
              + Add New <span className="text-white/70">▾</span>
            </button>
            <div className="invisible absolute right-0 top-full z-20 mt-2 w-44 origin-top-right scale-95 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg transition-all group-focus-within:visible group-focus-within:scale-100 group-hover:visible group-hover:scale-100">
              {[
                { label: "Alumni", to: "/alumni" }, { label: "Student", to: "/students" },
                { label: "Company", to: "/companies" }, { label: "Event", to: "/events" },
                { label: "Job", to: "/jobs" },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="block px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-brand-600">{item.label}</Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SLA alert */}
      {data.referrals_sla_breached > 0 && isStaff && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-3.5">
          <span className="text-xl">⏰</span>
          <p className="flex-1 text-sm font-medium text-red-700">
            {data.referrals_sla_breached} referral(s) past the 48h SLA — follow up to keep leads warm.
          </p>
          <Link to="/referrals" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Review →</Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon="🎓" iconBg="bg-indigo-100"  label="Total Alumni"     value={data.alumni_total}    trend={data.alumni_delta_pct} to="/alumni" />
        <KpiCard icon="🟢" iconBg="bg-emerald-100" label="Active Alumni"    value={data.alumni_active}   to="/alumni" />
        <KpiCard icon="📅" iconBg="bg-violet-100"  label="Events Organized" value={data.events_total}    trend={data.events_delta_pct} to="/events" />
        <KpiCard icon="💼" iconBg="bg-amber-100"   label="Jobs Posted"      value={data.jobs_total}      trend={data.jobs_delta_pct} to="/jobs" />
        <KpiCard icon="🏢" iconBg="bg-rose-100"    label="Companies"        value={data.companies_total} to="/companies" />
      </div>

      {/* row: growth + location + activities */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* growth */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Alumni Growth</h3>
            <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">This Year</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data.alumni_growth ?? []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="alumniGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
              <Area type="monotone" dataKey="alumni" stroke="#6366f1" strokeWidth={2.5} fill="url(#alumniGrad)" dot={{ fill: "#6366f1", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* location */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-4 font-semibold text-slate-800">Alumni by Location</h3>
          {data.alumni_by_location.length === 0 ? (
            <p className="flex-1 py-10 text-center text-sm text-slate-300">No location data yet.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const max = Math.max(1, ...data.alumni_by_location.map((l) => l.value));
                return data.alumni_by_location.map((l, i) => (
                  <div key={l.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-600">{l.label}</span>
                      <span className="font-semibold text-slate-700">{l.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full" style={{ width: `${(l.value / max) * 100}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* recent activities */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent Activities</h3>
            <Link to="/audit" className="text-xs font-medium text-brand-600 hover:underline">View All</Link>
          </div>
          {acts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            <>
              <ul className="space-y-4">
                {actSlice.map((act) => (
                  <li key={act.id} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-base">
                      {ENTITY_ICON[act.entity] ?? "📋"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700" title={act.summary}>
                        {act.summary || `${act.entity} ${act.action}`}
                      </p>
                      <span className="text-[10px] text-slate-400">{timeAgo(act.timestamp)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {actTotalPages > 1 && (
                <div className="mt-auto flex items-center justify-between pt-4">
                  <button
                    onClick={() => setActPage((p) => Math.max(1, p - 1))}
                    disabled={actPageSafe <= 1}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                  >‹ Prev</button>
                  <span className="text-xs text-slate-400">{actPageSafe} / {actTotalPages}</span>
                  <button
                    onClick={() => setActPage((p) => Math.min(actTotalPages, p + 1))}
                    disabled={actPageSafe >= actTotalPages}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                  >Next ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* row: events this month + jobs donut + top companies */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* events this month */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Events This Month</h3>
            <Link to="/events" className="text-xs font-medium text-brand-600 hover:underline">View All</Link>
          </div>
          {data.events_this_month.length === 0 ? (
            <p className="flex-1 py-8 text-center text-sm text-slate-300">No events this month.</p>
          ) : (
            <ul className="space-y-4">
              {data.events_this_month.map((e) => {
                const d = e.date ? new Date(e.date) : null;
                return (
                  <li key={e.id} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <span className="text-base font-extrabold leading-none">{d ? d.getDate() : "—"}</span>
                      <span className="text-[9px] font-bold uppercase">{d ? d.toLocaleString("en", { month: "short" }) : ""}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{e.title}</p>
                      <p className="truncate text-xs text-slate-400">
                        {d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}{e.venue ? ` · ${e.venue}` : ""}
                      </p>
                    </div>
                    <AvatarDots count={e.participant_count} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* jobs by type donut */}
        <Donut title="Jobs by Type" subtitle="Open + closed postings" data={data.jobs_by_type} centerLabel="Jobs" />

        {/* top hiring companies */}
        <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Top Hiring Companies</h3>
            <Link to="/jobs" className="text-xs font-medium text-brand-600 hover:underline">View All</Link>
          </div>
          {data.top_companies.length === 0 ? (
            <p className="flex-1 py-8 text-center text-sm text-slate-300">No job postings yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.top_companies.map((c) => (
                <li key={c.company} className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${logoColor(c.company)}`}>
                    {c.company[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">{c.company}</div>
                    <div className="text-xs text-slate-400">{c.openings} opening{c.openings > 1 ? "s" : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
