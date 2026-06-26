import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Label, Select } from "../components/ui";

interface PublicEvent {
  id: number;
  title: string;
  date: string;
  venue: string;
}

export default function PublicRsvp() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [form, setForm] = useState({ event: "", name: "", email: "", person_type: "guest" });
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<PublicEvent[]>("/public/events/").then((r) => setEvents(r.data)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/public/rsvp/", { ...form, event: Number(form.event) });
      setDone(res.data.detail);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg p-8">
        <h1 className="text-xl font-bold text-slate-900">Event RSVP</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Reserve your spot for an upcoming event or drive.</p>
        {done ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{done}</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Event *</Label>
              <Select value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} required>
                <option value="">— choose an event —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {new Date(ev.date).toLocaleDateString()}
                  </option>
                ))}
              </Select>
              {events.length === 0 && <p className="mt-1 text-xs text-slate-400">No upcoming events right now.</p>}
            </div>
            <div>
              <Label>Your name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>You are a…</Label>
              <Select value={form.person_type} onChange={(e) => setForm({ ...form, person_type: e.target.value })}>
                <option value="guest">Guest</option>
                <option value="alumni">Alumnus</option>
                <option value="student">Student</option>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Submitting…" : "RSVP"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
