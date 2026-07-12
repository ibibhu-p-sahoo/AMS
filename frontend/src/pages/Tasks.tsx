import { useState } from "react";
import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge, Select } from "../components/ui";
import { useOptions } from "../lib/options";

interface Task {
  id: number;
  team: string;
  title: string;
  assignee_name: string;
  due_date: string | null;
  status: string;
}

const TEAMS = [
  { value: "outreach", label: "Outreach" },
  { value: "events", label: "Events" },
  { value: "referrals", label: "Referrals" },
  { value: "data", label: "Data / Directory" },
];
const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "doing", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

export default function Tasks() {
  const [team, setTeam] = useState("");
  const assignees = useOptions("/users/", "name");

  const columns: ColumnDef<Task>[] = [
    { key: "title", label: "Task", render: (r) => <span className="font-medium text-slate-800">{r.title}</span> },
    { key: "team", label: "Team", render: (r) => <span className="capitalize">{r.team}</span> },
    { key: "assignee_name", label: "Assignee", render: (r) => r.assignee_name || "—" },
    { key: "due_date", label: "Due", render: (r) => (r.due_date ? new Date(r.due_date).toLocaleDateString() : "—") },
    { key: "status", label: "Status", render: (r) => <Badge value={r.status} /> },
  ];

  return (
    <ResourcePage<Task>
      title="Task Management"
      subtitle="Team task tracker by team, assignee, due date and status"
      endpoint="/tasks/"
      queryKey="tasks"
      columns={columns}
      searchPlaceholder="Search tasks…"
      filterParams={{ team: team || undefined }}
      filters={
        <Select value={team} onChange={(e) => setTeam(e.target.value)} className="max-w-[170px]">
          <option value="">All teams</option>
          {TEAMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      }
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "team", label: "Team", type: "addable", required: true, options: TEAMS },
        { name: "assignee", label: "Assignee", type: "select", options: assignees },
        { name: "due_date", label: "Due date", type: "date" },
        { name: "status", label: "Status", type: "addable", options: STATUSES },
      ]}
    />
  );
}
