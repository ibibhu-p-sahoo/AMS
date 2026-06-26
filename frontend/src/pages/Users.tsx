import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Badge, Button, Card, Input, Label, Modal, PageHeader, Select } from "../components/ui";

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_admin: boolean;
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "coordinator", label: "Coordinator" },
  { value: "volunteer", label: "Volunteer" },
  { value: "alumnus", label: "Alumnus (read-only)" },
  { value: "readonly", label: "Read-only" },
];

export default function Users() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "volunteer", password: "" });
  const [error, setError] = useState("");
  // Credential to reveal once after create / reset.
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => fetchList<ManagedUser>("/users/", { search }),
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role };
      if (form.password.trim()) payload.password = form.password.trim();
      return (await api.post("/users/", payload)).data;
    },
    onSuccess: (u) => {
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
      setCredential({ email: u.email, password: u.generated_password });
      toast.success("User created");
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const resetPw = useMutation({
    mutationFn: async (id: number) => (await api.post(`/users/${id}/reset-password/`)).data,
    onSuccess: (r) => {
      setCredential({ email: r.email, password: r.generated_password });
      toast.success("Password reset");
    },
    onError: () => toast.error("Could not reset password"),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: () => toast.error("Could not delete user"),
  });

  if (!user?.is_admin) {
    return <p className="text-sm text-slate-500">Only admins can manage users.</p>;
  }

  function openCreate() {
    setForm({ name: "", email: "", role: "volunteer", password: "" });
    setError("");
    setModalOpen(true);
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed")
    );
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Create login accounts and generate or reset passwords (admin only)."
        action={<Button onClick={openCreate}>+ New user</Button>}
      />

      {credential && (
        <Card className="mb-4 border-brand-300 bg-brand-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-800">Credentials — copy & share now</p>
              <p className="mt-1 text-xs text-slate-500">
                The password is shown only once. It is hashed in the database and cannot be retrieved later.
              </p>
              <div className="mt-3 space-y-1 font-mono text-sm text-slate-800">
                <div>Email:&nbsp;&nbsp;&nbsp;&nbsp;<span className="font-semibold">{credential.email}</span></div>
                <div>Password:&nbsp;<span className="font-semibold">{credential.password}</span></div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button variant="outline" onClick={() => copy(`${credential.email} / ${credential.password}`)}>Copy</Button>
              <Button variant="ghost" onClick={() => setCredential(null)}>Dismiss</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <span className="ml-auto text-sm text-slate-400">{data?.count ?? 0} users</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email (login)</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={5}>Loading…</td></tr>
              ) : data?.results.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={5}>No users.</td></tr>
              ) : (
                data?.results.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3"><Badge value={u.role} /></td>
                    <td className="px-4 py-3">
                      <Badge value={u.is_active ? "active" : "passive"} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => resetPw.mutate(u.id)}
                        disabled={resetPw.isPending}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        Reset password
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => { if (confirm(`Delete ${u.email}?`)) remove.mutate(u.id); }}
                          className="ml-3 text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New user">
        <form onSubmit={(e) => { e.preventDefault(); setError(""); create.mutate(); }} className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Email (this is the login) *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <Label>Role *</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="text"
              placeholder="Leave blank to auto-generate a strong password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">
              Blank = system generates one and shows it once after saving.
            </p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create user"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
