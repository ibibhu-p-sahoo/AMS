import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Modal, Label, Input, Select, Textarea } from "../components/ui";

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
  github: string;
  twitter: string;
  website: string;
  bio: string;
  skills: string;
  interests: string;
  status: string;
  is_super_alumni: boolean;
  willingness: number;
  created_at: string;
  updated_at: string;
}

const BRANCH_FULL: Record<string, string> = {
  CSE: "B.Tech CSE", IT: "B.Tech IT", ECE: "B.Tech ECE",
  EEE: "B.Tech EEE", Mech: "B.Tech Mechanical", Civil: "B.Tech Civil", Other: "B.Tech",
};
const ROLE_LABEL: Record<string, string> = {
  junior: "Junior", mid: "Mid-level", senior: "Senior",
  lead: "Lead / Manager", exec: "Executive",
};

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-violet-500",
];
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function linkUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
}
function splitTags(s: string) {
  return (s || "").split(",").map((t) => t.trim()).filter(Boolean);
}

type Tab = "about" | "experience" | "skills" | "contact";
const TABS: { key: Tab; label: string }[] = [
  { key: "about",      label: "About" },
  { key: "experience", label: "Experience" },
  { key: "skills",     label: "Skills" },
  { key: "contact",    label: "Contact" },
];

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-lg font-bold text-slate-800">{value}</span>
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

const EMPTY_EDIT = {
  bio: "", skills: "", interests: "", linkedin: "", github: "",
  twitter: "", website: "", city: "", domain: "", phone: "", role_level: "",
};

export default function AlumniProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const writable = canWrite(user);

  const [tab, setTab] = useState<Tab>("about");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_EDIT });
  const [error, setError] = useState("");

  const { data: a, isLoading } = useQuery({
    queryKey: ["alumnus", id],
    queryFn: async () => (await api.get<Alumnus>(`/alumni/${id}/`)).data,
  });

  const save = useMutation({
    mutationFn: async () => (await api.patch(`/alumni/${id}/`, form)).data,
    onSuccess: () => {
      setEditOpen(false);
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["alumnus", id] });
      qc.invalidateQueries({ queryKey: ["alumni"] });
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  function openEdit() {
    if (!a) return;
    setForm({
      bio: a.bio ?? "", skills: a.skills ?? "", interests: a.interests ?? "",
      linkedin: a.linkedin ?? "", github: a.github ?? "", twitter: a.twitter ?? "",
      website: a.website ?? "", city: a.city ?? "", domain: a.domain ?? "",
      phone: a.phone ?? "", role_level: a.role_level ?? "",
    });
    setError("");
    setEditOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!a) return <p className="text-slate-500">Alumnus not found.</p>;

  const online = a.status === "active";
  const gradYear = a.batch;
  const startYear = gradYear ? gradYear - 4 : null;
  const nowYear = new Date().getFullYear();
  const expYears = gradYear && nowYear > gradYear ? nowYear - gradYear : 0;
  const title = [ROLE_LABEL[a.role_level] || a.role_level, a.company_name && `at ${a.company_name}`]
    .filter(Boolean).join(" ");
  const skills = splitTags(a.skills);
  const interests = splitTags(a.interests);

  const socials: { key: string; label: string; icon: string; url: string }[] = [
    { key: "linkedin", label: "LinkedIn", icon: "in", url: linkUrl(a.linkedin) },
    { key: "github",   label: "GitHub",   icon: "GH", url: linkUrl(a.github) },
    { key: "twitter",  label: "Twitter",  icon: "𝕏",  url: linkUrl(a.twitter) },
    { key: "website",  label: "Website",  icon: "🌐", url: linkUrl(a.website) },
  ].filter((s) => s.url);

  return (
    <div>
      {/* breadcrumb + actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Link to="/alumni" className="hover:text-brand-600">Alumni Directory</Link>
          <span>›</span>
          <span className="font-medium text-slate-600">Alumni Profile</span>
        </div>
        <div className="flex items-center gap-2">
          <a href={`mailto:${a.email}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50">
            ✉ Message
          </a>
          {a.linkedin && (
            <a href={linkUrl(a.linkedin)} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50">
              🔗 Connect
            </a>
          )}
          {writable && (
            <button onClick={openEdit}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              ✎ Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* header + stat cards */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {/* identity */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-start gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="relative">
              <div className={`flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold text-white ${avatarColor(a.name)}`}>
                {initials(a.name)}
              </div>
              <span className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white ${online ? "bg-emerald-500" : "bg-slate-300"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800">{a.name}</h1>
                {a.is_super_alumni && <span title="Verified super alumni" className="text-brand-500">✔</span>}
              </div>
              {title && <p className="text-sm font-medium text-slate-500">{title}</p>}
              <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                <div className="flex items-center gap-2">🎓 {BRANCH_FULL[a.branch] || a.branch}{startYear ? `, ${startYear}–${String(gradYear).slice(-2)} Batch` : ` ${gradYear} Batch`}</div>
                {a.city && <div className="flex items-center gap-2">📍 {a.city}</div>}
                <div className="flex items-center gap-2">✉ {a.email}</div>
                {a.phone && <div className="flex items-center gap-2">📞 {a.phone}</div>}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {online ? "● Online" : "● Passive"}
                </span>
                <div className="flex gap-2">
                  {socials.map((s) => (
                    <a key={s.key} href={s.url} target="_blank" rel="noreferrer" title={s.label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition hover:bg-brand-50 hover:text-brand-600">
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon="⏳" label="Experience" value={expYears ? `${expYears}+ Yrs` : "Fresh"} sub={a.domain || "in industry"} />
          <StatCard icon="🏢" label="Company" value={a.company_name || "—"} sub={ROLE_LABEL[a.role_level] || "—"} />
          <StatCard icon="⭐" label="Willingness" value={"★".repeat(a.willingness || 0) || "—"} sub="to help / mentor" />
          <StatCard icon="🎓" label="Batch" value={String(a.batch)} sub={a.branch} />
        </div>
      </div>

      {/* body: tabs + side */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* main tabs */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="flex gap-5 border-b border-slate-100 px-6 pt-4">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`relative pb-3 text-sm font-medium transition ${tab === t.key ? "text-brand-600" : "text-slate-400 hover:text-slate-600"}`}>
                  {t.label}
                  {tab === t.key && <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-brand-600" />}
                </button>
              ))}
            </div>
            <div className="p-6">
              {tab === "about" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-2 font-semibold text-slate-800">About</h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {a.bio || <span className="text-slate-300">No bio added yet.</span>}
                    </p>
                  </div>
                  {interests.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-semibold text-slate-800">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {interests.map((t) => (
                          <span key={t} className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "experience" && (
                a.company_name ? (
                  <div className="relative border-l-2 border-slate-100 pl-6">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-brand-500" />
                    <div className="font-semibold text-slate-800">{ROLE_LABEL[a.role_level] || "Professional"}</div>
                    <div className="text-sm text-slate-500">{a.company_name}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{a.domain || "—"} · {a.city || "—"}</div>
                    <div className="mt-1 text-xs font-medium text-emerald-500">Since {a.batch} batch</div>
                  </div>
                ) : <p className="text-sm text-slate-300">No experience details added yet.</p>
              )}

              {tab === "skills" && (
                skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <span key={s} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">{s}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-300">No skills added yet.</p>
              )}

              {tab === "contact" && (
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div><div className="text-xs text-slate-400">Email</div><a href={`mailto:${a.email}`} className="font-medium text-brand-600 hover:underline">{a.email}</a></div>
                  <div><div className="text-xs text-slate-400">Phone</div><div className="font-medium text-slate-700">{a.phone || "—"}</div></div>
                  {socials.map((s) => (
                    <div key={s.key}><div className="text-xs text-slate-400">{s.label}</div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline break-all">{s.url}</a></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* side: current position + meta */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-4 font-semibold text-slate-800">Current Position</h3>
            {a.company_name ? (
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${avatarColor(a.company_name)}`}>
                  {a.company_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{ROLE_LABEL[a.role_level] || "Professional"}</div>
                  <div className="text-xs text-slate-500">{a.company_name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{a.domain || "—"}</div>
                </div>
              </div>
            ) : <p className="text-sm text-slate-300">Not specified.</p>}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h3 className="mb-4 font-semibold text-slate-800">Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Batch", value: String(a.batch) },
                { label: "Branch", value: a.branch },
                { label: "Location", value: a.city || "—" },
                { label: "Status", value: a.status },
                { label: "Super Alumni", value: a.is_super_alumni ? "Yes ⭐" : "No" },
              ].map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-slate-400">{r.label}</span>
                  <span className="font-medium capitalize text-slate-700">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <form onSubmit={(e) => { e.preventDefault(); setError(""); save.mutate(); }} className="space-y-3">
          <div>
            <Label>Bio / About</Label>
            <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Python, AWS" /></div>
            <div><Label>Interests (comma-separated)</Label><Input value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} placeholder="AI & ML, Reading" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Role level</Label>
              <Select value={form.role_level} onChange={(e) => setForm({ ...form, role_level: e.target.value })}>
                <option value="">— select —</option>
                {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div><Label>Domain</Label><Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>LinkedIn</Label><Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></div>
            <div><Label>GitHub</Label><Input value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Twitter / X</Label><Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
