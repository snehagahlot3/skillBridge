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
  const canSeeMentorRoom =
    job != null && (job.myRole === "mentor" || job.myRole === "team" || job.myRole === "admin");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
            <span className="text-gray-300">/</span>
            {job ? (
              <div className="flex items-center gap-2">
                <Link to={`/jobs/${job.id}`} className="font-medium hover:underline">{job.title}</Link>
                <StatusBadge status={job.status} />
              </div>
            ) : (
              <span className="text-gray-400">Chat</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${status === "open" ? "text-green-600" : status === "connecting" ? "text-yellow-600" : "text-gray-400"}`}>
              {status === "open" ? "● live" : status === "connecting" ? "● connecting…" : "○ offline (retry with REST)"}
            </span>
            <button onClick={() => navigate(-1)} className="btn-ghost">Back</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full px-4 py-4 flex-1 flex flex-col">
        {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="card flex-1 flex flex-col min-h-[60vh] max-h-[70vh]">
          {/* Room toggle */}
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div className="inline-flex rounded-lg border border-gray-300 p-1 gap-1">
              <button
                onClick={() => setScope("group")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${scope === "group" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Group chat
              </button>
              {canSeeMentorRoom && (
                <button
                  onClick={() => setScope("mentor")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md ${scope === "mentor" ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  Mentor + team
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {scope === "mentor"
                ? "Private — owner cannot see this room"
                : "Owner + team + mentor all see this room"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                {scope === "mentor"
                  ? "No messages yet. This is the private room between the mentor and the hired team."
                  : `No messages yet. The business owner${job?.team && job.team.length > 0 ? ", the hired team" : ""}${job?.mentorId ? " and the assigned mentor" : ""} all see these messages.`}
              </p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex items-start gap-2 max-w-[75%] ${mine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={m.senderName} />
                    <div>
                      <div className={`rounded-xl px-4 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${mine ? "text-right" : ""}`}>
                        {m.senderName} · {m.senderRole} · {new Date(m.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t pt-3 mt-3 flex gap-2">
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
            <button className="btn-primary shrink-0" onClick={send} disabled={!text.trim()}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}