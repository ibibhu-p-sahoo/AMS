import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Button } from "../components/ui";
import { useOptions } from "../lib/options";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";

interface Campaign {
  id: number;
  name: string;
  channel: string;
  owner_name: string;
  template_name: string;
  contact_count: number;
  segment_filter: Record<string, string>;
}

const CHANNELS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp (logged)" },
  { value: "linkedin", label: "LinkedIn (logged)" },
];
const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "Other"];

function segmentText(seg: Record<string, string>) {
  if (!seg || Object.keys(seg).length === 0) return "—";
  return Object.entries(seg).map(([k, v]) => `${k}: ${v}`).join(", ");
}

export default function Campaigns() {
  const templateOptions = useOptions("/templates/");
  const toast = useToast();

  const columns: ColumnDef<Campaign>[] = [
    { key: "name", label: "Campaign", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "channel", label: "Channel", render: (r) => <span className="capitalize">{r.channel}</span> },
    { key: "segment", label: "Segment", render: (r) => <span className="text-xs text-slate-500">{segmentText(r.segment_filter)}</span> },
    { key: "contact_count", label: "Contacts" },
    { key: "template_name", label: "Template", render: (r) => r.template_name || "—" },
  ];

  return (
    <ResourcePage<Campaign>
      title="Outreach & Campaigns"
      subtitle="Define a segment → Populate contacts → Send. WhatsApp/LinkedIn are logged, not auto-sent (PRD §8)."
      endpoint="/campaigns/"
      queryKey="campaigns"
      columns={columns}
      searchPlaceholder="Search campaigns…"
      extraRowActions={(row, refetch) => (
        <>
          <Button
            variant="outline"
            className="mr-2 px-2 py-1 text-xs"
            onClick={async () => {
              const res = await api.post(`/campaigns/${row.id}/populate/`);
              toast.success(`Segment matched ${res.data.matched} alumni · ${res.data.added} new contact(s) added.`);
              refetch();
            }}
          >
            Populate
          </Button>
          <Button
            variant="outline"
            className="mr-3 px-2 py-1 text-xs"
            onClick={async () => {
              const res = await api.post(`/campaigns/${row.id}/send/`);
              toast.success(`${res.data.sent} ${res.data.channel} touch(es) sent.`);
              refetch();
            }}
          >
            Send
          </Button>
        </>
      )}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "channel", label: "Channel", type: "select", required: true, options: CHANNELS },
        { name: "template", label: "Template", type: "select", options: templateOptions },
        { name: "seg_branch", label: "Segment — branch", type: "select", options: BRANCHES.map((b) => ({ value: b, label: b })) },
        { name: "seg_city", label: "Segment — city", type: "text" },
        { name: "seg_domain", label: "Segment — domain", type: "text" },
      ]}
    />
  );
}
