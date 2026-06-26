import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { canWrite, useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button } from "./ui";

interface Props {
  endpoint: string; // e.g. "/alumni/"
  filename: string; // e.g. "alumni"
  queryKey: string; // to refresh the list after import
}

export function CsvButtons({ endpoint, filename, queryKey }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    const res = await api.get(`${endpoint}export-csv/`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}.csv`);
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(`${endpoint}import-csv/`, fd);
      const { created, updated, errors } = res.data as {
        created: number;
        updated: number;
        errors: string[];
      };
      const parts = [`${created} added`, `${updated} updated (already existed)`];
      if (errors?.length) parts.push(`${errors.length} skipped`);
      const msg = `Import complete — ${parts.join(", ")}.`;
      const detail = errors?.length ? `Skipped rows:\n${errors.join("\n")}` : undefined;
      if (created === 0 && updated === 0) toast.info(msg, detail);
      else toast.success(msg, detail);
      qc.invalidateQueries({ queryKey: [queryKey] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) {
      toast.error("Import failed", JSON.stringify(err?.response?.data || err.message));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Button variant="outline" onClick={exportCsv}>⬇ Export CSV</Button>
      {canWrite(user) && (
        <>
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? "Importing…" : "⬆ Import CSV"}
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCsv} />
        </>
      )}
    </>
  );
}
