import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge } from "../components/ui";

interface Audit {
  id: number;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
  timestamp: string;
}

export default function AuditLog() {
  const columns: ColumnDef<Audit>[] = [
    { key: "timestamp", label: "When", render: (r) => new Date(r.timestamp).toLocaleString() },
    { key: "user_name", label: "User", render: (r) => r.user_name || "system" },
    { key: "action", label: "Action", render: (r) => <Badge value={r.action} /> },
    { key: "entity", label: "Entity", render: (r) => `${r.entity}${r.entity_id ? ` #${r.entity_id}` : ""}` },
    { key: "summary", label: "Summary" },
  ];

  return (
    <ResourcePage<Audit>
      title="Admin Panel & Audit Log"
      subtitle="History of key actions for accountability (PRD §3, §10)"
      endpoint="/audit-log/"
      queryKey="audit-log"
      columns={columns}
      searchPlaceholder="Search entity or summary…"
      fields={[]}
    />
  );
}
