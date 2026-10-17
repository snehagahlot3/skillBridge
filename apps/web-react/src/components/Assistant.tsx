import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../lib/api";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function Assistant({
  defaultMode,
  jobId,
  jobTitle,
  bare,
}: {
  defaultMode?: "owner" | "student";
  jobId?: string;
  jobTitle?: string;
  bare?: boolean;
}) {
  const [mode, setMode] = useState<"owner" | "student">(defaultMode ?? "owner");
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
      const res = await api.aiChat(mode, text, history, jobId);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const samplePrompt =
    mode === "owner"
      ? "I want more Diwali-season customers for my electronics shop — what should I ask a freelancer to do?"
      : "What is this job really asking for, and what should my quote cover?";

  return (
    <div className={bare ? "flex flex-col" : "card flex flex-col min-h-[520px]"}>
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-line pb-4 mb-3">
        <h3 className="heading-card">AI Assistant</h3>
        <div className="inline-flex rounded-[8px] border border-line bg-bg p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("owner");
              setMessages([]);
            }}
            className={`px-3 py-1.5 text-xs rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              mode === "owner"
                ? "bg-ink text-white font-semibold shadow-sm"
                : "text-muted hover:text-ink font-medium"
            }`}
          >
            I'm posting a job
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("student");
              setMessages([]);
            }}
            className={`px-3 py-1.5 text-xs rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              mode === "student"
                ? "bg-ink text-white font-semibold shadow-sm"
                : "text-muted hover:text-ink font-medium"
            }`}
          >
            I'm applying
          </button>
        </div>
      </div>

      <p className="text-xs text-muted mb-4 leading-relaxed">
        {mode === "owner"
          ? "Describe your business problem — I'll help you scope the job, skills, budget and milestones."
          : jobTitle
            ? `I can help you understand this job: “${jobTitle}”. Ask me anything about it.`
            : "Paste a job description or ask about a job — I'll help you understand what the owner needs."}
      </p>

      {error && (
        <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">
          {error}
        </div>
      )}

      {/* Chat Messages Panel with defined min-height */}
      <div className="space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto pr-1 mb-4 flex-1 flex flex-col justify-between">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 my-auto text-center">
            <p className="text-xs text-muted mb-3 font-medium">Try asking:</p>
            <button
              type="button"
              onClick={() => setInput(samplePrompt)}
              className="text-left text-xs bg-lavender text-ink px-4 py-2.5 rounded-[8px] border border-line hover:opacity-90 transition-opacity max-w-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
            >
              “{samplePrompt}”
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`rounded-[12px] px-4 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-ink text-white font-normal"
                      : "bg-surface border border-line text-ink"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        )}
        {busy && <p className="text-xs text-muted italic">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input Row */}
      <div className="flex gap-2 pt-2 border-t border-line">
        <input
          className="input"
          placeholder={mode === "owner" ? "Describe your idea or problem..." : "Ask about the job..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary shrink-0 px-4"
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label="Send message"
        >
          <Send strokeWidth={1.5} className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}