import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge } from "../components/ui";

interface Company {
  id: number;
  name: string;
  sector: string;
  is_in_placement_list: boolean;
  alumni_count: number;
}

export default function Companies() {
  const columns: ColumnDef<Company>[] = [
    { key: "name", label: "Company", render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: "sector", label: "Sector" },
    { key: "alumni_count", label: "Alumni" },
    {
      key: "is_in_placement_list",
      label: "Placement list",
      render: (r) => <Badge value={r.is_in_placement_list ? "active" : "passive"} />,
    },
  ];

  return (
    <ResourcePage<Company>
      title="Company / Employer Directory"
      subtitle="Employers organised by sector"
      endpoint="/companies/"
      queryKey="companies"
      columns={columns}
      searchPlaceholder="Search company or sector…"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "sector", label: "Sector" },
        { name: "is_in_placement_list", label: "On current placement list", type: "checkbox" },
      ]}
    />
  );
}
