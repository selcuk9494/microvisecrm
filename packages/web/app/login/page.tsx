"use client";
import { useState } from "react";
import { apiBase, apiFetch } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const base = apiBase();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      window.location.href = "/";
    } catch (err: any) {
      const msg = err?.name === "AbortError" ? "Zaman aşımı" : (err?.message || "Giriş başarısız");
      setError(`Bağlantı hatası: ${msg}. Sunucu: ${base}`);
    } finally {
      setLoading(false);
    }
  }
  async function testConnection() {
    setTesting(true);
    setError(null);
    try {
      const d = await apiFetch(`/health`);
      alert(`API bağlantısı OK (${d.ts})`);
    } catch (e: any) {
      setError(e?.message || "Bağlantı hatası");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-semibold">Giriş</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Giriş Yapılıyor..." : "Giriş Yap"}</button>
        <button type="button" className="btn btn-secondary" onClick={testConnection} disabled={testing}>Bağlantıyı Test Et</button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
      <div className="mt-2 text-xs text-slate-500">Sunucu: {base}</div>
    </div>
  );
}
