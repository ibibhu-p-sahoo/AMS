import { useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Label, Select } from "../components/ui";
import { isValidEmail } from "../lib/validation";
import { fileToAvatarDataUrl } from "../lib/image";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "MBA", "Other"];
const ROLE_LEVELS = [
  { value: "", label: "— select —" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Manager" },
  { value: "exec", label: "Executive" },
];

const EMPTY = {
  name: "", email: "", batch: "", branch: "", company: "",
  role_level: "", domain: "", city: "", phone: "", linkedin: "", photo: "",
};

export default function PublicAlumniForm() {
  const [form, setForm] = useState({ ...EMPTY });
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/public/alumni/", {
        ...form,
        batch: Number(form.batch),
        phone: form.phone.replace(/[^\d+\-()\s]/g, ""),
      });
      setDone(res.data.detail);
    } catch (err: any) {
      const data = err?.response?.data;
      const first = data && typeof data === "object" ? Object.values(data)[0] : null;
      setError(Array.isArray(first) ? String(first[0]) : data?.detail || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <Card className="w-full max-w-xl p-8">
        <h1 className="text-xl font-bold text-slate-900">Alumni Profile</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Update your details so we can keep you in the loop. We match you by email —
          if you're already in our records, your profile is updated.
        </p>
        {done ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{done}</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-4">
              {form.photo ? (
                <img src={form.photo} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">👤</div>
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
                        set("photo", await fileToAvatarDataUrl(file));
                      } catch {
                        setError("Could not read that image.");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.photo && (
                  <button type="button" onClick={() => set("photo", "")} className="text-xs text-red-500 hover:underline">
                    Remove photo
                  </button>
                )}
              </div>
            </div>
            <div>
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              {form.email.trim() !== "" && !isValidEmail(form.email) && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email address (e.g. name@example.com).</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Batch (graduation year) *</Label>
                <Input type="number" value={form.batch} onChange={(e) => set("batch", e.target.value)} required />
              </div>
              <div>
                <Label>Branch *</Label>
                <Select value={form.branch} onChange={(e) => set("branch", e.target.value)} required>
                  <option value="">— select —</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Google" />
              </div>
              <div>
                <Label>Role level</Label>
                <Select value={form.role_level} onChange={(e) => set("role_level", e.target.value)}>
                  {ROLE_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Domain / role</Label>
                <Input value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="e.g. Backend" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bengaluru" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/[^\d+\-()\s]/g, ""))}
                />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/…" />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Submitting…" : "Submit"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
