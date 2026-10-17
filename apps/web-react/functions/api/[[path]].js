// Pages Function: proxy /api/* to the deployed SkillBridge API worker.
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = new URL(
    url.pathname + url.search,
    "https://skillbridge-api.tanubhavj.workers.dev"
  );

  const headers = new Headers(request.headers);
  headers.set("host", "skillbridge-api.tanubhavj.workers.dev");

  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();

  const res = await fetch(target.toString(), {
    method: request.method,
    headers,
    body,
  });

  const resHeaders = new Headers(res.headers);
  resHeaders.set("Access-Control-Allow-Origin", url.origin);
  resHeaders.set("Vary", "Origin");

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}