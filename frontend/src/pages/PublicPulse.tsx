import { useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Label, Select, Textarea } from "../components/ui";

const TIMELINES = [
  { value: "now", label: "Hiring now" },
  { value: "1-3m", label: "1–3 months" },
  { value: "3-6m", label: "3–6 months" },
  { value: "none", label: "Not hiring" },
];

export default function PublicPulse() {
  const [form, setForm] = useState({ email: "", hiring: false, roles: "", timeline: "none" });
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/public/job-intel/", form);
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
        <h1 className="text-xl font-bold text-slate-900">Monthly Hiring Pulse</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Alumni — let us know your team's hiring status. Sign in with the email on your alumni record.
        </p>
        {done ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{done}</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Your alumni email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.hiring} onChange={(e) => setForm({ ...form, hiring: e.target.checked })} />
              We are currently hiring
            </label>
            <div>
              <Label>Open roles</Label>
              <Textarea rows={3} value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} placeholder="e.g. 2x Backend Engineer, 1x Data Analyst" />
            </div>
            <div>
              <Label>Hiring timeline</Label>
              <Select value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}>
                {TIMELINES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Submitting…" : "Submit"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
