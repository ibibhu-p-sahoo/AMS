import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card } from "../components/ui";

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
}

const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const TONES: Record<string, string> = {
  indigo: "bg-brand-50 text-brand-600",
  green: "bg-green-50 text-green-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  cyan: "bg-cyan-50 text-cyan-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

// Per-role hero banner gradient.
const HERO: Record<string, string> = {
  admin: "from-indigo-600 via-brand-600 to-violet-600",
  coordinator: "from-emerald-600 via-teal-600 to-cyan-600",
  volunteer: "from-amber-500 via-orange-500 to-rose-500",
  alumnus: "from-brand-600 via-indigo-500 to-sky-500",
  readonly: "from-slate-600 via-slate-500 to-slate-400",
};

function Hero({ role, title, subtitle, children }: { role: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className={`mb-6 rounded-2xl bg-gradient-to-r ${HERO[role] || HERO.readonly} p-6 text-white shadow-sm`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
          {role}
        </span>
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon, label, value, tone = "slate" }: { icon: string; label: string; value: number; tone?: string }) {
  return (
    <Card className="flex items-center gap-4 p-5 transition hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg ${TONES[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold leading-none text-slate-900">{value}</div>
        <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>
    </div>
  );
}

function CtaCard({ icon, title, desc, to }: { icon: string; title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-2xl">{icon}</div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-800 group-hover:text-brand-700">{title}</div>
        <div className="text-sm text-slate-500">{desc}</div>
      </div>
      <span className="ml-auto text-brand-400 transition group-hover:translate-x-1">→</span>
    </Link>
  );
}

function BranchChart({ data }: { data: Dashboard["alumni_by_branch"] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold text-slate-800">Alumni by branch</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="branch" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function PipelineChart({ data }: { data: Dashboard["referrals_by_stage"] }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-semibold text-slate-800">Referral pipeline by stage</h3>
      {data.length === 0 ? (
        <p className="py-20 text-center text-sm text-slate-400">No referrals yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="stage" innerRadius={55} outerRadius={100} paddingAngle={2} label={(e) => `${e.stage} (${e.count})`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/dashboard/")).data,
  });

  if (isLoading || !data) return <p className="text-slate-500">Loading dashboard…</p>;

  const name = (user?.name || "there").split(" ")[0];
  const role = user?.role || "readonly";

  // ---------- ADMIN ----------
  if (role === "admin") {
    return (
      <div>
        <Hero role="admin" title={`Welcome, ${name}`} subtitle="System administrator — full overview & controls" />
        <Section title="Alumni & Talent">
          <Kpi icon="🎓" label="Total alumni" value={data.alumni_total} tone="indigo" />
          <Kpi icon="🟢" label="Active alumni" value={data.alumni_active} tone="green" />
          <Kpi icon="⭐" label="Super alumni" value={data.super_alumni} tone="amber" />
          <Kpi icon="👨‍🎓" label="Students" value={data.students_total} tone="cyan" />
        </Section>
        <Section title="Outreach & Hiring">
          <Kpi icon="📣" label="Campaigns" value={data.campaigns_total} tone="indigo" />
          <Kpi icon="✉️" label="Touches sent" value={data.outreach_sent} tone="cyan" />
          <Kpi icon="💬" label="Replied" value={data.outreach_replied} tone="green" />
          <Kpi icon="📈" label="Hiring now" value={data.hiring_now} tone="green" />
        </Section>
        <Section title="Pipeline, Events & Tasks">
          <Kpi icon="🔗" label="Open referrals" value={data.referrals_open} tone="indigo" />
          <Kpi icon="✅" label="Placed" value={data.referrals_placed} tone="green" />
          <Kpi icon="⏰" label="SLA breached" value={data.referrals_sla_breached} tone="red" />
          <Kpi icon="📅" label="Upcoming events" value={data.events_upcoming} tone="cyan" />
        </Section>
        <Section title="System">
          <Kpi icon="👤" label="User accounts" value={data.users_total} tone="violet" />
          <Kpi icon="🏢" label="Companies" value={data.companies_total} tone="slate" />
          <Kpi icon="💼" label="Open jobs" value={data.jobs_open} tone="indigo" />
          <Kpi icon="📋" label="Open tasks" value={data.tasks_open} tone="amber" />
        </Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <BranchChart data={data.alumni_by_branch} />
          <PipelineChart data={data.referrals_by_stage} />
        </div>
      </div>
    );
  }

  // ---------- COORDINATOR ----------
  if (role === "coordinator") {
    return (
      <div>
        <Hero role="coordinator" title="Placement Operations" subtitle={`Hi ${name} — here's where things stand today`} />
        {data.referrals_sla_breached > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-semibold text-red-700">{data.referrals_sla_breached} referral(s) past the 48h SLA</p>
              <p className="text-sm text-red-600">Follow up on these leads to keep them warm.</p>
            </div>
            <Link to="/referrals" className="ml-auto rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">Review →</Link>
          </div>
        )}
        <Section title="Placement Pipeline">
          <Kpi icon="🔗" label="Open referrals" value={data.referrals_open} tone="indigo" />
          <Kpi icon="✅" label="Placed" value={data.referrals_placed} tone="green" />
          <Kpi icon="⏰" label="SLA breached" value={data.referrals_sla_breached} tone="red" />
          <Kpi icon="📈" label="Hiring now" value={data.hiring_now} tone="green" />
        </Section>
        <Section title="Outreach & Events">
          <Kpi icon="📣" label="Campaigns" value={data.campaigns_total} tone="indigo" />
          <Kpi icon="✉️" label="Touches sent" value={data.outreach_sent} tone="cyan" />
          <Kpi icon="💬" label="Replied" value={data.outreach_replied} tone="green" />
          <Kpi icon="📅" label="Upcoming events" value={data.events_upcoming} tone="amber" />
        </Section>
        <Section title="Team & Talent">
          <Kpi icon="📋" label="Open tasks" value={data.tasks_open} tone="amber" />
          <Kpi icon="🎓" label="Active alumni" value={data.alumni_active} tone="indigo" />
          <Kpi icon="👨‍🎓" label="Students" value={data.students_total} tone="cyan" />
          <Kpi icon="💼" label="Open jobs" value={data.jobs_open} tone="violet" />
        </Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <PipelineChart data={data.referrals_by_stage} />
          <BranchChart data={data.alumni_by_branch} />
        </div>
      </div>
    );
  }

  // ---------- VOLUNTEER ----------
  if (role === "volunteer") {
    return (
      <div>
        <Hero role="volunteer" title={`Your work board, ${name}`} subtitle="What needs your attention today" />
        <Section title="My Work">
          <Kpi icon="📋" label="My open tasks" value={data.my_tasks_open} tone="amber" />
          <Kpi icon="🔗" label="Open referrals" value={data.referrals_open} tone="indigo" />
          <Kpi icon="⏰" label="SLA breached" value={data.referrals_sla_breached} tone="red" />
          <Kpi icon="📅" label="Upcoming events" value={data.events_upcoming} tone="cyan" />
        </Section>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <CtaCard icon="🔗" title="Follow up referrals" desc="Keep the pipeline moving" to="/referrals" />
          <CtaCard icon="✅" title="My tasks" desc="See what's assigned to you" to="/tasks" />
          <CtaCard icon="📅" title="Events" desc="Mark RSVPs & attendance" to="/events" />
        </div>
        <PipelineChart data={data.referrals_by_stage} />
      </div>
    );
  }

  // ---------- ALUMNUS ----------
  if (role === "alumnus") {
    return (
      <div>
        <Hero role="alumnus" title={`Welcome back, ${name}! 👋`} subtitle="Stay connected with your alumni community" />
        <Section title="Your Community">
          <Kpi icon="🎓" label="Total alumni" value={data.alumni_total} tone="indigo" />
          <Kpi icon="⭐" label="Super alumni" value={data.super_alumni} tone="amber" />
          <Kpi icon="📅" label="Upcoming events" value={data.events_upcoming} tone="cyan" />
          <Kpi icon="💼" label="Open jobs" value={data.jobs_open} tone="green" />
        </Section>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <CtaCard icon="💼" title="Browse jobs" desc="See openings shared by alumni" to="/jobs" />
          <CtaCard icon="📢" title="Post a job" desc="Share an opening at your company" to="/jobs" />
          <CtaCard icon="📅" title="Upcoming events" desc="Meetups, webinars & drives" to="/events" />
        </div>
        <BranchChart data={data.alumni_by_branch} />
      </div>
    );
  }

  // ---------- READ-ONLY ----------
  return (
    <div>
      <Hero role="readonly" title="Reporting Overview" subtitle="Read-only snapshot of the alumni network" />
      <Section title="At a Glance">
        <Kpi icon="🎓" label="Total alumni" value={data.alumni_total} tone="indigo" />
        <Kpi icon="🟢" label="Active alumni" value={data.alumni_active} tone="green" />
        <Kpi icon="👨‍🎓" label="Students" value={data.students_total} tone="cyan" />
        <Kpi icon="🏢" label="Companies" value={data.companies_total} tone="slate" />
      </Section>
      <Section title="Outcomes">
        <Kpi icon="✅" label="Placed" value={data.referrals_placed} tone="green" />
        <Kpi icon="🔗" label="Open referrals" value={data.referrals_open} tone="indigo" />
        <Kpi icon="📅" label="Upcoming events" value={data.events_upcoming} tone="amber" />
        <Kpi icon="💼" label="Open jobs" value={data.jobs_open} tone="violet" />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <BranchChart data={data.alumni_by_branch} />
        <PipelineChart data={data.referrals_by_stage} />
      </div>
    </div>
  );
}
