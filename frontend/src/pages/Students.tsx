import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Button } from "../components/ui";
import { CsvButtons } from "../components/CsvButtons";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";

interface Student {
  id: number;
  name: string;
  batch: number;
  branch: string;
  gpa: number | null;
  domain: string;
  skills: string[];
}

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "Other"];

export default function Students() {
  const toast = useToast();

  async function openBrochure(id: number) {
    try {
      const res = await api.get(`/students/${id}/brochure/`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error("Could not generate brochure");
    }
  }

  const columns: ColumnDef<Student>[] = [
    { key: "name", label: "Name", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "batch", label: "Batch", render: (r) => `${r.batch} / ${r.branch}` },
    { key: "gpa", label: "GPA", render: (r) => (r.gpa ?? "—") },
    { key: "domain", label: "Domain" },
    { key: "skills", label: "Skills", render: (r) => (Array.isArray(r.skills) ? r.skills.join(", ") : "—") },
  ];

  return (
    <ResourcePage<Student>
      title="Student / Talent Profiles"
      subtitle="Student records for matching to referrals"
      endpoint="/students/"
      queryKey="students"
      columns={columns}
      headerActions={<CsvButtons endpoint="/students/" filename="students" queryKey="students" />}
      searchPlaceholder="Search name, domain, email…"
      extraRowActions={(row) => (
        <Button variant="outline" className="mr-3 px-2 py-1 text-xs" onClick={() => openBrochure(row.id)}>
          📄 Brochure
        </Button>
      )}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "batch", label: "Batch (year)", type: "number", required: true },
        { name: "branch", label: "Branch", type: "addable", required: true, reassignTo: "Other", options: BRANCHES.map((b) => ({ value: b, label: b })) },
        { name: "gpa", label: "GPA", type: "number" },
        { name: "domain", label: "Domain" },
        { name: "email", label: "Email", type: "email" },
        { name: "project_highlights", label: "Project highlights", type: "textarea" },
      ]}
    />
  );
}
