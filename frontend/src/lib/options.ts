import { useQuery } from "@tanstack/react-query";
import { fetchList } from "./api";

/** Fetch up to `limit` records from an endpoint as {value,label} options for selects. */
export function useOptions(endpoint: string, labelKey = "name", limit = 200) {
  const { data } = useQuery({
    queryKey: ["options", endpoint],
    queryFn: () => fetchList<Record<string, any>>(endpoint, { page_size: limit }),
  });
  return (data?.results ?? []).map((r) => ({ value: r.id, label: r[labelKey] }));
}
