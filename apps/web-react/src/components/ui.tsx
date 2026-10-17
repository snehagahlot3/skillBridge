import type { ReactNode } from "react";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className={`card w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="btn-ghost">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value, size = "text-sm" }: { value: number | null; size?: string }) {
  if (value == null) return <span className="text-gray-400 text-xs">No ratings yet</span>;
  return (
    <span className={`${size} text-amber-500`} title={`${value.toFixed(1)} / 5`}>
      {"★".repeat(Math.round(value))}
      <span className="text-gray-300">{"★".repeat(5 - Math.round(value))}</span>
      <span className="text-gray-500 ml-1">{value.toFixed(1)}</span>
    </span>
  );
}

export function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl ${n <= value ? "text-amber-500" : "text-gray-300"}`}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "badge bg-gray-100 text-gray-700",
  open: "badge bg-green-100 text-green-800",
  awarded: "badge bg-blue-100 text-blue-800",
  in_progress: "badge bg-blue-100 text-blue-800",
  delivered: "badge bg-yellow-100 text-yellow-800",
  completed: "badge bg-green-100 text-green-800",
  revision_requested: "badge bg-orange-100 text-orange-800",
  disputed: "badge bg-red-100 text-red-800",
  cancelled: "badge bg-gray-100 text-gray-500",
  delisted: "badge bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={STATUS_STYLES[status] || "badge bg-gray-100 text-gray-700"}>{status.replace(/_/g, " ")}</span>;
}

export function Avatar({ name, className = "" }: { name?: string | null; className?: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold ${className}`}>
      {initials}
    </span>
  );
}