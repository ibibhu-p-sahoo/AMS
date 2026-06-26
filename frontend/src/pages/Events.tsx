import { ColumnDef, ResourcePage } from "../components/ResourcePage";

interface Event {
  id: number;
  title: string;
  type: string;
  date: string;
  venue: string;
  capacity: number | null;
  participant_count: number;
}

const TYPES = [
  { value: "drive", label: "Placement Drive" },
  { value: "webinar", label: "Webinar" },
  { value: "meetup", label: "Meetup" },
  { value: "mentorship", label: "Mentorship" },
  { value: "other", label: "Other" },
];

export default function Events() {
  const columns: ColumnDef<Event>[] = [
    { key: "title", label: "Event", render: (r) => <span className="font-medium text-slate-800">{r.title}</span> },
    { key: "type", label: "Type", render: (r) => <span className="capitalize">{r.type}</span> },
    { key: "date", label: "Date", render: (r) => new Date(r.date).toLocaleString() },
    { key: "venue", label: "Venue" },
    { key: "participant_count", label: "RSVPs" },
  ];

  return (
    <ResourcePage<Event>
      title="Events & Drives"
      subtitle="Create events, manage RSVPs and attendance"
      endpoint="/events/"
      queryKey="events"
      columns={columns}
      searchPlaceholder="Search events…"
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "type", label: "Type", type: "select", required: true, options: TYPES },
        { name: "date", label: "Date & time", type: "datetime-local", required: true },
        { name: "venue", label: "Venue" },
        { name: "capacity", label: "Capacity", type: "number" },
        { name: "target_audience", label: "Target audience" },
      ]}
    />
  );
}
