import { useState } from "react";
import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge, Button, Select } from "../components/ui";
import { useOptions } from "../lib/options";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";

interface Referral {
  id: number;
  student_name: string;
  company_name: string;
  alumni_name: string;
  stage: string;
  outcome: string;
  is_sla_breached: boolean;
}

const STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "referred", label: "Referred" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "closed", label: "Closed" },
];
const OUTCOMES = [
  { value: "pending", label: "Pending" },
  { value: "placed", label: "Placed" },
  { value: "rejected", label: "Rejected" },
  { value: "dropped", label: "Dropped" },
];

export default function Referrals() {
  const [stage, setStage] = useState("");
  const toast = useToast();
  const students = useOptions("/students/");
  const companies = useOptions("/companies/");
  const alumni = useOptions("/alumni/");

  const columns: ColumnDef<Referral>[] = [
    { key: "student_name", label: "Student", render: (r) => <span className="font-medium text-slate-800">{r.student_name || "—"}</span> },
    { key: "company_name", label: "Company", render: (r) => r.company_name || "—" },
    { key: "alumni_name", label: "Referred by (alumnus)", render: (r) => r.alumni_name || "—" },
    { key: "stage", label: "Stage", render: (r) => <Badge value={r.stage} /> },
    { key: "outcome", label: "Result", render: (r) => <Badge value={r.outcome} /> },
    {
      key: "sla",
      label: "Follow-up",
      render: (r) =>
        r.is_sla_breached ? (
          <span
            title="No follow-up in the last 48 hours — please check in with this contact."
            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
          >
            ⏰ Needs follow-up
          </span>
        ) : (
          <span
            title="Followed up within the last 48 hours."
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
          >
            ✓ On track
          </span>
        ),
    },
  ];

  return (
    <ResourcePage<Referral>
      title="Referrals & Placements"
      subtitle="Track alumni referring students to companies — and see who needs a follow-up (no update in 48 hours)."
      endpoint="/referrals/"
      queryKey="referrals"
      columns={columns}
      searchPlaceholder="Search…"
      filterParams={{ stage: stage || undefined }}
      filters={
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="max-w-[160px]">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      }
      extraRowActions={(row, refetch) => (
        <Button
          variant="outline"
          className="mr-3 px-2 py-1 text-xs"
          onClick={async () => {
            await api.post(`/referrals/${row.id}/followup/`);
            toast.success("Follow-up saved ✓");
            refetch();
          }}
        >
          Log follow-up
        </Button>
      )}
      fields={[
        { name: "student", label: "Student", type: "select", options: students },
        { name: "company", label: "Company", type: "select", options: companies },
        { name: "alumni", label: "Referred by (alumnus)", type: "select", options: alumni },
        { name: "stage", label: "Stage", type: "addable", options: STAGES },
        { name: "outcome", label: "Outcome", type: "addable", options: OUTCOMES },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
