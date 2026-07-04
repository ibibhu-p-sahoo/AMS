import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Modal, Label, Input, Select } from "../components/ui";
import Pagination from "../components/Pagination";

interface Alumnus {
  id: number;
  name: string;
  batch: number;
  branch: string;
  company_name: string;
  role_level: string;
  domain: string;
  city: string;
  email: string;
  phone: string;
  linkedin: string;
  status: string;
  is_super_alumni: boolean;
  willingness: number;
}

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "Other"];
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
  { name: "branch",         label: "Branch",                  type: "select", options: BRANCHES.map((b) => ({ value: b, label: b })), required: true },
  { name: "domain",         label: "Domain" },
  { name: "city",           label: "City" },
  { name: "email",          label: "Email",                   type: "email", required: true },
  { name: "phone",          label: "Phone" },
  { name: "linkedin",       label: "LinkedIn" },
  { name: "status",         label: "Status",                  type: "select", options: [{ value: "active", label: "Active" }, { value: "passive", label: "Passive" }] },
  { name: "role_level",     label: "Role level",              type: "select", options: ROLE_LEVELS },
  { name: "willingness",    label: "Willingness (1–5)",       type: "number" },
  { name: "is_super_alumni",label: "Super alumnus",           type: "checkbox" },
  { name: "consent_given",  label: "DPDP consent given",      type: "checkbox" },
] as const;

const EMPTY_FORM: Record<string, unknown> = {
  name: "", batch: "", branch: "", domain: "", city: "",
  email: "", phone: "", linkedin: "", status: "active",
  role_level: "", willingness: "", is_super_alumni: false, consent_given: false,
};

export default function Alumni() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const writable = canWrite(user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch]       = useState("");
  const [branch, setBranch]       = useState("");
  const [city, setCity]           = useState("");
  const [sortBy, setSortBy]       = useState("-id");
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Alumnus | null>(null);
  const [form, setForm]           = useState<Record<string, unknown>>({ ...EMPTY_FORM });
  const [error, setError]         = useState("");
  const [profileAlumnus, setProfileAlumnus] = useState<Alumnus | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const params = { search, page, page_size: pageSize, branch: branch || undefined, city: city || undefined, ordering: sortBy };

  const { data, isLoading } = useQuery({
    queryKey: ["alumni", params],
    queryFn: () => fetchList<Alumnus>("/alumni/", params),
  });

  const total      = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) return (await api.patch(`/alumni/${editing.id}/`, payload)).data;
      return (await api.post("/alumni/", payload)).data;
    },
    onSuccess: () => {
      setModalOpen(false);
      toast.success(editing ? "Alumni updated" : "Alumni created");
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/alumni/${id}/`),
    onSuccess: () => {
      toast.success("Alumni deleted");
      qc.invalidateQueries({ queryKey: ["alumni"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  async function exportCsv() {
    const res = await api.get("/alumni/export-csv/", { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a"); a.href = url; a.download = "alumni.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported alumni.csv");
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
    setForm(f); setError(""); setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const payload: Record<string, unknown> = {};
    FIELDS.forEach((field) => {
      const v = form[field.name];
      if (field.type === "checkbox") { payload[field.name] = !!v; return; }
      if (v === "" || v == null) { if (!field.type || field.type === "email") payload[field.name] = ""; return; }
      payload[field.name] = field.type === "number" ? Number(v) : v;
    });
    save.mutate(payload);
  }

  function clearFilters() { setBranch(""); setCity(""); setSortBy("-id"); setSearch(""); setPage(1); }

  return (
    <div>
      {/* ── header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alumni Directory</h1>
          <p className="mt-0.5 text-sm text-slate-400">Browse and connect with alumni from our network.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* search */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-slate-400">🔍</span>
            <input
              placeholder="Search alumni by name, company, batch…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-56 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* filter toggle */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${showFilters ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            ⚙ Filters {(branch || city) && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] text-white">!</span>}
          </button>

          {/* export */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              ⬇ Export
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
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400">Branch</label>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none">
              <option value="">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400">Location</label>
            <input placeholder="All Locations" value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400">Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none">
              <option value="-id">Newest First</option>
              <option value="name">Name A–Z</option>
              <option value="-batch">Batch (Latest)</option>
              <option value="batch">Batch (Oldest)</option>
              <option value="-willingness">Willingness</option>
            </select>
          </div>
          {(branch || city || sortBy !== "-id") && (
            <button onClick={clearFilters} className="ml-auto text-xs font-semibold text-brand-600 hover:underline">
              Clear Filters
            </button>
          )}
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
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(a.name)}`}>
                          {initials(a.name)}
                        </div>
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
                          onClick={() => setProfileAlumnus(a)}
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
              <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white ${avatarColor(profileAlumnus.name)}`}>
                {initials(profileAlumnus.name)}
              </div>
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

      {/* ── create/edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Alumni" : "Add Alumni"}>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.filter((f) => f.type !== "checkbox").map((f) => (
              <div key={f.name} className={f.name === "name" || f.name === "email" ? "col-span-2" : ""}>
                <Label>{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
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
          <div className="flex gap-4">
            {FIELDS.filter((f) => f.type === "checkbox").map((f) => (
              <label key={f.name} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />
                {f.label}
              </label>
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
