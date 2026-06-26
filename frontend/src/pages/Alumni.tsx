import { useState } from "react";
import { ColumnDef, ResourcePage } from "../components/ResourcePage";
import { Badge, Select } from "../components/ui";
import { CsvButtons } from "../components/CsvButtons";
import { useOptions } from "../lib/options";

interface Alumnus {
  id: number;
  name: string;
  batch: number;
  branch: string;
  company_name: string;
  role_level: string;
  domain: string;
  city: string;
  email: string;
  phone: string;
  linkedin: string;
  status: string;
  is_super_alumni: boolean;
  willingness: number;
}

function linkedinUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
}

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "Mech", "Civil", "Other"];
const ROLE_LEVELS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Manager" },
  { value: "exec", label: "Executive" },
];

export default function Alumni() {
  const [branch, setBranch] = useState("");
  const [city, setCity] = useState("");
  const companyOptions = useOptions("/companies/");

  const columns: ColumnDef<Alumnus>[] = [
    {
      key: "name",
      label: "Name",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{r.name}</span>
          {r.is_super_alumni && <span title="Super alumnus">⭐</span>}
        </div>
      ),
    },
    { key: "batch", label: "Batch", render: (r) => `${r.batch} / ${r.branch}` },
    { key: "company_name", label: "Company", render: (r) => r.company_name || "—" },
    { key: "city", label: "City" },
    {
      key: "contact",
      label: "Contact",
      render: (r) => (
        <div className="text-xs leading-relaxed" onClick={(e) => e.stopPropagation()}>
          {r.email ? (
            <a href={`mailto:${r.email}`} className="block text-brand-600 hover:underline">{r.email}</a>
          ) : null}
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-slate-500">
            {r.phone && <a href={`tel:${r.phone}`} className="hover:text-slate-700">📞 {r.phone}</a>}
            {r.linkedin && (
              <a href={linkedinUrl(r.linkedin)} target="_blank" rel="noreferrer" className="hover:text-brand-600">
                in ↗
              </a>
            )}
          </div>
          {!r.email && !r.phone && !r.linkedin && <span className="text-slate-300">—</span>}
        </div>
      ),
    },
    { key: "willingness", label: "Willingness", render: (r) => "★".repeat(r.willingness) },
    { key: "status", label: "Status", render: (r) => <Badge value={r.status} /> },
  ];

  return (
    <ResourcePage<Alumnus>
      title="Alumni Directory"
      subtitle="Master alumni records — segment by branch, city, domain or willingness"
      endpoint="/alumni/"
      queryKey="alumni"
      columns={columns}
      headerActions={<CsvButtons endpoint="/alumni/" filename="alumni" queryKey="alumni" />}
      searchPlaceholder="Search name, email, domain, city…"
      filterParams={{ branch: branch || undefined, city: city || undefined }}
      filters={
        <>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="max-w-[150px]">
            <option value="">All branches</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <input
            placeholder="City filter…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </>
      }
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "batch", label: "Batch (year)", type: "number", required: true },
        { name: "branch", label: "Branch", type: "select", required: true, options: BRANCHES.map((b) => ({ value: b, label: b })) },
        { name: "company", label: "Company", type: "select", options: companyOptions },
        { name: "role_level", label: "Role level", type: "select", options: ROLE_LEVELS },
        { name: "domain", label: "Domain" },
        { name: "city", label: "City" },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone" },
        { name: "linkedin", label: "LinkedIn" },
        { name: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "passive", label: "Passive" }] },
        { name: "willingness", label: "Willingness (1–5)", type: "number" },
        { name: "is_super_alumni", label: "Super alumnus", type: "checkbox" },
        { name: "consent_given", label: "DPDP consent given", type: "checkbox" },
      ]}
    />
  );
}
