"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useRouter, useSearchParams } from "next/navigation";

export default function Lines() {
  const [status, setStatus] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [simNo, setSimNo] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favName, setFavName] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    line_number: "",
    imei_number: "",
    operator_id: "",
    activation_date: "",
    end_date: "",
    status: "aktif",
    description: ""
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
       if (operatorId) qs.set("filter[operator_id]", operatorId);
       if (simNo) qs.set("filter[sim_no]", simNo);
       if (dateFrom) qs.set("filter[date_from]", dateFrom);
       if (dateTo) qs.set("filter[date_to]", dateTo);
      if (showDeleted) qs.set("include_deleted", "1");
      if (sortKey) qs.set("sort_by", sortKey);
      if (sortDir) qs.set("sort_dir", sortDir);
      const data = await apiFetch(`/lines?${qs.toString()}`);
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
    const p = Number(searchParams.get("page") || 1);
    const st = searchParams.get("filter[status]") || "";
    const cid = searchParams.get("filter[customer_id]") || "";
    const oid = searchParams.get("filter[operator_id]") || "";
    const sn = searchParams.get("filter[sim_no]") || "";
    const df = searchParams.get("filter[date_from]") || "";
    const dt = searchParams.get("filter[date_to]") || "";
    const inc = searchParams.get("include_deleted") === "1";
    setPage(p);
    setStatus(st);
    setCustomerId(cid);
    setOperatorId(oid);
    setSimNo(sn);
    setDateFrom(df);
    setDateTo(dt);
    setShowDeleted(inc);
    const sk = searchParams.get("sort_by") || "";
    const sd = (searchParams.get("sort_dir") as "asc" | "desc") || "asc";
    setSortKey(sk);
    setSortDir(sd);
    apiFetch(`/favorites?pageKey=lines`).then(d => setFavorites(d.data || [])).catch(() => {});
  }, []);

  function replaceUrl(nextPage: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(nextPage));
    qs.set("pageSize", String(pageSize));
    if (status) qs.set("filter[status]", status);
    if (customerId) qs.set("filter[customer_id]", customerId);
    if (operatorId) qs.set("filter[operator_id]", operatorId);
    if (simNo) qs.set("filter[sim_no]", simNo);
    if (dateFrom) qs.set("filter[date_from]", dateFrom);
    if (dateTo) qs.set("filter[date_to]", dateTo);
    if (showDeleted) qs.set("include_deleted", "1");
    if (sortKey) qs.set("sort_by", sortKey);
    if (sortDir) qs.set("sort_dir", sortDir);
    router.replace(`/lines?${qs.toString()}`);
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
        pageKey: "lines",
        name: favName.trim(),
        params: { status, customerId, operatorId, dateFrom, dateTo, showDeleted, sortKey, sortDir }
      })
    });
    const d = await apiFetch(`/favorites?pageKey=lines`);
    setFavorites(d.data || []);
  }
  async function applyFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    setStatus(f.params.status || "");
    setCustomerId(f.params.customerId || "");
    setOperatorId(f.params.operatorId || "");
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
    const d = await apiFetch(`/favorites?pageKey=lines`);
    setFavorites(d.data || []);
  }

  useEffect(() => {
    const run = async () => {
      try {
        const [cs, os] = await Promise.all([
          apiFetch(`/customers?page=1&pageSize=999`),
          apiFetch(`/operators`)
        ]);
        setCustomers(cs.data || []);
        setOperators(os.data || []);
      } catch {}
    };
    run();
  }, []);

  async function openEdit(id: string) {
    setEditingId(id);
    setSaving(false);
    try {
      const [detail, custs, ops] = await Promise.all([
        apiFetch(`/lines/${id}`),
        apiFetch(`/customers?page=1&pageSize=999`),
        apiFetch(`/operators`)
      ]);
      setCustomers(custs.data || []);
      setOperators(ops.data || []);
      const activation = detail.activationDate ? new Date(detail.activationDate) : null;
      const end = detail.endDate ? new Date(detail.endDate) : null;
      const fmt = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` : "";
      setForm({
        customer_id: detail.customerId || "",
        line_number: detail.lineNumber || "",
        imei_number: detail.imeiNumber || "",
        operator_id: detail.operatorId || "",
        activation_date: fmt(activation),
        end_date: fmt(end),
        status: detail.status || "aktif",
        description: detail.description || ""
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
    if (!form.customer_id || !form.line_number) {
      toast.push({ id: Date.now(), text: "Müşteri ve hat numarası zorunlu", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/lines/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_id: form.customer_id,
          line_number: form.line_number,
          imei_number: form.imei_number,
          operator_id: form.operator_id,
          activation_date: form.activation_date || undefined,
          end_date: form.end_date || undefined,
          status: form.status,
          description: form.description
        })
      });
      setEditingId(null);
      await load();
      toast.push({ id: Date.now(), text: "Hat güncellendi", type: "success" });
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
      await apiFetch(`/lines/${toDelete}`, { method: "DELETE" });
      setToDelete(null);
      await load();
      toast.push({ id: Date.now(), text: "Hat silindi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function onRestore(id: string) {
    setLoading(true);
    try {
      await apiFetch(`/lines/${id}/restore`, { method: "PATCH" });
      await load();
      toast.push({ id: Date.now(), text: "Hat geri alındı", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Geri alma başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hatlar</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const lines = [
                ["Hat No", "SIM No", "Operatör", "Durum", "Bitiş"],
                ...rows.map((r) => [
                  r.lineNumber || "",
                  r.imeiNumber || "",
                  r.operator?.name || "",
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
              a.download = "lines.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            CSV Dışa Aktar
          </button>
          <a href="/lines/new" className="btn btn-primary">Yeni Hat</a>
          <a href="/licenses/new" className="btn btn-success">Yeni Lisans</a>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 items-end gap-2 md:grid-cols-7">
        <select className="input w-full" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Durum</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
        <select className="input w-full" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Müşteri</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
        </select>
        <select className="input w-full" value={operatorId} onChange={e => setOperatorId(e.target.value)}>
          <option value="">Operatör</option>
          {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input className="input w-full" placeholder="SIM No" value={simNo} onChange={e => setSimNo(e.target.value)} />
        <input className="input w-full" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <div className="flex items-center gap-2">
          <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={applyFilters} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
            Silinmişleri göster
          </label>
        </div>
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
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("lineNumber")}>Hat No {sortKey==="lineNumber" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2">SIM No</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("operatorName")}>Operatör {sortKey==="operatorName" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("status")}>Durum {sortKey==="status" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("endDate")}>Bitiş {sortKey==="endDate" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={`border-t ${l.deletedAt ? "text-slate-400 line-through opacity-70" : ""}`}>
                <td className="px-3 py-2">{l.lineNumber}</td>
                <td className="px-3 py-2">{l.imeiNumber}</td>
                <td className="px-3 py-2">{l.operator?.name}</td>
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
                      <button className="btn btn-secondary" onClick={() => onRestore(l.id)}>Geri Al</button>
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
        <div className="mb-4">Bu hattı silmek istiyor musun?</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={() => setToDelete(null)}>Vazgeç</button>
          <button className="btn btn-primary" onClick={onConfirmDelete}>Sil</button>
        </div>
      </Modal>
      <Modal open={!!editingId} title="Hat Düzenle" onClose={() => setEditingId(null)}>
        <form onSubmit={onSubmit} className="grid gap-3">
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri seçiniz</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          <input className="input" name="line_number" placeholder="Hat numarası" value={form.line_number} onChange={onChange} />
          <input className="input" name="imei_number" placeholder="SIM No" value={form.imei_number} onChange={onChange} />
          <select className="input" name="operator_id" value={form.operator_id} onChange={onChange}>
            <option value="">Operatör</option>
            {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="input" type="date" name="activation_date" value={form.activation_date} onChange={onChange} />
          <input className="input" type="date" name="end_date" value={form.end_date} onChange={onChange} />
          <select className="input" name="status" value={form.status} onChange={onChange}>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <textarea className="input" name="description" placeholder="Açıklama" value={form.description} onChange={onChange} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Vazgeç</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
