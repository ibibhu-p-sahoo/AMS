interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page number list: always show first, last, current ±1, with "…" gaps
  const pages: (number | "…")[] = [];
  const add = new Set<number>();
  [1, totalPages, page - 1, page, page + 1].forEach((n) => {
    if (n >= 1 && n <= totalPages) add.add(n);
  });
  const sorted = Array.from(add).sort((a, b) => a - b);
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) pages.push("…");
    pages.push(n);
  });

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      {/* left: records info */}
      <p className="text-xs text-slate-400">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total} records`}
      </p>

      {/* center: page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>

      {/* right: page size */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:border-brand-400 focus:outline-none"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
