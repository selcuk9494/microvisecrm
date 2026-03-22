"use client";

export function apiBase() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol || "http:";
    const host = window.location.hostname || "localhost";
    return `${proto}//${host}:3001`;
  }
  return "http://localhost:3001";
}

function apiBases(): string[] {
  const primary = apiBase();
  try {
    if (typeof window !== "undefined") {
      const u = new URL(primary);
      if (u.hostname === "localhost") {
        return [primary, `${u.protocol}//127.0.0.1:${u.port || "3001"}`];
      }
      if (u.hostname === "127.0.0.1") {
        return [primary, `${u.protocol}//localhost:${u.port || "3001"}`];
      }
    }
  } catch {}
  return [primary];
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let lastErr: any = null;
  for (const base of apiBases()) {
    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      res = await fetch(base + path, { ...init, headers, signal: controller.signal });
      clearTimeout(timeout);
    } catch (e: any) {
      lastErr = e;
      continue;
    }
    if (res.status === 401 && typeof window !== "undefined") {
      try {
        const rt = localStorage.getItem("refresh_token");
        if (rt) {
          const r = await fetch(base + "/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: rt })
          });
          if (r.ok) {
            const data = await r.json();
            localStorage.setItem("access_token", data.access_token);
            const hdrs = { ...headers, Authorization: `Bearer ${data.access_token}` };
            const retry = await fetch(base + path, { ...init, headers: hdrs });
            if (!retry.ok) {
              const body = await retry.text().catch(() => "");
              throw new Error(body || `API hatası: ${retry.status} ${retry.statusText}`);
            }
            return await retry.json();
          }
        }
      } catch {}
      try { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); } catch {}
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(body || `API hatası: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
  const msg = lastErr?.name === "AbortError" ? "Zaman aşımı" : (lastErr?.message || "Bağlantı hatası");
  throw new Error(`API bağlantısı başarısız (${msg}). Denenen sunucular: ${apiBases().join(", ")} Yol: ${path}`);
}
