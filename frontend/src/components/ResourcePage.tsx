import { useState, ReactNode } from "react";
import Pagination from "./Pagination";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "./ui";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "textarea" | "select" | "checkbox" | "date" | "datetime-local";
  options?: { value: string | number; label: string }[];
  required?: boolean;
  // hide from the create/edit form (e.g. server-computed)
  hidden?: boolean;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  title: string;
  subtitle?: string;
  endpoint: string; // e.g. "/alumni/"
  queryKey: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  searchPlaceholder?: string;
  filters?: ReactNode;
  filterParams?: Record<string, unknown>;
  extraRowActions?: (row: T, refetch: () => void) => ReactNode;
  headerActions?: ReactNode;
}

export function ResourcePage<T extends { id: number }>({
  title,
  subtitle,
  endpoint,
  queryKey,
  columns,
  fields,
  searchPlaceholder,
  filters,
  filterParams,
  extraRowActions,
  headerActions,
}: Props<T>) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const writable = canWrite(user);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<T> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  const params = { search, page, page_size: pageSize, ...filterParams };
  const { data, isLoading, refetch } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => fetchList<T>(endpoint, params),
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing && (editing as T).id) {
        return (await api.patch(`${endpoint}${(editing as T).id}/`, payload)).data;
      }
      return (await api.post(endpoint, payload)).data;
    },
    onSuccess: () => {
      setModalOpen(false);
      toast.success(editing && (editing as T).id ? `${title} updated` : `${title} created`);
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => setError(JSON.stringify(e?.response?.data || "Error")),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      toast.success(`${title} deleted`);
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not delete record"),
  });

  function openCreate() {
    setEditing(null);
    const init: Record<string, unknown> = {};
    fields.forEach((f) => (init[f.name] = f.type === "checkbox" ? false : ""));
    setForm(init);
    setError("");
    setModalOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    const init: Record<string, unknown> = {};
    fields.forEach((f) => (init[f.name] = (row as any)[f.name] ?? (f.type === "checkbox" ? false : "")));
    setForm(init);
    setError("");
    setModalOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = form[f.name];
      if (f.type === "checkbox") {
        payload[f.name] = !!v;
        return;
      }
      const isEmpty = v === "" || v == null;
      if (isEmpty) {
        // Only send empty value for free-text fields (so they can be cleared).
        // For optional selects / FKs / numbers / dates, omit it entirely so the
        // backend default or null applies — "" is not a valid choice/pk/date.
        if (["text", "email", "textarea", undefined].includes(f.type)) {
          payload[f.name] = "";
        }
        return;
      }
      payload[f.name] = f.type === "number" ? Number(v) : v;
    });
    save.mutate(payload);
  }

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex items-center gap-2">
            {headerActions}
            {writable && fields.length > 0 && <Button onClick={openCreate}>+ New</Button>}
          </div>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder={searchPlaceholder || "Search…"}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        {filters}
        <span className="ml-auto text-sm text-slate-400">{total} records</span>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>
                ))}
                {(writable || extraRowActions) && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={columns.length + 1}>Loading…</td></tr>
              ) : data?.results.length === 0 ? (
                <tr><td className="px-4 py-6 text-slate-400" colSpan={columns.length + 1}>No records.</td></tr>
              ) : (
                data?.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-700">
                        {c.render ? c.render(row) : String((row as any)[c.key] ?? "—")}
                      </td>
                    ))}
                    {(writable || extraRowActions) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {extraRowActions?.(row, refetch)}
                        {writable && fields.length > 0 && (
                          <>
                            <button onClick={() => openEdit(row)} className="text-xs font-medium text-brand-600 hover:underline">Edit</button>
                            <button
                              onClick={() => { if (confirm("Delete this record?")) remove.mutate(row.id); }}
                              className="ml-3 text-xs font-medium text-red-600 hover:underline"
                            >Delete</button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(s) => { setPageSize(s); setPage(1); }}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${title}` : `New ${title}`}>
        <form onSubmit={submit} className="space-y-3">
          {fields.filter((f) => !f.hidden).map((f) => (
            <div key={f.name}>
              {f.type !== "checkbox" && <Label>{f.label}{f.required && " *"}</Label>}
              {f.type === "textarea" ? (
                <Textarea value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required} rows={4} />
              ) : f.type === "select" ? (
                <Select value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} required={f.required}>
                  <option value="">— select —</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />
                  {f.label}
                </label>
              ) : (
                <Input
                  type={f.type || "text"}
                  value={String(form[f.name] ?? "")}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  required={f.required}
                />
              )}
            </div>
          ))}
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

export { Badge };
