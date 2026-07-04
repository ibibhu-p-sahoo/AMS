import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface Slice { label: string; value: number; }
interface TopAlumnus {
  id: number; name: string; role_level: string; company: string;
  willingness: number; is_super_alumni: boolean;
}
interface Analytics {
  kpis: {
    alumni_total: number; alumni_growth_pct: number | null;
    alumni_active: number; events_total: number; events_growth_pct: number | null;
    jobs_total: number; jobs_growth_pct: number | null;
    companies_total: number; super_alumni: number;
  };
  alumni_growth: { month: string; alumni: number }[];
  by_location: Slice[];
  by_industry: Slice[];
  by_branch: Slice[];
  engagement: { month: string; events: number; jobs: number }[];
  top_alumni: TopAlumnus[];
}

const DONUT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
const ROLE_LABEL: Record<string, string> = {
  junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead / Manager", exec: "Executive",
};
const AVATAR_COLORS = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-violet-500"];
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Trend({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-xs font-medium text-slate-300">— new</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% from last year
    </span>
  );
}

function Kpi({ icon, iconBg, label, value, trend }: {
  icon: string; iconBg: string; label: string; value: string; trend?: number | null;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">{label}</div>
          <div className="truncate text-xl font-extrabold text-slate-800">{value}</div>
        </div>
      </div>
      {trend !== undefined && <div className="mt-2"><Trend pct={trend ?? null} /></div>}
    </div>
  );
}

function Donut({ title, data }: { title: string; data: Slice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
      {total === 0 ? (
        <p className="py-10 text-center text-sm text-slate-300">No data yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={42} outerRadius={62} paddingAngle={2}>
                  {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold text-slate-800">{total}</span>
              <span className="text-[10px] text-slate-400">Total</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {data.map((d, i) => (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="flex-1 truncate text-slate-600">{d.label}</span>
                <span className="font-semibold text-slate-700">{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await api.get<Analytics>("/analytics/")).data,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const k = data.kpis;
  const locMax = Math.max(1, ...data.by_location.map((l) => l.value));

  return (
    <div>
      {/* header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-400">Analyze and visualize alumni engagement and growth.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
            📅 This Year
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            ⬇ Download Report
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon="🎓" iconBg="bg-indigo-50"  label="Total Alumni"      value={k.alumni_total.toLocaleString()} trend={k.alumni_growth_pct} />
        <Kpi icon="🟢" iconBg="bg-emerald-50" label="Active Alumni"     value={k.alumni_active.toLocaleString()} />
        <Kpi icon="📅" iconBg="bg-violet-50"  label="Events Organized"  value={k.events_total.toLocaleString()} trend={k.events_growth_pct} />
        <Kpi icon="💼" iconBg="bg-amber-50"   label="Jobs Posted"       value={k.jobs_total.toLocaleString()} trend={k.jobs_growth_pct} />
        <Kpi icon="🏢" iconBg="bg-rose-50"    label="Companies"         value={k.companies_total.toLocaleString()} />
      </div>

      {/* row 1: growth + location + industry */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* growth */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-3 font-semibold text-slate-800">Alumni Growth Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.alumni_growth} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gAlum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="alumni" stroke="#6366f1" strokeWidth={2} fill="url(#gAlum)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* location */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-4 font-semibold text-slate-800">Alumni by Location</h3>
          {data.by_location.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-300">No location data yet.</p>
          ) : (
            <div className="space-y-3">
              {data.by_location.map((l, i) => (
                <div key={l.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{l.label}</span>
                    <span className="font-semibold text-slate-700">{l.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full" style={{ width: `${(l.value / locMax) * 100}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* industry */}
        <Donut title="Alumni by Industry" data={data.by_industry} />
      </div>

      {/* row 2: engagement + top alumni + branch */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* engagement */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <h3 className="mb-3 font-semibold text-slate-800">Engagement Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.engagement} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="events" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="jobs" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* top alumni */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Top Active Alumni</h3>
            <Link to="/alumni" className="text-xs font-medium text-brand-600 hover:underline">View All</Link>
          </div>
          {data.top_alumni.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-300">No alumni yet.</p>
          ) : (
            <div className="space-y-3">
              {data.top_alumni.map((a, i) => (
                <Link key={a.id} to={`/alumni/${a.id}`} className="flex items-center gap-3 rounded-lg p-1 transition hover:bg-slate-50">
                  <span className="w-4 text-sm font-bold text-slate-300">{i + 1}</span>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(a.name)}`}>
                    {initials(a.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">
                      {a.name}{a.is_super_alumni && " ⭐"}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {ROLE_LABEL[a.role_level] || a.role_level}{a.company ? ` at ${a.company}` : ""}
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold text-brand-600" title="Willingness to help">
                    {"★".repeat(a.willingness)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* branch donut */}
        <Donut title="Alumni by Branch" data={data.by_branch} />
      </div>
    </div>
  );
}
