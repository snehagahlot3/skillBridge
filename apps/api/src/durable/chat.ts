// ChatRoom Durable Object — one instance per job.
// Room name: `job:<jobId>`. Uses SQLite-backed storage (required on the
// Workers Free plan). Holds message history and broadcasts over
// WebSockets to connected participants.
// The Worker validates auth + participation before forwarding requests,
// so this class only handles storage + sockets.

interface ChatMessage {
  id: string;
  jobId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

const HISTORY_LIMIT = 200;

export class ChatRoom {
  private sessions: Set<WebSocket>;

  constructor(private ctx: DurableObjectState) {
    this.sessions = new Set();
    ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS read_state (
        user_id TEXT PRIMARY KEY,
        at TEXT NOT NULL
      );
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      this.sessions.add(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    // GET /messages -> history
    if (request.method === "GET" && url.pathname.endsWith("/messages")) {
      return Response.json({ messages: this.getHistory() });
    }

    // POST /messages -> persist + broadcast
    if (request.method === "POST" && url.pathname.endsWith("/messages")) {
      const body = (await request.json()) as {
        senderId: string;
        senderName: string;
        senderRole: string;
        text: string;
        jobId: string;
      };
      const message = this.persist(body);
      return Response.json({ message });
    }

    // POST /read -> mark read up to now
    if (request.method === "POST" && url.pathname.endsWith("/read")) {
      const body = (await request.json()) as { userId: string };
      this.ctx.storage.sql.exec(
        "INSERT INTO read_state (user_id, at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET at = excluded.at",
        body.userId,
        new Date().toISOString()
      );
      return Response.json({ ok: true });
    }

    // GET /unread?userId= -> count of newer messages
    if (request.method === "GET" && url.pathname.endsWith("/unread")) {
      const userId = url.searchParams.get("userId") || "";
      return Response.json({ unread: this.unreadCount(userId) });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    try {
      const data = JSON.parse(String(raw)) as Omit<ChatMessage, "id" | "createdAt"> & { jobId: string };
      if (!data.text || !data.senderId || !data.jobId) return;
      const message = this.persist(data);
      this.broadcast({ type: "message", message });
    } catch {
      // ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    ws.close(1000, "bye");
  }

  async webSocketError(ws: WebSocket, err: unknown) {
    this.sessions.delete(ws);
    ws.close(1011, "error");
  }

  private persist(data: {
    jobId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    text: string;
  }): ChatMessage {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      jobId: data.jobId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      text: data.text.slice(0, 4000),
      createdAt: new Date().toISOString(),
    };
    this.ctx.storage.sql.exec(
      "INSERT INTO messages (id, job_id, sender_id, sender_name, sender_role, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      message.id,
      message.jobId,
      message.senderId,
      message.senderName,
      message.senderRole,
      message.text,
      message.createdAt
    );
    return message;
  }

  private getHistory(): ChatMessage[] {
    const cursor = this.ctx.storage.sql.exec(
      "SELECT id, job_id AS jobId, sender_id AS senderId, sender_name AS senderName, sender_role AS senderRole, text, created_at AS createdAt FROM messages ORDER BY created_at DESC LIMIT ?",
      HISTORY_LIMIT
    );
    const rows = [...cursor.toArray()] as unknown as ChatMessage[];
    return rows.reverse();
  }

  private unreadCount(userId: string): number {
    const readCursor = this.ctx.storage.sql.exec(
      "SELECT at FROM read_state WHERE user_id = ?",
      userId
    );
    const readRows = [...readCursor.toArray()] as unknown as { at: string }[];
    const lastRead = readRows[0]?.at || "";

    if (!lastRead) {
      const cursor = this.ctx.storage.sql.exec("SELECT COUNT(*) AS c FROM messages");
      const rows = [...cursor.toArray()] as unknown as { c: number }[];
      return rows[0]?.c ?? 0;
    }

    const cursor = this.ctx.storage.sql.exec(
      "SELECT COUNT(*) AS c FROM messages WHERE created_at > ?",
      lastRead
    );
    const rows = [...cursor.toArray()] as unknown as { c: number }[];
    return rows[0]?.c ?? 0;
  }

  private broadcast(payload: unknown) {
    const data = JSON.stringify(payload);
    for (const session of this.sessions) {
      try {
        session.send(data);
      } catch {
        this.sessions.delete(session);
      }
    }
  }
}