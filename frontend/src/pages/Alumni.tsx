import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Modal, Label, Input, Select, AddableSelect } from "../components/ui";
import { isValidEmail } from "../lib/validation";
import { fileToAvatarDataUrl } from "../lib/image";
import Pagination from "../components/Pagination";

interface Alumnus {
  id: number;
  name: string;
  batch: number;
  dob: string;
  photo: string;
  branch: string;
  company_name: string;
  role_level: string;
  domain: string;
  city: string;
  email: string;
  phone: string;
  linkedin: string;
  source: string;
  referred_by: string;
  status: string;
  is_super_alumni: boolean;
  willingness: number;
}

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "MBA", "Other"];

const ROLE_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid",    label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead",   label: "Lead / Manager" },
  { value: "exec",   label: "Executive" },
];

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",   "bg-cyan-500",    "bg-violet-500",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function linkedinUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
}


const FIELDS = [
  { name: "name",           label: "Name",                    required: true },
  { name: "batch",          label: "Batch (year)",            type: "number", required: true },
  { name: "dob",            label: "Date of birth",           type: "date", required: true },
  { name: "branch",         label: "Branch",                  type: "select", options: BRANCHES.map((b) => ({ value: b, label: b })), required: true },
  { name: "company_input",  label: "Company",                 type: "company", required: true },
  { name: "domain",         label: "Domain",                  required: true },
  { name: "city",           label: "City",                    required: true },
  { name: "email",          label: "Email",                   type: "email", required: true },
  { name: "phone",          label: "Phone",                   required: true },
  { name: "linkedin",       label: "LinkedIn",                required: true },
  { name: "source",         label: "Source",                  required: true },
  { name: "referred_by",    label: "Referred by",             required: true },
  { name: "status",         label: "Status",                  type: "select", options: [{ value: "active", label: "Active" }, { value: "passive", label: "Passive" }], required: true },
  { name: "role_level",     label: "Role level",              type: "select", options: ROLE_LEVELS, required: true },
  { name: "willingness",    label: "Willingness (1–5)",       type: "number", required: true },
] as const;

const EMPTY_FORM: Record<string, unknown> = {
  name: "", batch: "", dob: "", photo: "", branch: "", company_input: "", domain: "", city: "",
  email: "", phone: "", linkedin: "", source: "", referred_by: "", status: "active",
  role_level: "", willingness: "", is_super_alumni: false, consent_given: false,
};

export default function Alumni() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const writable = canWrite(user);
  const isAdmin = !!user?.is_admin;
  const fileRef = useRef<HTMLInputElement>(null);

  // Draft = what's typed in the filter row; applied = what actually filters
  // the list (committed on "Search"), matching the search-bar UX.
  const [dName, setDName]       = useState("");
  const [dBatch, setDBatch]     = useState("");
  const [dBranch, setDBranch]   = useState("");
  const [dCompany, setDCompany] = useState("");
  const [applied, setApplied]   = useState({ name: "", batch: "", branch: "", company: "" });
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Alumnus | null>(null);
  const [form, setForm]           = useState<Record<string, unknown>>({ ...EMPTY_FORM });
  const [error, setError]         = useState("");
  const [profileAlumnus, setProfileAlumnus] = useState<Alumnus | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: companyList } = useQuery({
    queryKey: ["company-names"],
    queryFn: () => api.get<{ id: number; name: string }[]>("/companies/names/").then((r) => r.data),
  });
  const companyOptions = (companyList ?? []).map((c) => c.name);

  const appliedCompanyId = (companyList ?? []).find((c) => c.name === applied.company)?.id;
  const params = {
    page, page_size: pageSize, ordering: "-id",
    search: applied.name || undefined,
    batch: applied.batch || undefined,
    branch: applied.branch || undefined,
    company: appliedCompanyId || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["alumni", params],
    queryFn: () => fetchList<Alumnus>("/alumni/", params),
  });

  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { data: branchList } = useQuery({
    queryKey: ["alumni-branches"],
    queryFn: () => api.get<string[]>("/alumni/branches/").then((r) => r.data),
  });
  // Data-driven: follow real usage once alumni exist (so any branch can be
  // deleted and disappear), seeding from the standard list when empty.
  const branchOptions = branchList && branchList.length ? branchList : BRANCHES;

  const { data: batchList } = useQuery({
    queryKey: ["alumni-batches"],
    queryFn: () => api.get<number[]>("/alumni/batches/").then((r) => r.data),
  });
  const batchOptions = batchList ?? [];

  // Pending self-service submissions awaiting review (staff only).
  const { data: subsData } = useQuery({
    queryKey: ["alumni-submissions"],
    queryFn: () => fetchList<any>("/alumni-submissions/", { status: "pending", page_size: 100 }),
    enabled: writable,
  });
  const pendingSubs = subsData?.results ?? [];

  const reviewSub = useMutation({
    mutationFn: ({ id, verb }: { id: number; verb: "approve" | "reject" }) =>
      api.post(`/alumni-submissions/${id}/${verb}/`),
    onSuccess: (_r, v) => {
      toast.success(v.verb === "approve" ? "Approved & saved to directory" : "Submission rejected");
      qc.invalidateQueries({ queryKey: ["alumni-submissions"] });
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["alumni-branches"] });
      qc.invalidateQueries({ queryKey: ["company-names"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not complete the action"),
  });

  function runSearch() {
    setApplied({ name: dName.trim(), batch: dBatch, branch: dBranch, company: dCompany });
    setPage(1);
  }
  function clearFilters() {
    setDName(""); setDBatch(""); setDBranch(""); setDCompany("");
    setApplied({ name: "", batch: "", branch: "", company: "" });
    setPage(1);
  }
  const hasFilters = !!(applied.name || applied.batch || applied.branch || applied.company);

  // Reassign everyone on a custom branch to "Other", then refresh suggestions.
  const deleteBranch = useMutation({
    mutationFn: (branch: string) => api.post("/alumni/delete_branch/", { branch }),
    onSuccess: () => {
      toast.success("Branch removed");
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["alumni-branches"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: () => toast.error("Could not remove branch"),
  });

  // Delete a company record (unlinks any alumni on it), then refresh.
  const deleteCompany = useMutation({
    mutationFn: (name: string) => {
      const id = (companyList ?? []).find((c) => c.name === name)?.id;
      if (!id) throw new Error("not found");
      return api.delete(`/companies/${id}/`);
    },
    onSuccess: () => {
      toast.success("Company deleted");
      qc.invalidateQueries({ queryKey: ["company-names"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["alumni"] });
    },
    onError: () => toast.error("Could not delete company"),
  });

  // Remove a custom status / role_level value (reassigns alumni off it).
  const deleteAlumniValue = useMutation({
    mutationFn: (v: { field: string; value: string; reassign_to: string }) =>
      api.post("/alumni/delete-value/", v),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["alumni"] });
    },
    onError: () => toast.error("Could not remove"),
  });

  // Data-driven values from the loaded rows (seed from base when none in use).
  const valuesFor = (field: string, base: string[]) => {
    const seen = Array.from(new Set((data?.results ?? []).map((a) => String((a as any)[field] ?? "")).filter(Boolean)));
    return seen.length ? seen : base;
  };
  const STATUS_BASE = ["active", "passive"];
  const ROLE_BASE = ROLE_LEVELS.map((r) => r.value);

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) return (await api.patch(`/alumni/${editing.id}/`, payload)).data;
      return (await api.post("/alumni/", payload)).data;
    },
    onSuccess: () => {
      setModalOpen(false);
      toast.success(editing ? "Alumni updated" : "Alumni created");
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["alumni-branches"] });
      qc.invalidateQueries({ queryKey: ["company-names"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => {
      const data = e?.response?.data;
      if (data && typeof data === "object") {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? String(first[0]) : String(first));
      } else {
        setError("Could not save. Please try again.");
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/alumni/${id}/`),
    onSuccess: () => {
      toast.success("Alumni deleted");
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // Excel export of the current filter selections (batch/branch/company/name).
  async function exportExcel() {
    const companyId = (companyList ?? []).find((c) => c.name === dCompany)?.id;
    const exportParams = {
      search: dName.trim() || undefined,
      batch: dBatch || undefined,
      branch: dBranch || undefined,
      company: companyId || undefined,
    };
    const res = await api.get("/alumni/export-xlsx/", { params: exportParams, responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const parts = [dBatch && `batch-${dBatch}`, dBranch, dCompany].filter(Boolean);
    const fname = parts.length ? `alumni-${parts.join("-")}.xlsx` : "alumni.xlsx";
    const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${fname}`);
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post("/alumni/import-csv/", fd);
      const { created, updated, errors } = res.data as { created: number; updated: number; errors: string[] };
      toast.success(`Import complete — ${created} added, ${updated} updated${errors?.length ? `, ${errors.length} skipped` : ""}.`);
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error("Import failed", JSON.stringify(err?.response?.data || err.message));
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openCreate() {
    setEditing(null); setForm({ ...EMPTY_FORM }); setError(""); setModalOpen(true);
  }

  function openEdit(a: Alumnus) {
    setEditing(a);
    const f: Record<string, unknown> = {};
    FIELDS.forEach((field) => { f[field.name] = (a as any)[field.name] ?? (field.type === "checkbox" ? false : ""); });
    // company is displayed as company_name but submitted as company_input.
    f.company_input = a.company_name ?? "";
    f.photo = a.photo ?? "";
    setForm(f); setError(""); setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!isValidEmail(String(form.email ?? ""))) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }
    const payload: Record<string, unknown> = {};
    FIELDS.forEach((field) => {
      const v = form[field.name];
      if (field.type === "checkbox") { payload[field.name] = !!v; return; }
      // company_input is always sent (even blank) so an employer can be cleared.
      if (v === "" || v == null) {
        if (!field.type || field.type === "email" || field.name === "company_input") payload[field.name] = "";
        return;
      }
      payload[field.name] = field.type === "number" ? Number(v) : v;
    });
    payload.photo = form.photo ?? "";  // custom field, not in FIELDS
    save.mutate(payload);
  }

  return (
    <div>
      {/* ── header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alumni Directory</h1>
          <p className="mt-0.5 text-sm text-slate-400">Browse and connect with alumni from our network.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* review pending self-service submissions */}
          {writable && (
            <button
              onClick={() => setReviewOpen(true)}
              className="relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Review alumni who submitted the public profile form"
            >
              🗂 Review
              {pendingSubs.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
                  {pendingSubs.length}
                </span>
              )}
            </button>
          )}

          {/* self-service invite link */}
          {writable && (
            <button
              onClick={() => {
                const link = `${window.location.origin}/forms/alumni`;
                navigator.clipboard?.writeText(link).then(
                  () => toast.success("Invite link copied", link),
                  () => toast.error("Copy failed", link),
                );
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              title="Copy the public link alumni can use to add/update their own profile"
            >
              🔗 Invite link
            </button>
          )}

          {/* export / import */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition" title="Download the current filter selection as Excel">
              ⬇ Export Excel
            </button>
            {writable && (
              <>
                <div className="w-px h-8 bg-slate-200" />
                <button onClick={() => fileRef.current?.click()} disabled={importBusy} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition">
                  {importBusy ? "…" : "⬆"}
                </button>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
              </>
            )}
          </div>

          {/* add */}
          {writable && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              + Add Alumni
            </button>
          )}
        </div>
      </div>

      {/* ── filter bar ── */}
      <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Alumni Name</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-brand-400">
              <span className="text-slate-400">🔍</span>
              <input
                placeholder="Search by name…"
                value={dName}
                onChange={(e) => setDName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex w-40 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Batch</label>
            <select value={dBatch} onChange={(e) => setDBatch(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none">
              <option value="">All batches</option>
              {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex w-40 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Branch</label>
            <select value={dBranch} onChange={(e) => setDBranch(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none">
              <option value="">All branches</option>
              {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex w-44 flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Company</label>
            <select value={dCompany} onChange={(e) => setDCompany(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none">
              <option value="">All companies</option>
              {companyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={runSearch} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
            Search
          </button>
          <button onClick={clearFilters} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Clear
          </button>
        </div>
      </div>

      {/* ── active-filter summary ── */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>Showing {total} result{total === 1 ? "" : "s"} for:</span>
          {applied.name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Name: {applied.name}</span>}
          {applied.batch && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Batch: {applied.batch}</span>}
          {applied.branch && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Branch: {applied.branch}</span>}
          {applied.company && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Company: {applied.company}</span>}
          <button onClick={clearFilters} className="font-semibold text-brand-600 hover:underline">Clear all</button>
        </div>
      )}

      {/* ── table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Alumni</th>
                <th className="px-5 py-3.5">Batch &amp; Branch</th>
                <th className="px-5 py-3.5">Current Position</th>
                <th className="px-5 py-3.5">Company</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  <div className="flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
                </td></tr>
              ) : data?.results.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No alumni found.</td></tr>
              ) : (
                data?.results.map((a) => (
                  <tr key={a.id} className="group transition hover:bg-slate-50">
                    {/* alumni */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {a.photo ? (
                          <img src={a.photo} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(a.name)}`}>
                            {initials(a.name)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            {a.name}
                            {a.is_super_alumni && <span title="Super alumni" className="text-amber-400">⭐</span>}
                          </div>
                          <div className="text-xs text-slate-400">{a.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* batch & branch */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-700">{a.batch}</div>
                      <div className="text-xs text-slate-400">{a.branch}</div>
                    </td>

                    {/* position */}
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700">{a.domain || a.role_level || "—"}</div>
                      {a.role_level && a.domain && <div className="text-xs capitalize text-slate-400">{a.role_level}</div>}
                    </td>

                    {/* company */}
                    <td className="px-5 py-3.5">
                      {a.company_name ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                            {a.company_name[0]}
                          </div>
                          <span className="font-medium text-slate-700">{a.company_name}</span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* location */}
                    <td className="px-5 py-3.5">
                      {a.city ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="text-slate-400">📍</span>{a.city}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>

                    {/* actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/alumni/${a.id}`)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
                        >
                          View Profile
                        </button>
                        {writable && (
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpenId(menuOpenId === a.id ? null : a.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              ⋮
                            </button>
                            {menuOpenId === a.id && (
                              <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                                <button onClick={() => { setMenuOpenId(null); openEdit(a); }}
                                  className="block w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">✏️ Edit</button>
                                {a.linkedin && (
                                  <a href={linkedinUrl(a.linkedin)} target="_blank" rel="noreferrer"
                                    className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">🔗 LinkedIn</a>
                                )}
                                <button onClick={() => { setMenuOpenId(null); if (confirm(`Delete ${a.name}?`)) remove.mutate(a.id); }}
                                  className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50">🗑️ Delete</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── bottom bar ── */}
        <div className="border-t border-slate-100 px-5 py-3">
          <Pagination
            page={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }}
          />
        </div>
      </div>

      {/* ── profile modal ── */}
      {profileAlumnus && (
        <Modal open={!!profileAlumnus} onClose={() => setProfileAlumnus(null)} title="Alumni Profile">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {profileAlumnus.photo ? (
                <img src={profileAlumnus.photo} alt="" className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover" />
              ) : (
                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white ${avatarColor(profileAlumnus.name)}`}>
                  {initials(profileAlumnus.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  {profileAlumnus.name}
                  {profileAlumnus.is_super_alumni && <span className="text-amber-400">⭐</span>}
                </div>
                <div className="text-sm text-slate-400">{profileAlumnus.email}</div>
                <div className="mt-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${profileAlumnus.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {profileAlumnus.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              {[
                { label: "Alumni ID", value: `#${profileAlumnus.id}` },
                { label: "Batch",    value: profileAlumnus.batch },
                { label: "Branch",   value: profileAlumnus.branch },
                { label: "Company",  value: profileAlumnus.company_name || "—" },
                { label: "Domain",   value: profileAlumnus.domain || "—" },
                { label: "Role",     value: profileAlumnus.role_level || "—" },
                { label: "City",     value: profileAlumnus.city || "—" },
                { label: "Phone",    value: profileAlumnus.phone || "—" },
                { label: "Source",   value: profileAlumnus.source || "—" },
                { label: "Referred by", value: profileAlumnus.referred_by || "—" },
                { label: "Willingness", value: profileAlumnus.willingness ? "★".repeat(profileAlumnus.willingness) : "—" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="text-xs text-slate-400">{r.label}</div>
                  <div className="font-medium text-slate-700">{r.value}</div>
                </div>
              ))}
            </div>

            {profileAlumnus.linkedin && (
              <a href={linkedinUrl(profileAlumnus.linkedin)} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50">
                🔗 View LinkedIn Profile
              </a>
            )}

            {writable && (
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" onClick={() => { setProfileAlumnus(null); openEdit(profileAlumnus); }}>Edit</Button>
                <Button variant="outline" onClick={() => setProfileAlumnus(null)}>Close</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── review submissions modal ── */}
      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Pending alumni submissions">
        {pendingSubs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No pending submissions right now.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              These came in via the public profile form. Approving adds/updates the alumnus in the directory (matched by email).
            </p>
            {pendingSubs.map((s: any) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.photo ? (
                      <img src={s.photo} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">👤</div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-800">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.email}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => reviewSub.mutate({ id: s.id, verb: "approve" })}
                      disabled={reviewSub.isPending}
                      className="px-3 py-1.5 text-xs"
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { if (confirm(`Reject ${s.name}'s submission?`)) reviewSub.mutate({ id: s.id, verb: "reject" }); }}
                      disabled={reviewSub.isPending}
                      className="px-3 py-1.5 text-xs text-red-600"
                    >
                      ✕ Reject
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-3">
                  <span>Batch: {s.batch}</span>
                  <span>Branch: {s.branch}</span>
                  {s.company && <span>Company: {s.company}</span>}
                  {s.role_level && <span>Role: {s.role_level}</span>}
                  {s.domain && <span>Domain: {s.domain}</span>}
                  {s.city && <span>City: {s.city}</span>}
                  {s.phone && <span>Phone: {s.phone}</span>}
                  {s.source && <span>Source: {s.source}</span>}
                  {s.referred_by && <span>Referred by: {s.referred_by}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── create/edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Alumni" : "Add Alumni"}>
        <form onSubmit={submit} className="space-y-3">
          {/* profile photo */}
          <div className="flex items-center gap-4">
            {form.photo ? (
              <img src={String(form.photo)} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">👤</div>
            )}
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                {form.photo ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const dataUrl = await fileToAvatarDataUrl(file);
                      setForm((f) => ({ ...f, photo: dataUrl }));
                    } catch {
                      toast.error("Could not read that image");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {form.photo && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, photo: "" }))} className="text-xs text-red-500 hover:underline">
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FIELDS.filter((f) => f.type !== "checkbox").map((f) => (
              <div key={f.name} className={f.name === "name" || f.name === "email" ? "col-span-2" : ""}>
                <Label>{f.label}{f.required && " *"}</Label>
                {f.name === "branch" ? (
                  <AddableSelect
                    value={String(form.branch ?? "")}
                    options={branchOptions}
                    onChange={(v) => setForm({ ...form, branch: v })}
                    required={f.required}
                    addLabel="➕ Add new branch…"
                    placeholder="Type new branch (e.g. MBA)"
                    onDelete={isAdmin ? (b) => deleteBranch.mutate(b) : undefined}
                  />
                ) : f.name === "company_input" ? (
                  <AddableSelect
                    value={String(form.company_input ?? "")}
                    options={companyOptions}
                    onChange={(v) => setForm({ ...form, company_input: v })}
                    addLabel="➕ Add new company…"
                    placeholder="Type new company (e.g. TCS)"
                    required={f.required}
                    onDelete={isAdmin ? (c) => deleteCompany.mutate(c) : undefined}
                  />
                ) : f.name === "phone" ? (
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={String(form.phone ?? "")}
                    // Strip anything that isn't a digit or a valid phone symbol (+ - space ( )).
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+\-()\s]/g, "") })}
                    required={f.required}
                  />
                ) : f.name === "email" ? (
                  <>
                    <Input
                      type="email"
                      value={String(form.email ?? "")}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required={f.required}
                    />
                    {String(form.email ?? "").trim().length > 0 && !isValidEmail(String(form.email)) && (
                      <p className="mt-1 text-xs text-red-600">Please enter a valid email address (e.g. name@example.com).</p>
                    )}
                  </>
                ) : f.name === "status" ? (
                  <AddableSelect
                    value={String(form.status ?? "")}
                    options={valuesFor("status", STATUS_BASE)}
                    onChange={(v) => setForm({ ...form, status: v })}
                    addLabel="➕ Add new status…"
                    placeholder="Type new status"
                    required={f.required}
                    onDelete={isAdmin ? (v) => deleteAlumniValue.mutate({ field: "status", value: v, reassign_to: v === "active" ? "" : "active" }) : undefined}
                  />
                ) : f.name === "role_level" ? (
                  <AddableSelect
                    value={String(form.role_level ?? "")}
                    options={valuesFor("role_level", ROLE_BASE)}
                    onChange={(v) => setForm({ ...form, role_level: v })}
                    addLabel="➕ Add new role level…"
                    placeholder="Type new role level"
                    required={f.required}
                    onDelete={isAdmin ? (v) => deleteAlumniValue.mutate({ field: "role_level", value: v, reassign_to: "" }) : undefined}
                  />
                ) : f.type === "select" ? (
                  <Select value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required}>
                    <option value="">— select —</option>
                    {(f as any).options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input type={f.type || "text"} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} />
                )}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* close menu on outside click */}
      {menuOpenId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}
