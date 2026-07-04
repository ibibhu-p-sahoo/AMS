import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Modal, Input, Label, Select, Textarea } from "../components/ui";
import Pagination from "../components/Pagination";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_type: "fulltime" | "parttime" | "internship";
  description: string;
  apply_url: string;
  posted_by: number | null;
  posted_by_name: string;
  is_open: boolean;
  created_at: string;
}

interface JobStats {
  total: number;
  internships: number;
  companies: number;
  open_jobs: number;
  new_this_month: number;
  top_companies: { company: string; openings: number }[];
}

const WORK_MODES = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const EMPLOYMENT_TYPES = [
  { value: "fulltime",   label: "Full Time" },
  { value: "parttime",   label: "Part Time" },
  { value: "internship", label: "Internship" },
];

const EMPLOYMENT_LABEL: Record<string, string> = {
  fulltime: "Full Time", parttime: "Part Time", internship: "Internship",
};
const WORK_MODE_LABEL: Record<string, string> = {
  onsite: "On-site", hybrid: "Hybrid", remote: "Remote",
};

const EMPTY = {
  title: "", company: "", location: "", work_mode: "onsite",
  employment_type: "fulltime", description: "", apply_url: "",
};

type Tab = "all" | "fulltime" | "parttime" | "internship";

const TABS: { key: Tab; label: string }[] = [
  { key: "all",        label: "All Jobs" },
  { key: "fulltime",   label: "Full Time" },
  { key: "parttime",   label: "Part Time" },
  { key: "internship", label: "Internships" },
];

// ── helpers ───────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const LOGO_COLORS = [
  "bg-red-100 text-red-600", "bg-blue-100 text-blue-600",
  "bg-amber-100 text-amber-600", "bg-emerald-100 text-emerald-600",
  "bg-violet-100 text-violet-600", "bg-cyan-100 text-cyan-600",
];
function logoColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

const MODE_BADGE: Record<string, string> = {
  remote: "bg-violet-50 text-violet-600",
  onsite: "bg-blue-50 text-blue-600",
  hybrid: "bg-amber-50 text-amber-600",
};
const TYPE_BADGE: Record<string, string> = {
  fulltime:   "bg-emerald-50 text-emerald-600",
  parttime:   "bg-slate-100 text-slate-600",
  internship: "bg-indigo-50 text-indigo-600",
};

// ── KPI card ──────────────────────────────────────────────
function Kpi({ icon, iconBg, label, value, trend }: {
  icon: string; iconBg: string; label: string; value: string | number; trend?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-slate-400">{label}</div>
        <div className="text-2xl font-extrabold text-slate-800">{value}</div>
        {trend && <div className="text-xs font-medium text-emerald-500">↑ {trend}</div>}
      </div>
    </div>
  );
}

export default function Jobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const canPost = !!user && user.role !== "readonly";
  const canManage = (j: Job) =>
    !!user && (user.is_admin || user.role === "coordinator" || j.posted_by === user.id);

  const params = {
    search, page, page_size: pageSize, ordering: sortBy,
    employment_type: tab === "all" ? undefined : tab,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", params],
    queryFn: () => fetchList<Job>("/jobs/", params),
  });
  const { data: stats } = useQuery({
    queryKey: ["jobs-stats"],
    queryFn: async () => (await api.get<JobStats>("/jobs/stats/")).data,
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const save = useMutation({
    mutationFn: async () => {
      if (editing) return (await api.patch(`/jobs/${editing.id}/`, form)).data;
      return (await api.post("/jobs/", form)).data;
    },
    onSuccess: () => {
      setModalOpen(false);
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-stats"] });
      toast.success(editing ? "Job updated" : "Job posted");
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/jobs/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs-stats"] });
      toast.success("Job removed");
    },
    onError: () => toast.error("Could not remove job"),
  });

  function applyHref(s: string) {
    if (!s) return null;
    if (s.startsWith("http")) return s;
    if (s.includes("@")) return `mailto:${s}`;
    return `https://${s}`;
  }

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY }); setError(""); setModalOpen(true);
  }
  function openEdit(j: Job) {
    setEditing(j);
    setForm({
      title: j.title, company: j.company, location: j.location,
      work_mode: j.work_mode, employment_type: j.employment_type,
      description: j.description, apply_url: j.apply_url,
    });
    setError(""); setModalOpen(true);
  }

  return (
    <div>
      {/* ── header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jobs &amp; Internships</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Find and explore job opportunities posted by alumni and top companies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              showFilters ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            ⚙ Filters
          </button>
          {canPost && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              + Post a Job
            </button>
          )}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="💼" iconBg="bg-violet-50" label="Total Jobs"   value={stats?.total ?? "—"}
             trend={stats?.new_this_month ? `${stats.new_this_month} this month` : undefined} />
        <Kpi icon="🎓" iconBg="bg-emerald-50" label="Internships" value={stats?.internships ?? "—"} />
        <Kpi icon="🏢" iconBg="bg-blue-50"    label="Companies"   value={stats?.companies ?? "—"} />
        <Kpi icon="✅" iconBg="bg-amber-50"   label="Open Positions" value={stats?.open_jobs ?? "—"} />
      </div>

      {/* ── main grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: list */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            {/* tabs + sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex gap-4">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setTab(t.key); setPage(1); }}
                    className={`relative pb-1 text-sm font-medium transition ${
                      tab === t.key ? "text-brand-600" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {t.label}
                    {tab === t.key && <span className="absolute -bottom-[13px] left-0 h-0.5 w-full rounded-full bg-brand-600" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 focus:border-brand-400 focus:outline-none">
                  <option value="-created_at">Latest</option>
                  <option value="created_at">Oldest</option>
                  <option value="title">Title A–Z</option>
                </select>
              </div>
            </div>

            {/* search (in filters) */}
            {showFilters && (
              <div className="border-b border-slate-100 px-5 py-3">
                <input
                  placeholder="Search title, company, location…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
                />
              </div>
            )}

            {/* rows */}
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : (data?.results.length ?? 0) === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                <span className="text-3xl">📭</span>
                <p className="text-sm">No jobs found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data?.results.map((j) => (
                  <div key={j.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    {/* logo */}
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold ${logoColor(j.company)}`}>
                      {j.company[0]?.toUpperCase() || "?"}
                    </div>
                    {/* info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-800">{j.title}</div>
                      <div className="truncate text-xs text-slate-400">
                        {j.company}{j.location ? ` • ${j.location}` : ""}
                      </div>
                    </div>
                    {/* badges */}
                    <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${TYPE_BADGE[j.employment_type]}`}>
                        {EMPLOYMENT_LABEL[j.employment_type]}
                      </span>
                      <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${MODE_BADGE[j.work_mode]}`}>
                        {WORK_MODE_LABEL[j.work_mode]}
                      </span>
                    </div>
                    {/* time */}
                    <div className="hidden w-16 flex-shrink-0 text-right text-xs text-slate-400 md:block">
                      {timeAgo(j.created_at)}
                    </div>
                    {/* actions */}
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {applyHref(j.apply_url) ? (
                        <a href={applyHref(j.apply_url)!} target="_blank" rel="noreferrer"
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                          Apply Now
                        </a>
                      ) : (
                        <span className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs text-slate-300">No link</span>
                      )}
                      {canManage(j) && (
                        <>
                          <button onClick={() => openEdit(j)} className="text-slate-300 hover:text-brand-600" title="Edit">✏️</button>
                          <button onClick={() => { if (confirm("Remove this job?")) remove.mutate(j.id); }}
                            className="text-slate-300 hover:text-red-500" title="Delete">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 px-5 py-3">
              <Pagination
                page={page} totalPages={totalPages} total={total} pageSize={pageSize}
                onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* right: sidebar */}
        <div className="space-y-6">
          {/* top hiring companies */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Top Hiring Companies</h3>
            </div>
            {stats?.top_companies?.length ? (
              <div className="space-y-3">
                {stats.top_companies.map((c) => (
                  <div key={c.company} className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${logoColor(c.company)}`}>
                      {c.company[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-700">{c.company}</div>
                      <div className="text-xs text-slate-400">{c.openings} opening{c.openings > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No postings yet.</p>
            )}
          </div>

          {/* promo card */}
          {canPost && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 p-5 text-white shadow-sm">
              <h3 className="text-lg font-bold">Looking for talent?</h3>
              <p className="mt-1 text-sm text-white/80">Post a job and connect with qualified alumni.</p>
              <button
                onClick={openCreate}
                className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-white/90"
              >
                Post a Job Now
              </button>
              <span className="pointer-events-none absolute -right-4 -bottom-4 text-7xl opacity-20">💼</span>
            </div>
          )}
        </div>
      </div>

      {/* ── create/edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Job" : "Post a Job"}>
        <form onSubmit={(e) => { e.preventDefault(); setError(""); save.mutate(); }} className="space-y-3">
          <div>
            <Label>Job title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Company *</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bengaluru" />
            </div>
            <div>
              <Label>Employment type</Label>
              <Select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Work mode</Label>
            <Select value={form.work_mode} onChange={(e) => setForm({ ...form, work_mode: e.target.value })}>
              {WORK_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div>
            <Label>Apply link or email</Label>
            <Input value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} placeholder="https://… or jobs@company.com" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
