"use client";
import { useState } from "react";
import { apiBase } from "../../../lib/api";
import { formatPhoneTR, normalizePhoneTR } from "../../../lib/phone";

export default function NewUser() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "personel", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function onChange(e: any) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name==="phone" ? normalizePhoneTR(value) : value });
  }
  async function onSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(apiBase() + "/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Kayıt başarısız");
      }
      window.location.href = "/users";
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-semibold">Yeni Personel</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input className="input" name="name" placeholder="Ad Soyad" value={form.name} onChange={onChange} />
        <input className="input" name="email" placeholder="Email" value={form.email} onChange={onChange} />
        <input className="input" name="phone" placeholder="(533) 850 90 90" value={formatPhoneTR(form.phone)} onChange={onChange} />
        <select className="input" name="role" value={form.role} onChange={onChange}>
          <option value="personel">Personel</option>
          <option value="admin">Admin</option>
        </select>
        <input className="input" type="password" name="password" placeholder="Parola" value={form.password} onChange={onChange} />
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/users">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
