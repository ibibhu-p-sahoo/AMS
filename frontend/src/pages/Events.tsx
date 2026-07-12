import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Modal, Label, Input, Select, PageHeader, AddableSelect } from "../components/ui";
import Pagination from "../components/Pagination";

interface Event {
  id: number;
  title: string;
  type: string;
  date: string;
  venue: string;
  capacity: number | null;
  participant_count: number;
  target_audience: string;
}

const TYPES = [
  { value: "drive",      label: "Placement Drive" },
  { value: "webinar",    label: "Webinar" },
  { value: "meetup",     label: "Meetup" },
  { value: "mentorship", label: "Mentorship" },
  { value: "other",      label: "Other" },
];

const TYPE_COLORS: Record<string, string> = {
  drive:      "bg-amber-500",
  webinar:    "bg-blue-500",
  meetup:     "bg-indigo-500",
  mentorship: "bg-violet-500",
  other:      "bg-slate-500",
};

// Placeholder event images by type
const TYPE_IMAGES: Record<string, string> = {
  drive:      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&q=80",
  webinar:    "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400&q=80",
  meetup:     "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&q=80",
  mentorship: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=400&q=80",
  other:      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
};

const EMPTY_FORM = { title: "", type: "other", date: "", venue: "", capacity: "", target_audience: "" };

type StatusFilter = "all" | "upcoming" | "ongoing" | "past";

function getStatus(dateStr: string): { label: string; color: string } {
  const now = new Date();
  const d = new Date(dateStr);
  const diffH = (d.getTime() - now.getTime()) / 3600000;
  if (diffH > 0)   return { label: "Upcoming", color: "bg-green-500" };
  if (diffH > -4)  return { label: "Ongoing",  color: "bg-blue-500"  };
  return             { label: "Completed", color: "bg-slate-500" };
}

function AvatarGroup({ count }: { count: number }) {
  const shown = Math.min(count, 4);
  const colors = ["bg-indigo-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${colors[i]}`}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      {count > 4 && <span className="text-xs text-slate-400">+{count - 4}</span>}
      {count === 0 && <span className="text-xs text-slate-400">No RSVPs yet</span>}
    </div>
  );
}

export default function Events() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const writable = canWrite(user);
  const isAdmin = !!user?.is_admin;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["events", search, page, pageSize],
    queryFn: () => fetchList<Event>("/events/", { search, page, page_size: pageSize }),
  });

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Client-side status filter on current page results
  const filtered = (data?.results ?? []).filter((ev) => {
    if (statusFilter === "all") return true;
    const { label } = getStatus(ev.date);
    if (statusFilter === "upcoming") return label === "Upcoming";
    if (statusFilter === "ongoing")  return label === "Ongoing";
    if (statusFilter === "past")     return label === "Completed";
    return true;
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) return (await api.patch(`/events/${editing.id}/`, payload)).data;
      return (await api.post("/events/", payload)).data;
    },
    onSuccess: () => {
      setModalOpen(false);
      toast.success(editing ? "Event updated" : "Event created");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}/`),
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // Remove a custom event type (reassigns events off it to "other").
  const deleteValue = useMutation({
    mutationFn: (v: { field: string; value: string; reassign_to: string }) =>
      api.post("/events/delete-value/", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Removed"); },
    onError: () => toast.error("Could not remove"),
  });
  const TYPE_BASE = TYPES.map((t) => t.value);
  const typeSeen = Array.from(new Set((data?.results ?? []).map((e) => String(e.type ?? "")).filter(Boolean)));
  const typeValues = typeSeen.length ? typeSeen : TYPE_BASE;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  }

  function openEdit(ev: Event) {
    setEditing(ev);
    setForm({
      title: ev.title, type: ev.type,
      date: ev.date ? ev.date.slice(0, 16) : "",
      venue: ev.venue ?? "", capacity: String(ev.capacity ?? ""),
      target_audience: ev.target_audience ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: Record<string, unknown> = {
      title: form.title, type: form.type,
      date: form.date, venue: form.venue,
      target_audience: form.target_audience,
    };
    if (form.capacity) payload.capacity = Number(form.capacity);
    save.mutate(payload);
  }

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "all",      label: "All Events" },
    { key: "upcoming", label: "Upcoming"   },
    { key: "ongoing",  label: "Ongoing"    },
    { key: "past",     label: "Completed"  },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Manage and explore all alumni events."
        action={
          writable && (
            <Button onClick={openCreate} className="flex items-center gap-2 bg-brand-600 text-white hover:bg-brand-700">
              + Create Event
            </Button>
          )
        }
      />

      {/* ── toolbar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                statusFilter === t.key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* search */}
        <input
          placeholder="Search events…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-56 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-brand-400 focus:outline-none"
        />
      </div>

      {/* ── grid ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <span className="text-4xl">📭</span>
          <p className="text-sm">No events found.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((ev) => {
            const { label, color } = getStatus(ev.date);
            const d = new Date(ev.date);
            const day = d.getDate();
            const mon = d.toLocaleString("en", { month: "short" }).toUpperCase();
            const img = TYPE_IMAGES[ev.type] ?? TYPE_IMAGES.other;

            return (
              <div
                key={ev.id}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* image */}
                <div className="relative h-40 overflow-hidden bg-slate-200">
                  <img
                    src={img}
                    alt={ev.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${color}`}>
                    {label}
                  </span>
                </div>

                {/* body */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex gap-3">
                    {/* date block */}
                    <div className="flex flex-shrink-0 flex-col items-center">
                      <span className="text-2xl font-extrabold leading-none text-brand-600">{day}</span>
                      <span className="text-[10px] font-bold tracking-widest text-slate-400">{mon}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-800">{ev.title}</h3>
                      {ev.target_audience && (
                        <p className="truncate text-xs text-slate-400">{ev.target_audience}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    {ev.venue && (
                      <div className="flex items-center gap-1.5">
                        <span>📍</span>
                        <span className="truncate">{ev.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span>🕐</span>
                      <span>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span className="capitalize">{ev.type}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <AvatarGroup count={ev.participant_count} />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailEvent(ev)}
                        className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                      >
                        View Details
                      </button>
                      {writable && (
                        <>
                          <button onClick={() => openEdit(ev)} className="text-xs text-slate-400 hover:text-brand-600">✏️</button>
                          <button onClick={() => { if (confirm("Delete event?")) remove.mutate(ev.id); }} className="text-xs text-slate-400 hover:text-red-500">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* ── detail modal ── */}
      {detailEvent && (
        <Modal open={!!detailEvent} onClose={() => setDetailEvent(null)} title={detailEvent.title}>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="relative h-48 overflow-hidden rounded-xl bg-slate-100">
              <img src={TYPE_IMAGES[detailEvent.type] ?? TYPE_IMAGES.other} alt="" className="h-full w-full object-cover" />
              <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white ${getStatus(detailEvent.date).color}`}>
                {getStatus(detailEvent.date).label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div><span className="text-xs text-slate-400">Date & Time</span><p className="font-medium">{new Date(detailEvent.date).toLocaleString()}</p></div>
              <div><span className="text-xs text-slate-400">Venue</span><p className="font-medium">{detailEvent.venue || "TBA"}</p></div>
              <div><span className="text-xs text-slate-400">Type</span><p className="font-medium capitalize">{detailEvent.type}</p></div>
              <div><span className="text-xs text-slate-400">RSVPs</span><p className="font-medium">{detailEvent.participant_count}</p></div>
              {detailEvent.capacity && <div><span className="text-xs text-slate-400">Capacity</span><p className="font-medium">{detailEvent.capacity}</p></div>}
              {detailEvent.target_audience && <div><span className="text-xs text-slate-400">Audience</span><p className="font-medium">{detailEvent.target_audience}</p></div>}
            </div>
            {writable && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" onClick={() => { setDetailEvent(null); openEdit(detailEvent); }}>Edit</Button>
                <Button onClick={() => { setDetailEvent(null); }} variant="outline">Close</Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── create/edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Event" : "Create Event"}>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div>
            <Label>Type *</Label>
            <AddableSelect
              value={form.type}
              options={typeValues}
              onChange={(v) => setForm({ ...form, type: v })}
              required
              addLabel="➕ Add new type…"
              placeholder="Type new event type"
              onDelete={isAdmin ? (v) => deleteValue.mutate({ field: "type", value: v, reassign_to: v === "other" ? "" : "other" }) : undefined}
            />
          </div>
          <div><Label>Date & Time *</Label><Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
          <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
          <div><Label>Target Audience</Label><Input value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} /></div>
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
