import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "../lib/api";

interface Notification {
  id: number;
  kind: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

const KIND_ICON: Record<string, string> = {
  event: "📅",
  task: "✅",
  job: "💼",
  system: "⚙️",
  general: "🔔",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Poll the unread count so the badge stays fresh across tabs/sessions.
  const { data: count } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => (await api.get<{ unread: number }>("/notifications/unread_count/")).data,
    refetchInterval: 30000,
  });
  const unread = count?.unread ?? 0;

  // Load the list only while the panel is open.
  const { data: list } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => fetchList<Notification>("/notifications/", { page_size: 20 }),
    enabled: open,
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.post("/notifications/mark_all_read/"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => api.post(`/notifications/${id}/read/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Close the panel on an outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function openItem(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  }

  const items = list?.results ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up 🎉</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    n.is_read ? "" : "bg-brand-50/50"
                  }`}
                >
                  <span className="text-base leading-none">{KIND_ICON[n.kind] || "🔔"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{n.title}</span>
                      {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                    </span>
                    {n.message && <span className="mt-0.5 block text-xs text-slate-500">{n.message}</span>}
                    <span className="mt-0.5 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
