import type { ReactNode } from "react";
import { Check, Star, X } from "lucide-react";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className={`card w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[85vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-line pb-3">
          <h3 className="heading-card">{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close modal">
            <X strokeWidth={1.5} className="w-4 h-4 text-ink" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value, size = "text-sm" }: { value: number | null; size?: string }) {
  if (value == null) return <span className="text-muted text-xs">No ratings yet</span>;
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-1 ${size}`} title={`${value.toFixed(1)} / 5`}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            strokeWidth={1.5}
            className={`w-3.5 h-3.5 ${
              i <= rounded
                ? "text-ink fill-butter"
                : "text-line fill-transparent"
            }`}
          />
        ))}
      </span>
      <span className="text-muted text-xs font-mono tabular-nums ml-1">{value.toFixed(1)}</span>
    </span>
  );
}

export function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`${n} stars`}
        >
          <Star
            strokeWidth={1.5}
            className={`w-5 h-5 ${
              n <= value ? "text-ink fill-butter" : "text-line fill-transparent hover:text-lavender"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "badge-draft",
  open: "badge-open",
  awarded: "badge-lavender",
  in_progress: "badge-lavender",
  delivered: "badge-lavender",
  completed: "badge-lavender",
  revision_requested: "badge bg-lavender/60 border border-line text-ink font-medium",
  disputed: "badge bg-lavender/60 border border-line text-ink font-medium",
  cancelled: "badge-draft",
  delisted: "badge-draft",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={STATUS_STYLES[status] || "badge-draft"}>{status.replace(/_/g, " ")}</span>;
}

export function VerifiedBadge({ label = "Verified business" }: { label?: string }) {
  return (
    <span className="badge-verified">
      <Check strokeWidth={1.5} className="w-3.5 h-3.5 text-ink shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function Avatar({ name, className = "" }: { name?: string | null; className?: string }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-lavender text-ink text-xs font-semibold shrink-0 ${className}`}>
      {initials}
    </span>
  );
}