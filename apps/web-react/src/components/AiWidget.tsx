import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import Assistant from "./Assistant";
import { useAiContext } from "../context/AiContext";
import { useAuth } from "../context/AuthContext";

// Global AI assistant: floating button (bottom-right) on every page.
// Hidden until the user is signed in.
export default function AiWidget() {
  const [open, setOpen] = useState(false);
  const { job } = useAiContext();
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-accent text-white shadow-lg shadow-accent/40 hover:bg-ink transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-butter"
        aria-label="Open AI assistant"
        title="AI Assistant"
      >
        <Sparkles className="w-6 h-6" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div
            className="card w-full max-w-lg max-h-[85vh] overflow-y-auto p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4 sticky top-0 bg-surface z-10 rounded-t-card">
              <h3 className="heading-card">AI Assistant</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost p-1.5"
                aria-label="Close assistant"
              >
                <X strokeWidth={1.5} className="w-4 h-4 text-ink" />
              </button>
            </div>
            <div className="p-6">
              <Assistant bare jobId={job?.id} jobTitle={job?.title} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}