"use client";

export function apiBase() {
  if (typeof window !== "undefined") return "/api";
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

function apiBases(): string[] {
  const primary = apiBase();
  try {
    if (typeof window !== "undefined") return [primary];
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
