import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { api, type ChatMessage, type Job } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar, StatusBadge } from "../components/ui";

type Scope = "group" | "mentor";

export default function Chat() {
  const { jobId } = useParams();
  const [params] = useSearchParams();
  const [scope, setScope] = useState<Scope>(params.get("scope") === "mentor" ? "mentor" : "group");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = jobId;
    if (!id) return;
    let cancelled = false;

    async function init(roomId: string, roomScope: Scope) {
      setStatus("connecting");
      setMessages([]);
      try {
        const [jobData, history] = await Promise.all([
          api.getJob(roomId),
          api.getMessages(roomId, roomScope),
        ]);
        if (cancelled) return;
        setJob(jobData);
        setMessages(history.messages);
        await api.markRead(roomId, roomScope);

        const ws = new WebSocket(api.chatSocketUrl(roomId, roomScope));
        socketRef.current = ws;
        ws.onopen = () => setStatus("open");
        ws.onclose = () => setStatus("closed");
        ws.onerror = () => setStatus("closed");
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data as string);
            if (data.type === "message" && data.message) {
              setMessages((prev) => [...prev.filter((m) => m.id !== data.message.id), data.message]);
              api.markRead(roomId, roomScope).catch(() => {});
            }
          } catch {
            // ignore
          }
        };
      } catch (err) {
        setError((err as Error).message);
      }
    }

    init(id, scope);

    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, scope]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || !jobId) return;
    setText("");
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ jobId, senderId: user?.id, senderName: user?.name, senderRole: user?.role, text: content }));
    } else {
      // REST fallback
      try {
        const res = await api.sendMessage(jobId, content, scope);
        setMessages((prev) => [...prev.filter((m) => m.id !== res.message.id), res.message]);
      } catch (err) {
        setError((err as Error).message);
      }
    }
  }

  const meId = user?.id;
  // The mentor-room toggle is only for mentors and students (team) — never owners.
  const canSeeMentorRoom =
    job != null && (job.myRole === "mentor" || job.myRole === "team");

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
              SkillBridge
            </Link>
            <span className="text-muted/40">/</span>
            {job ? (
              <div className="flex items-center gap-2">
                <Link to={`/jobs/${job.id}`} className="font-medium text-ink hover:text-accent transition-colors">
                  {job.title}
                </Link>
                <StatusBadge status={job.status} />
              </div>
            ) : (
              <span className="text-muted">Chat</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "open"
                    ? "bg-butter border border-ink"
                    : status === "connecting"
                      ? "bg-lavender"
                      : "bg-line"
                }`}
              />
              {status === "open" ? "live" : status === "connecting" ? "connecting…" : "offline (retry with REST)"}
            </span>
            <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] w-full px-6 py-6 flex-1 flex flex-col">
        {error && (
          <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">
            {error}
          </div>
        )}

        <div className="card flex-1 flex flex-col min-h-[65vh] max-h-[75vh] p-6">
          {/* Room toggle (mentors + students only) */}
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4 flex-wrap gap-2">
            {canSeeMentorRoom ? (
              <div className="inline-flex rounded-[8px] border border-line bg-bg p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setScope("group")}
                  className={`px-3 py-1.5 text-xs rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    scope === "group"
                      ? "bg-ink text-white font-semibold shadow-sm"
                      : "text-muted hover:text-ink font-medium"
                  }`}
                >
                  Group chat
                </button>
                <button
                  type="button"
                  onClick={() => setScope("mentor")}
                  className={`px-3 py-1.5 text-xs rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    scope === "mentor"
                      ? "bg-ink text-white font-semibold shadow-sm"
                      : "text-muted hover:text-ink font-medium"
                  }`}
                >
                  Mentor + team
                </button>
              </div>
            ) : (
              <span className="badge-lavender">Group chat</span>
            )}
            <p className="text-xs text-muted">
              {scope === "mentor"
                ? "Private — owner cannot see this room"
                : "Owner + team + mentor all see this room"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {messages.length === 0 && (
              <div className="empty-state my-auto">
                {scope === "mentor"
                  ? "No messages yet. This is the private room between the mentor and the hired team."
                  : `No messages yet. The business owner${job?.team && job.team.length > 0 ? ", the hired team" : ""}${job?.mentorId ? " and the assigned mentor" : ""} all see these messages.`}
              </div>
            )}
            {messages.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-2.5 max-w-[75%] ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={m.senderName} />
                    <div>
                      <div
                        className={`rounded-[12px] px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-ink text-white font-normal"
                            : "bg-surface border border-line text-ink"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                      </div>
                      <p className={`text-xs text-muted mt-1 ${mine ? "text-right" : ""}`}>
                        {m.senderName} · {m.senderRole} · {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line pt-4 mt-3 flex gap-2">
            <input
              className="input"
              placeholder={scope === "mentor" ? "Message the mentor + team privately..." : "Type a message..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
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
              disabled={!text.trim()}
              aria-label="Send message"
            >
              <Send strokeWidth={1.5} className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}