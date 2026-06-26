import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
}

const ToastCtx = createContext<ToastApi>({} as ToastApi);

let idSeq = 1;

const STYLES: Record<ToastType, string> = {
  success: "border-l-green-500 bg-white",
  error: "border-l-red-500 bg-white",
  info: "border-l-brand-500 bg-white",
};
const ICONS: Record<ToastType, string> = { success: "✅", error: "⚠️", info: "ℹ️" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, detail?: string) => {
      const id = idSeq++;
      setItems((xs) => [...xs, { id, type, title, detail }]);
      window.setTimeout(() => remove(id), 6000);
    },
    [remove]
  );

  const api: ToastApi = {
    success: (t, d) => push("success", t, d),
    error: (t, d) => push("error", t, d),
    info: (t, d) => push("info", t, d),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-5 top-5 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-[slidein_0.2s_ease-out] rounded-lg border border-l-4 border-slate-200 px-4 py-3 shadow-lg ${STYLES[t.type]}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">{ICONS[t.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{t.title}</p>
                {t.detail && (
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-slate-500">{t.detail}</pre>
                )}
              </div>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
