import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, useState } from "react";

export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const ADD_NEW = "__add_new__";

/** Dropdown with an inline "➕ Add new…" option. Picking it swaps the dropdown
 *  for a text field so a brand-new value can be typed and saved (↩ reverts).
 *  Use for free-text value lists (branch, company, sector, …) — NOT for fixed
 *  enums whose backend rejects unknown values. */
export function AddableSelect({
  value,
  options,
  onChange,
  required,
  addLabel = "➕ Add new…",
  placeholder = "Type a new value",
  onDelete,
  deletable,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
  addLabel?: string;
  placeholder?: string;
  // When provided, a "Manage" toggle reveals removable chips. onDelete is called
  // (after a confirm) for the chosen value; it should delete the underlying data.
  onDelete?: (value: string) => void;
  deletable?: string[];
}) {
  const [adding, setAdding] = useState(!!value && !options.includes(value));
  const [managing, setManaging] = useState(false);

  const removable = (deletable ?? options).filter(Boolean);

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
        <Button type="button" variant="outline" onClick={() => { onChange(""); setAdding(false); }}>
          ↩
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <Select
          value={value}
          onChange={(e) => {
            if (e.target.value === ADD_NEW) { onChange(""); setAdding(true); }
            else onChange(e.target.value);
          }}
          required={required}
        >
          <option value="">— select —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
          <option value={ADD_NEW}>{addLabel}</option>
        </Select>
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            title="Delete an option"
            onClick={() => setManaging((m) => !m)}
          >
            🗑
          </Button>
        )}
      </div>

      {managing && onDelete && (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          {removable.length === 0 ? (
            <p className="text-xs text-slate-400">Nothing to remove.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {removable.map((o) => (
                <span key={o} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                  {o}
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    title={`Delete "${o}"`}
                    onClick={() => { if (confirm(`Delete "${o}"? This cannot be undone.`)) onDelete(o); }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50",
        styles,
        className
      )}
      {...props}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>;
}

const BADGE_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  passive: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  replied: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
  todo: "bg-slate-100 text-slate-600",
  doing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};

export function Badge({ value }: { value: string }) {
  const color = BADGE_COLORS[value] || "bg-brand-50 text-brand-700";
  return (
    <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize", color)}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
