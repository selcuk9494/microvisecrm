"use client";
import { useEffect, useState } from "react";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { apiFetch, apiBase } from "../../lib/api";
import { formatPhoneTR, normalizePhoneTR } from "../../lib/phone";

export default function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const d = await apiFetch(`/users`);
        setRows(d.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Personeller</h1>
        <a className="btn btn-primary" href="/users/new">Yeni Personel</a>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Ad Soyad</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{formatPhoneTR(u.phone || "")}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.active ? "Aktif" : "Pasif"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setEditing({ ...u, password: "" })}>Düzenle</button>
                    {u.active && (
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          try {
                            await fetch(apiBase() + "/users/" + u.id, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
                              body: JSON.stringify({ name: u.name, email: u.email, phone: u.phone, role: u.role, active: false })
                            });
                            const d = await (await fetch(apiBase() + "/users", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } })).json();
                            setRows(d.data || []);
                            toast.push({ id: Date.now(), text: "Pasif yapıldı", type: "success" });
                          } catch {
                            toast.push({ id: Date.now(), text: "İşlem başarısız", type: "error" });
                          }
                        }}
                      >
                        Sil
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        const pwd = Math.random().toString(36).slice(-10);
                        try {
                          await fetch(apiBase() + "/users/" + u.id, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
                            body: JSON.stringify({ password: pwd })
                          });
                          toast.push({ id: Date.now(), text: `Yeni parola: ${pwd}`, type: "success" });
                        } catch {
                          toast.push({ id: Date.now(), text: "Şifre sıfırlama başarısız", type: "error" });
                        }
                      }}
                    >
                      Şifre Sıfırla
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal open={!!editing} title="Personel Düzenle" onClose={() => setEditing(null)}>
        {editing && (
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const body = { name: editing.name, email: editing.email, phone: editing.phone, role: editing.role, active: editing.active, password: editing.password || undefined };
                await fetch(apiBase() + "/users/" + editing.id, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
                  body: JSON.stringify(body)
                });
                setEditing(null);
                const d = await (await fetch(apiBase() + "/users", { headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } })).json();
                setRows(d.data || []);
                toast.push({ id: Date.now(), text: "Güncellendi", type: "success" });
              } catch {
                toast.push({ id: Date.now(), text: "Kayıt başarısız", type: "error" });
              } finally {
                setSaving(false);
              }
            }}
          >
            <input className="input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ad Soyad" />
            <input className="input" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="Email" />
            <input className="input" value={formatPhoneTR(editing.phone || "")} onChange={e => setEditing({ ...editing, phone: normalizePhoneTR(e.target.value) })} placeholder="(533) 850 90 90" />
            <select className="input" value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}>
              <option value="personel">Personel</option>
              <option value="admin">Admin</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={!!editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
              Aktif
            </label>
            <input className="input" type="password" value={editing.password} onChange={e => setEditing({ ...editing, password: e.target.value })} placeholder="Yeni parola (opsiyonel)" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Vazgeç</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
