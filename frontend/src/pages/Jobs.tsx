import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select, Textarea } from "../components/ui";
import Pagination from "../components/Pagination";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  work_mode: "onsite" | "hybrid" | "remote";
  description: string;
  apply_url: string;
  posted_by: number | null;
  posted_by_name: string;
  is_open: boolean;
  created_at: string;
}

const WORK_MODES = [
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "remote", label: "Remote" },
];

const EMPTY = { title: "", company: "", location: "", work_mode: "onsite", description: "", apply_url: "" };

export default function Jobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");

  // Everyone except read-only can post a job (alumni included).
  const canPost = !!user && user.role !== "readonly";
  const canManage = (j: Job) =>
    !!user && (user.is_admin || user.role === "coordinator" || j.posted_by === user.id);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", search, page, pageSize],
    queryFn: () => fetchList<Job>("/jobs/", { search, page, page_size: pageSize }),
  });
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const create = useMutation({
    mutationFn: async () => (await api.post("/jobs/", form)).data,
    onSuccess: () => {
      setModalOpen(false);
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job posted");
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/jobs/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
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

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Openings shared by alumni and the team — visible to everyone."
        action={canPost && <Button onClick={() => { setForm({ ...EMPTY }); setError(""); setModalOpen(true); }}>+ Post a job</Button>}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search title, company, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="ml-auto text-sm text-slate-400">{total} openings</span>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">Loading jobs…</p>
      ) : data?.results.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No job postings yet.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.results.map((j) => (
            <Card key={j.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900">{j.title}</h3>
                  <p className="text-sm text-slate-600">{j.company}</p>
                </div>
                <Badge value={j.is_open ? "active" : "blocked"} />
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                {j.location && <span className="rounded-full bg-slate-100 px-2 py-0.5">📍 {j.location}</span>}
                <span className="rounded-full bg-brand-50 px-2 py-0.5 capitalize text-brand-700">{j.work_mode}</span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{j.description}</p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">
                  Posted by {j.posted_by_name || "—"} · {new Date(j.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  {applyHref(j.apply_url) && (
                    <a
                      href={applyHref(j.apply_url)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Apply →
                    </a>
                  )}
                  {canManage(j) && (
                    <button
                      onClick={() => { if (confirm("Remove this job posting?")) remove.mutate(j.id); }}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(s) => { setPageSize(s); setPage(1); }}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Post a job">
        <form onSubmit={(e) => { e.preventDefault(); setError(""); create.mutate(); }} className="space-y-3">
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
              <Label>Work mode</Label>
              <Select value={form.work_mode} onChange={(e) => setForm({ ...form, work_mode: e.target.value })}>
                {WORK_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
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
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Posting…" : "Post job"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
