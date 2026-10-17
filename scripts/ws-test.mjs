// Group chat WebSocket test: owner + team member + mentor on one room.
// Verifies real-time delivery to 3+ participants.
const base = process.argv[2] || "http://127.0.0.1:8787";
const jobId = process.argv[3] || "job-004";

async function login(email, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login failed for ${email}: ${data.error}`);
  return data;
}

function connect(token, name) {
  const url = base.replace("http:", "ws:").replace("https:", "wss:") + `/api/chat/ws/${jobId}?token=${token}`;
  const ws = new WebSocket(url);
  const received = [];
  const waiters = [];
  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (data.type === "message") {
      received.push(data.message);
      waiters.forEach((w) => w());
      waiters.length = 0;
    }
  };
  const waitFor = (predicate, timeoutMs = 8000) =>
    new Promise((resolve, reject) => {
      const t0 = Date.now();
      const check = () => {
        if (predicate(received)) return resolve();
        if (Date.now() - t0 > timeoutMs) return reject(new Error(`timeout waiting for message (${name})`));
        waiters.push(check);
      };
      check();
    });
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ ws, received, waitFor });
    ws.onerror = () => reject(new Error(`ws error (${name})`));
  });
}

async function main() {
  console.log(`Group WS test: ${base} job ${jobId}`);
  const rajesh = await login("rajesh@demo.com", "demo12345");
  const priya = await login("priya@demo.com", "demo12345");
  const mentor = await login("mentor@demo.com", "mentor12345");

  const a = await connect(rajesh.token, "owner");
  const b = await connect(priya.token, "team");
  const c = await connect(mentor.token, "mentor");
  console.log("  owner + team + mentor connected (3 participants)");

  const text = `group-ws-${Date.now()}`;
  a.ws.send(JSON.stringify({
    jobId,
    senderId: rajesh.user.id,
    senderName: rajesh.user.name,
    senderRole: rajesh.user.role,
    text,
  }));

  await b.waitFor((msgs) => msgs.some((m) => m.text === text));
  await c.waitFor((msgs) => msgs.some((m) => m.text === text));
  await a.waitFor((msgs) => msgs.some((m) => m.text === text));
  console.log(`  PASS  message delivered to all 3 clients: "${text}"`);

  a.ws.close();
  b.ws.close();
  c.ws.close();
  console.log("RESULT: all group ws checks passed");
  process.exit(0);
}

main().catch((err) => {
  console.error("RESULT: FAILED —", err.message);
  process.exit(1);
});