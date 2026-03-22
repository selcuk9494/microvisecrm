"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useRouter, useSearchParams } from "next/navigation";

export default function Licenses() {
  const [status, setStatus] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favName, setFavName] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    license_name: "",
    license_key: "",
    activation_date: "",
    end_date: "",
    device: "",
    status: "aktif",
    notes: ""
  });
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (status) qs.set("filter[status]", status);
      if (customerId) qs.set("filter[customer_id]", customerId);
      if (dateFrom) qs.set("filter[date_from]", dateFrom);
      if (dateTo) qs.set("filter[date_to]", dateTo);
      if (showDeleted) qs.set("include_deleted", "1");
      if (sortKey) qs.set("sort_by", sortKey);
      if (sortDir) qs.set("sort_dir", sortDir);
      const data = await apiFetch(`/licenses?${qs.toString()}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [page, showDeleted]);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiFetch(`/customers?page=1&pageSize=999`);
        setCustomers(data.data || []);
      } catch {}
    };
    run();
  }, []);
  useEffect(() => {
    const p = Number(searchParams.get("page") || 1);
    const st = searchParams.get("filter[status]") || "";
    const cid = searchParams.get("filter[customer_id]") || "";
    const df = searchParams.get("filter[date_from]") || "";
    const dt = searchParams.get("filter[date_to]") || "";
    const inc = searchParams.get("include_deleted") === "1";
    const sk = searchParams.get("sort_by") || "";
    const sd = (searchParams.get("sort_dir") as "asc" | "desc") || "asc";
    setPage(p);
    setStatus(st);
    setCustomerId(cid);
    setDateFrom(df);
    setDateTo(dt);
    setShowDeleted(inc);
    setSortKey(sk);
    setSortDir(sd);
    apiFetch(`/favorites?pageKey=licenses`).then(d => setFavorites(d.data || [])).catch(() => {});
  }, []);

  function replaceUrl(nextPage: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(nextPage));
    qs.set("pageSize", String(pageSize));
    if (status) qs.set("filter[status]", status);
    if (customerId) qs.set("filter[customer_id]", customerId);
    if (dateFrom) qs.set("filter[date_from]", dateFrom);
    if (dateTo) qs.set("filter[date_to]", dateTo);
    if (showDeleted) qs.set("include_deleted", "1");
    if (sortKey) qs.set("sort_by", sortKey);
    if (sortDir) qs.set("sort_dir", sortDir);
    router.replace(`/licenses?${qs.toString()}`);
  }
  function applyFilters() {
    setPage(1);
    replaceUrl(1);
    load();
  }
  function onSort(key: string) {
    const dir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(dir);
    setTimeout(() => applyFilters(), 0);
  }
  async function saveFavorite() {
    if (!favName.trim()) return;
    await apiFetch(`/favorites`, {
      method: "POST",
      body: JSON.stringify({
        pageKey: "licenses",
        name: favName.trim(),
        params: { status, customerId, dateFrom, dateTo, showDeleted, sortKey, sortDir }
      })
    });
    const d = await apiFetch(`/favorites?pageKey=licenses`);
    setFavorites(d.data || []);
  }
  async function applyFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    setStatus(f.params.status || "");
    setCustomerId(f.params.customerId || "");
    setDateFrom(f.params.dateFrom || "");
    setDateTo(f.params.dateTo || "");
    setShowDeleted(!!f.params.showDeleted);
    setSortKey(f.params.sortKey || "");
    setSortDir(f.params.sortDir || "asc");
    setTimeout(() => applyFilters(), 0);
  }
  async function deleteFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    await apiFetch(`/favorites/${f.id}`, { method: "DELETE" });
    const d = await apiFetch(`/favorites?pageKey=licenses`);
    setFavorites(d.data || []);
  }

  async function openEdit(id: string) {
    setEditingId(id);
    setSaving(false);
    try {
      const data = await apiFetch(`/licenses/${id}`);
      const act = data.activationDate ? new Date(data.activationDate) : null;
      const end = data.endDate ? new Date(data.endDate) : null;
      const fmt = (d: Date | null) =>
        d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
      setForm({
        customer_id: data.customerId || "",
        license_name: data.licenseName || "",
        license_key: data.licenseKey || "",
        activation_date: fmt(act),
        end_date: fmt(end),
        device: data.device || "",
        status: data.status || "aktif",
        notes: data.notes || ""
      });
    } catch {
      toast.push({ id: Date.now(), text: "Kayıt getirilemedi", type: "error" });
      setEditingId(null);
    }
  }

  function onChange(e: any) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.customer_id || !form.license_name || !form.license_key) {
      toast.push({ id: Date.now(), text: "Müşteri, lisans adı ve anahtar zorunlu", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/licenses/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_id: form.customer_id,
          license_name: form.license_name,
          license_key: form.license_key,
          activation_date: form.activation_date || undefined,
          end_date: form.end_date || undefined,
          device: form.device,
          status: form.status,
          notes: form.notes
        })
      });
      setEditingId(null);
      await load();
      toast.push({ id: Date.now(), text: "Lisans güncellendi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Güncelleme başarısız", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!toDelete) return;
    setLoading(true);
    try {
      await apiFetch(`/licenses/${toDelete}`, { method: "DELETE" });
      setToDelete(null);
      await load();
      toast.push({ id: Date.now(), text: "Lisans silindi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lisanslar</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const lines = [
                ["Ad", "Anahtar", "Cihaz", "Durum", "Bitiş"],
                ...rows.map((r) => [
                  r.licenseName || "",
                  r.licenseKey || "",
                  r.device || "",
                  r.status || "",
                  r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""
                ]),
              ]
                .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "licenses.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            CSV Dışa Aktar
          </button>
          <a href="/licenses/new" className="btn btn-primary">Yeni Lisans</a>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-4">
        <select className="input max-w-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Durum</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
        <select className="input max-w-xs" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Müşteri</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
        </select>
        <input className="input max-w-xs" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input className="input max-w-xs" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn btn-secondary" onClick={applyFilters} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          Silinmişleri göster
        </label>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <input className="input max-w-xs" placeholder="Favori adı" value={favName} onChange={e => setFavName(e.target.value)} />
        <button className="btn btn-secondary" onClick={saveFavorite}>Favoriyi Kaydet</button>
        <select className="input max-w-xs" onChange={e => applyFavorite(e.target.value)} value="">
          <option value="" disabled>Favori seç</option>
          {favorites.map((f: any) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { if (favName) deleteFavorite(favName); }}>Favoriyi Sil</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("licenseName")}>Ad {sortKey==="licenseName" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2">Anahtar</th>
              <th className="px-3 py-2">Cihaz</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("status")}>Durum {sortKey==="status" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("endDate")}>Bitiş {sortKey==="endDate" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={`border-t ${l.deletedAt ? "text-slate-400 line-through opacity-70" : ""}`}>
                <td className="px-3 py-2">{l.licenseName}</td>
                <td className="px-3 py-2">{l.licenseKey}</td>
                <td className="px-3 py-2">{l.device}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2">{l.endDate ? new Date(l.endDate).toLocaleDateString("tr-TR") : ""}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {!l.deletedAt ? (
                      <>
                        <button className="btn btn-secondary" onClick={() => openEdit(l.id)}>Düzenle</button>
                        <button className="btn btn-secondary" onClick={() => setToDelete(l.id)}>Sil</button>
                      </>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          await apiFetch(`/licenses/${l.id}/restore`, { method: "PATCH" });
                          await load();
                        }}
                      >
                        {loading ? "..." : "Geri Al"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Kayıt bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Toplam {total}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { const np = Math.max(1, page - 1); setPage(np); replaceUrl(np); }} disabled={page === 1}>Önceki</button>
          <div className="rounded-md border px-3 py-2 text-sm">{page}</div>
          <button className="btn btn-secondary" onClick={() => { const np = page + 1; setPage(np); replaceUrl(np); }} disabled={page * pageSize >= total}>Sonraki</button>
        </div>
      </div>
      <Modal open={!!toDelete} title="Silme Onayı" onClose={() => setToDelete(null)}>
        <div className="mb-4">Bu lisansı silmek istiyor musun?</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={() => setToDelete(null)}>Vazgeç</button>
          <button className="btn btn-primary" onClick={onConfirmDelete}>Sil</button>
        </div>
      </Modal>
      <Modal open={!!editingId} title="Lisans Düzenle" onClose={() => setEditingId(null)}>
        <form onSubmit={onSubmit} className="grid gap-3">
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.customerName}
              </option>
            ))}
          </select>
          <input className="input" name="license_name" placeholder="Lisans adı" value={form.license_name} onChange={onChange} />
          <input className="input" name="license_key" placeholder="Lisans anahtarı" value={form.license_key} onChange={onChange} />
          <input className="input" type="date" name="activation_date" value={form.activation_date} onChange={onChange} />
          <input className="input" type="date" name="end_date" value={form.end_date} onChange={onChange} />
          <input className="input" name="device" placeholder="Cihaz" value={form.device} onChange={onChange} />
          <select className="input" name="status" value={form.status} onChange={onChange}>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <textarea className="input" name="notes" placeholder="Notlar" value={form.notes} onChange={onChange} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
