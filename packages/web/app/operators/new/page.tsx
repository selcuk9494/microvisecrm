"use client";
import { useState } from "react";

export default function NewOperator() {
  const [form, setForm] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Kayıt başarısız");
      }
      window.location.href = "/operators";
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Yeni Operatör</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className="input" name="name" placeholder="Ad" value={form.name} onChange={onChange} />
        <input className="input" name="code" placeholder="Kod" value={form.code} onChange={onChange} />
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/operators">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
