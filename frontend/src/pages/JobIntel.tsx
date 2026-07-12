import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge } from "../components/ui";
import { useOptions } from "../lib/options";

interface JobIntel {
  id: number;
  alumni_name: string;
  hiring: boolean;
  roles: string;
  timeline: string;
  submitted_at: string;
}

const TIMELINES = [
  { value: "now", label: "Hiring now" },
  { value: "1-3m", label: "1–3 months" },
  { value: "3-6m", label: "3–6 months" },
  { value: "none", label: "Not hiring" },
];

export default function JobIntel() {
  const alumni = useOptions("/alumni/");

  const columns: ColumnDef<JobIntel>[] = [
    { key: "alumni_name", label: "Alumnus", render: (r) => <span className="font-medium text-slate-800">{r.alumni_name}</span> },
    { key: "hiring", label: "Hiring?", render: (r) => <Badge value={r.hiring ? "active" : "passive"} /> },
    { key: "roles", label: "Open roles" },
    { key: "timeline", label: "Timeline", render: (r) => TIMELINES.find((t) => t.value === r.timeline)?.label || r.timeline },
    { key: "submitted_at", label: "Submitted", render: (r) => new Date(r.submitted_at).toLocaleDateString() },
  ];

  return (
    <ResourcePage<JobIntel>
      title="Job-Intel / Hiring Pulse"
      subtitle="Monthly survey of alumni capturing hiring status, open roles and timeline"
      endpoint="/job-intel/"
      queryKey="job-intel"
      columns={columns}
      searchPlaceholder="Search…"
      fields={[
        { name: "alumni", label: "Alumnus", type: "select", required: true, options: alumni },
        { name: "hiring", label: "Currently hiring", type: "checkbox" },
        { name: "roles", label: "Open roles", type: "textarea" },
        { name: "timeline", label: "Timeline", type: "addable", options: TIMELINES },
      ]}
    />
  );
}
