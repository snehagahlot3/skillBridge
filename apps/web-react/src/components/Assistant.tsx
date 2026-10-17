import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
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

  return (
    <div className={bare ? "flex flex-col" : "card flex flex-col"}>
      <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3 mb-3">
        <h3 className="font-semibold text-lg inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" /> AI Assistant
        </h3>
        <div className="inline-flex rounded-lg border border-gray-300 p-1 gap-1">
          <button
            onClick={() => { setMode("owner"); setMessages([]); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${mode === "owner" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            I'm posting a job
          </button>
          <button
            onClick={() => { setMode("student"); setMessages([]); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${mode === "student" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            I'm applying
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 -mt-1 mb-3">
        {mode === "owner"
          ? "Describe your business problem — I'll help you scope the job, skills, budget and milestones."
          : jobTitle
            ? `I can help you understand this job: “${jobTitle}”. Ask me anything about it.`
            : "Paste a job description or ask about a job — I'll help you understand what the owner needs."}
      </p>

      {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            {mode === "owner"
              ? "Try: “I want more Diwali-season customers for my electronics shop — what should I ask a freelancer to do?”"
              : "Try: “What is this job really asking for, and what should my quote cover?”"}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`rounded-xl px-4 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${m.role === "user" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-800"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-gray-400">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
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
        <button className="btn-primary shrink-0" onClick={send} disabled={busy || !input.trim()}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}