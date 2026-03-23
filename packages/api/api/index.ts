import app from "../src/index";

let ready: PromiseLike<unknown> | null = null;

function toQueryString(query: Record<string, unknown>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (key === "path") continue;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
      continue;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export default async function handler(req: any, res: any) {
  if (!ready) ready = app.ready();
  await ready;

  const path = req?.query?.path ? `/${String(req.query.path)}` : "/";
  const qs = req?.query ? toQueryString(req.query) : "";
  req.url = `${path}${qs}`;

  app.server.emit("request", req, res);
}
