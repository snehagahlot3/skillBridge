import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useAiContext } from "../context/AiContext";
import Md from "./Md";

type Mode = "owner" | "student" | "mentor";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const MODE_LABELS: Record<Mode, string> = {
  mentor: "Mentor mode",
  owner: "Posting mode",
  student: "Applying mode",
};

const MODE_HINTS: Record<Mode, string> = {
  mentor:
    "I'm your mentor assistant — ask me how to guide the hired team, review milestone work, or give feedback.",
  owner:
    "Describe your business problem — I'll help you scope the job, skills, budget and milestones.",
  student:
    "I can help you understand this job and craft a strong quote. Ask me anything about it.",
};

export default function Assistant({
  jobId,
  jobTitle,
  bare,
}: {
  jobId?: string;
  jobTitle?: string;
  bare?: boolean;
}) {
  const { user, me } = useAuth();
  const { job } = useAiContext();

  // Auto-detect mode: mentor role -> mentor; job page with owner role ->
  // posting; otherwise applying. Without context, owners with a business
  // profile default to posting mode.
  let detected: Mode = "student";
  if (user?.role === "mentor") detected = "mentor";
  else if (job) detected = job.myRole === "owner" ? "owner" : "student";
  else if (me?.business) detected = "owner";

  const mode: Mode = detected;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError("");
    const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await api.aiChat(mode, text, history, jobId ?? job?.id);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={bare ? "flex flex-col" : "card flex flex-col min-h-[520px]"}>
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-line pb-4 mb-3">
        <h3 className="heading-card">AI Assistant</h3>
        <span className="badge-lavender">{MODE_LABELS[mode]}</span>
      </div>

      <p className="text-xs text-muted mb-3 leading-relaxed">
        {jobTitle || job?.title
          ? `About “${jobTitle || job?.title}”: ${MODE_HINTS[mode]}`
          : MODE_HINTS[mode]}
      </p>

      {error && <div className="mb-3 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">{error}</div>}

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted text-center py-4">
            {mode === "mentor"
              ? "Try: “How should I review this milestone work?”"
              : mode === "owner"
                ? "Try: “I want more Diwali-season customers for my electronics shop — what should I ask a freelancer to do?”"
                : "Try: “What is this job really asking for, and what should my quote cover?”"}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="rounded-[10px] px-4 py-2.5 text-sm max-w-[85%] bg-accent text-white whitespace-pre-wrap leading-relaxed">
                {m.content}
              </div>
            ) : (
              <div className="rounded-[10px] px-4 py-2.5 max-w-[85%] bg-bg border border-line">
                <Md text={m.content} />
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-muted">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder={
            mode === "mentor"
              ? "Ask about guiding this job..."
              : mode === "owner"
                ? "Describe your idea or problem..."
                : "Ask about the job..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn-primary shrink-0" onClick={send} disabled={busy || !input.trim()}>
          <Send strokeWidth={1.5} className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}