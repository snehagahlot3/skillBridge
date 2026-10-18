import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import type { AppEnv } from "../types";

// Generic file upload/download (R2) for job attachments and deliveries.
export function fileRoutes() {
  const app = new Hono<AppEnv>();
  app.use("*", authMiddleware);

  // POST /api/files — multipart upload (field "file"). Max ~10 MB.
  app.post("/", async (c) => {
    const user = c.get("user");
    const form = await c.req.formData();
    const file = form.get("file") as unknown;
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return c.json({ error: "No file provided" }, 400);
    }
    const blob = file as Blob & { name?: string };
    if (blob.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large (max 10 MB)" }, 400);
    }
    const name = (blob.name || "file").slice(0, 200);
    const key = `uploads/${user.id}/${crypto.randomUUID()}-${name}`;
    await c.env.BUCKET.put(key, await blob.arrayBuffer(), {
      httpMetadata: { contentType: blob.type || "application/octet-stream" },
    });
    return c.json({ key, name }, 201);
  });

  // GET /api/files/... — download (authenticated). Keys contain slashes,
  // so the key is the remainder of the path.
  app.get("/*", async (c) => {
    const prefix = "/api/files/";
    const rawKey = c.req.path.slice(prefix.length);
    const key = decodeURIComponent(rawKey);
    const object = await c.env.BUCKET.get(key);
    if (!object) return c.json({ error: "File not found" }, 404);
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${key.split("/").pop() || "file"}"`,
      },
    });
  });

  return app;
}