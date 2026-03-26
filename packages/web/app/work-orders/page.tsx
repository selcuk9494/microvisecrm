"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useRouter, useSearchParams } from "next/navigation";
import { geocodeAddressToLatLng } from "../../lib/geocode";

export default function WorkOrders() {
  const [status, setStatus] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<"all" | "open" | "progress" | "closed" | "high" | "today" | "overdue" | "upcoming">("all");
  const [q, setQ] = useState<string>("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [filterBranchId, setFilterBranchId] = useState<string>("");
  const [filterBranches, setFilterBranches] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favName, setFavName] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [form, setForm] = useState({
    order_number: "",
    customer_id: "",
    branch_id: "",
    description: "",
    assigned_user_id: "",
    type_id: "",
    priority: "orta",
    notes: "",
    location_address: "",
    location_lat: "",
    location_lng: ""
  });
  const [editBranches, setEditBranches] = useState<any[]>([]);
  const toast = useToast();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [closingBranchId, setClosingBranchId] = useState<string>("");
  const [closingLocationAddress, setClosingLocationAddress] = useState<string>("");
  const [closingLocationLat, setClosingLocationLat] = useState<string>("");
  const [closingLocationLng, setClosingLocationLng] = useState<string>("");
  const [closingBranches, setClosingBranches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const filteredRows = useMemo(() => {
    let list = rows.slice();
    if (tab === "open") list = list.filter((r: any) => r.status === "acik");
    if (tab === "progress") list = list.filter((r: any) => r.status === "devam");
    if (tab === "closed") list = list.filter((r: any) => r.status === "kapali");
    if (tab === "high") list = list.filter((r: any) => r.priority === "yuksek");
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    if (tab === "today") {
      list = list.filter((r: any) => {
        const t = r.dueDate ? new Date(r.dueDate).getTime() : NaN;
        return !isNaN(t) && t >= start && t <= end;
      });
    }
    if (tab === "overdue") {
      list = list.filter((r: any) => {
        const t = r.dueDate ? new Date(r.dueDate).getTime() : NaN;
        return !isNaN(t) && t < Date.now() && r.status !== "kapali";
      });
    }
    if (tab === "upcoming") {
      const in7 = Date.now() + 7 * 86400000;
      list = list.filter((r: any) => {
        const t = r.dueDate ? new Date(r.dueDate).getTime() : NaN;
        return !isNaN(t) && t > end && t <= in7;
      });
    }
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter((r: any) =>
        String(r.orderNumber || "").toLowerCase().includes(s) ||
        String(r.description || "").toLowerCase().includes(s) ||
        String(r.notes || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [rows, tab, search]);

  function toggleSelect(id: string, checked: boolean) {
    setSelected((s) => checked ? Array.from(new Set([...s, id])) : s.filter((x) => x !== id));
  }
  function toggleSelectAll(checked: boolean, list: any[]) {
    if (checked) setSelected(list.map((r: any) => r.id));
    else setSelected([]);
  }
  async function applyBulkStatus() {
    if (!bulkStatus || selected.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selected.map((id) => apiFetch(`/work-orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: bulkStatus }) })));
      setSelected([]);
      setBulkStatus("");
      await load();
    } finally {
      setLoading(false);
    }
  }
  async function applyBulkAssignee() {
    if (!bulkAssignee || selected.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selected.map((id) => apiFetch(`/work-orders/${id}`, { method: "PUT", body: JSON.stringify({ assigned_user_id: bulkAssignee }) })));
      setSelected([]);
      setBulkAssignee("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      const tabStatus = tab==="open" ? "acik" : tab==="progress" ? "devam" : tab==="closed" ? "kapali" : "";
      const effStatus = tabStatus ? tabStatus : status;
      if (effStatus) qs.set("filter[status]", effStatus);
      if (customerId) qs.set("filter[customer_id]", customerId);
      if (filterBranchId) qs.set("filter[branch_id]", filterBranchId);
      if (assignedUserId) qs.set("filter[assigned_user_id]", assignedUserId);
      if (q) qs.set("q", q);
      if (showDeleted) qs.set("include_deleted", "1");
      if (sortKey) qs.set("sort_by", sortKey);
      if (sortDir) qs.set("sort_dir", sortDir);
      if (tab==="overdue") qs.set("filter[overdue]", "1");
      const data = await apiFetch(`/work-orders?${qs.toString()}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [page, showDeleted, tab, status, customerId, assignedUserId, q, sortKey, sortDir]);

  useEffect(() => {
    const p = Number(searchParams.get("page") || 1);
    const st = searchParams.get("filter[status]") || "";
    const cid = searchParams.get("filter[customer_id]") || "";
    const au = searchParams.get("filter[assigned_user_id]") || "";
    const qq = searchParams.get("q") || "";
    const inc = searchParams.get("include_deleted") === "1";
    setPage(p);
    setStatus(st);
    setCustomerId(cid);
    setAssignedUserId(au);
    setQ(qq);
    setShowDeleted(inc);
  }, []);

  function replaceUrl(nextPage: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(nextPage));
    qs.set("pageSize", String(pageSize));
    const tabStatus = tab==="open" ? "acik" : tab==="progress" ? "devam" : tab==="closed" ? "kapali" : "";
    const effStatus = tabStatus ? tabStatus : status;
    if (effStatus) qs.set("filter[status]", effStatus);
    if (customerId) qs.set("filter[customer_id]", customerId);
    if (filterBranchId) qs.set("filter[branch_id]", filterBranchId);
    if (assignedUserId) qs.set("filter[assigned_user_id]", assignedUserId);
    if (q) qs.set("q", q);
    if (tab==="overdue") qs.set("filter[overdue]", "1");
    if (showDeleted) qs.set("include_deleted", "1");
    if (sortKey) qs.set("sort_by", sortKey);
    if (sortDir) qs.set("sort_dir", sortDir);
    router.replace(`/work-orders?${qs.toString()}`);
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
        pageKey: "work-orders",
        name: favName.trim(),
        params: { status, customerId, assignedUserId, q, showDeleted, sortKey, sortDir }
      })
    });
    const d = await apiFetch(`/favorites?pageKey=work-orders`);
    setFavorites(d.data || []);
  }
  async function applyFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    setStatus(f.params.status || "");
    setCustomerId(f.params.customerId || "");
    setAssignedUserId(f.params.assignedUserId || "");
    setQ(f.params.q || "");
    setShowDeleted(!!f.params.showDeleted);
    setSortKey(f.params.sortKey || "");
    setSortDir(f.params.sortDir || "asc");
    setTimeout(() => applyFilters(), 0);
  }
  async function deleteFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    await apiFetch(`/favorites/${f.id}`, { method: "DELETE" });
    const d = await apiFetch(`/favorites?pageKey=work-orders`);
    setFavorites(d.data || []);
  }

  useEffect(() => {
    const run = async () => {
      try {
        const [cs, us, ts] = await Promise.all([apiFetch(`/customers?page=1&pageSize=999`), apiFetch(`/users`), apiFetch(`/work-order-types`) ]);
        setCustomers(cs.data || []);
        setUsers(us.data || []);
        setTypes(ts.data || []);
      } catch {}
    };
    run();
  }, []);
  useEffect(() => {
    const run = async () => {
      try {
        if (customerId) {
          const d = await apiFetch(`/customers/${customerId}/branches`);
          setFilterBranches(d.data || []);
        } else {
          setFilterBranches([]);
          setFilterBranchId("");
        }
      } catch {}
    };
    run();
  }, [customerId]);

  async function openEdit(id: string) {
    setEditingId(id);
    setSaving(false);
    try {
      const data = await apiFetch(`/work-orders/${id}`);
      setForm({
        order_number: data.orderNumber || "",
        customer_id: data.customerId || "",
        branch_id: data.branch?.id || "",
        description: data.description || "",
        assigned_user_id: data.assignedUserId || "",
        type_id: data.typeId || data.type?.id || "",
        priority: data.priority || "orta",
        notes: data.notes || "",
        location_address: data.locationAddress || data.branch?.address || "",
        location_lat: data.locationLat ? String(data.locationLat) : data.branch?.lat ? String(data.branch.lat) : "",
        location_lng: data.locationLng ? String(data.locationLng) : data.branch?.lng ? String(data.branch.lng) : ""
      });
      const bs = await apiFetch(`/customers/${data.customerId}/branches`);
      setEditBranches(bs.data || []);
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
    setSaving(true);
    try {
      await apiFetch(`/work-orders/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          order_number: form.order_number,
          customer_id: form.customer_id,
          branch_id: form.branch_id || undefined,
          description: form.description,
          assigned_user_id: form.assigned_user_id,
          type_id: form.type_id,
          priority: form.priority,
          notes: form.notes,
          location_address: form.location_address || undefined,
          location_lat: form.location_lat ? Number(form.location_lat) : undefined,
          location_lng: form.location_lng ? Number(form.location_lng) : undefined
        })
      });
      setEditingId(null);
      await load();
      toast.push({ id: Date.now(), text: "İş emri güncellendi", type: "success" });
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
      await apiFetch(`/work-orders/${toDelete}`, { method: "DELETE" });
      setToDelete(null);
      await load();
      toast.push({ id: Date.now(), text: "İş emri silindi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">İş Emirleri</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const lines = [
                ["Numara", "Açıklama", "Müşteri", "Personel", "Öncelik", "Durum", "Vade", "Oluşturma", "Tamamlandı"],
                ...rows.map((r) => [
                  r.orderNumber || "",
                  (r.description || "").replace(/\n/g, " "),
                  r.customerId || "",
                  r.assignedUserId || "",
                  r.priority || "",
                  r.status || "",
                  r.dueDate ? new Date(r.dueDate).toLocaleString("tr-TR") : "",
                  r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : "",
                  r.completedAt ? new Date(r.completedAt).toLocaleString("tr-TR") : ""
                ]),
              ]
                .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")) 
                .join("\n");
              const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "work_orders.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            CSV Dışa Aktar
          </button>
          <a href="/work-orders/new" className="btn btn-primary">Yeni İş Emri</a>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="all"?"bg-brand-800 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("all")}>Tümü</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="open"?"bg-brand-600 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("open")}>Açık</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="progress"?"bg-brand-500 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("progress")}>Devam</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="closed"?"bg-slate-800 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("closed")}>Kapalı</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="high"?"bg-rose-600 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("high")}>Yüksek Öncelik</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="today"?"bg-emerald-600 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("today")}>Bugün (vade)</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="overdue"?"bg-rose-700 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("overdue")}>Geciken</button>
          <button className={`rounded-full px-4 py-2 text-sm font-semibold ${tab==="upcoming"?"bg-teal-600 text-white":"bg-white text-app-ink border border-app-border"}`} onClick={() => setTab("upcoming")}>Yaklaşan 7g</button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input className="input" placeholder="Ara: numara, açıklama, not" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2">
          <div className="text-sm text-slate-700">Seçili {selected.length} kayıt</div>
          <select className="input" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
            <option value="">Durumu değiştir</option>
            <option value="acik">Açık</option>
            <option value="devam">Devam</option>
            <option value="kapali">Kapalı</option>
          </select>
          <button className="btn btn-secondary" onClick={applyBulkStatus} disabled={!bulkStatus || loading}>Uygula</button>
          <select className="input" value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)}>
            <option value="">Atananı değiştir</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={applyBulkAssignee} disabled={!bulkAssignee || loading}>Uygula</button>
          <button className="btn btn-secondary" onClick={() => setSelected([])}>Seçimi Temizle</button>
        </div>
      )}
      <div className="mb-3 flex items-center gap-2">
        <input className="input max-w-xs" placeholder="Favori adı" value={favName} onChange={e => setFavName(e.target.value)} />
        <button className="btn btn-secondary" onClick={saveFavorite}>Favoriyi Kaydet</button>
        <select className="input max-w-xs" onChange={e => applyFavorite(e.target.value)} value="">
          <option value="" disabled>Favori seç</option>
          {favorites.map((f: any) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { if (favName) deleteFavorite(favName); }}>Favoriyi Sil</button>
      </div>
      <div className="mb-3 flex items-center gap-4">
        <select className="input max-w-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Durum</option>
          <option value="acik">Açık</option>
          <option value="devam">Devam</option>
          <option value="kapali">Kapalı</option>
        </select>
        <select className="input max-w-xs" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Müşteri</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
        </select>
        <select className="input max-w-xs" value={filterBranchId} onChange={e=> setFilterBranchId(e.target.value)} disabled={!customerId}>
          <option value="">Şube</option>
          {filterBranches.map((b:any)=> <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="input max-w-xs" value={assignedUserId} onChange={e => setAssignedUserId(e.target.value)}>
          <option value="">Atanan personel</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input className="input max-w-xs" placeholder="İş emri numarası" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn btn-secondary" onClick={applyFilters} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          Silinmişleri göster
        </label>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-white text-left">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === filteredRows.length}
                  onChange={e => toggleSelectAll(e.target.checked, filteredRows)}
                />
              </th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("orderNumber")}>Numara {sortKey==="orderNumber" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2">Açıklama</th>
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Şube</th>
              <th className="px-3 py-2">Personel</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("priority")}>Öncelik {sortKey==="priority" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("status")}>Durum {sortKey==="status" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2">Vade</th>
              <th className="px-3 py-2">Oluşturma</th>
              <th className="px-3 py-2">Tamamlandı</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((w) => {
              const c = customers.find((x:any)=>x.id===w.customerId);
              const u = users.find((x:any)=>x.id===w.assignedUserId);
              const prColor = w.priority === "yuksek" ? "bg-rose-100 text-rose-700" : w.priority === "orta" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
              const stColor = w.status === "acik" ? "bg-sky-100 text-sky-700" : w.status === "devam" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700";
              return (
              <tr key={w.id} className={`border-t align-top ${w.deletedAt ? "text-slate-400 line-through opacity-70" : ""}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.includes(w.id)} onChange={e => toggleSelect(w.id, e.target.checked)} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${w.status==="acik"?"bg-sky-500":w.status==="devam"?"bg-amber-500":"bg-slate-500"}`} />
                    <span className="font-medium">{w.orderNumber}</span>
                  </div>
                  {w.type?.name && <div className="mt-1 text-xs text-slate-500">{w.type.name}</div>}
                </td>
                <td className="px-3 py-2">
                  <div className="whitespace-pre-wrap break-words">{w.description || "-"}</div>
                  {w.notes && <div className="mt-1 text-xs text-slate-500 whitespace-pre-wrap break-words">{w.notes}</div>}
                </td>
                <td className="px-3 py-2">{c?.customerName || w.customerId || "-"}</td>
                <td className="px-3 py-2">{(w as any).branch?.name || "-"}</td>
                <td className="px-3 py-2">{u?.name || w.assignedUserId || "-"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${prColor}`}>{w.priority}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${stColor}`}>{w.status}</span>
                </td>
                <td className="px-3 py-2">{w.dueDate ? new Date(w.dueDate).toLocaleString("tr-TR") : ""}</td>
                <td className="px-3 py-2">{w.createdAt ? new Date(w.createdAt).toLocaleString("tr-TR") : ""}</td>
                <td className="px-3 py-2">{w.completedAt ? new Date(w.completedAt).toLocaleString("tr-TR") : ""}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {!w.deletedAt ? (
                      <>
                        <button className="btn btn-secondary" onClick={() => openEdit(w.id)}>Düzenle</button>
                        {w.status!=="kapali" && (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={async () => {
                                setClosingId(w.id);
                                setPaymentAmount("");
                                setPaymentNote("");
                                try {
                                  const d = await apiFetch(`/work-orders/${w.id}`);
                                  setClosingBranchId(d.branch?.id || "");
                                  setClosingLocationAddress(d.locationAddress || d.branch?.address || "");
                                  setClosingLocationLat(d.locationLat ? String(d.locationLat) : d.branch?.lat ? String(d.branch.lat) : "");
                                  setClosingLocationLng(d.locationLng ? String(d.locationLng) : d.branch?.lng ? String(d.branch.lng) : "");
                                  const bs = await apiFetch(`/customers/${d.customerId}/branches`);
                                  setClosingBranches(bs.data || []);
                                } catch {}
                              }}
                            >
                              Kapat
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={async () => {
                                if (!w.customerId) return;
                                const coords = w.locationLat && w.locationLng ? { lat: w.locationLat, lng: w.locationLng } : null;
                                if (!coords && !(w.branch?.lat && w.branch?.lng)) return;
                                const lat = String(coords?.lat || w.branch?.lat);
                                const lng = String(coords?.lng || w.branch?.lng);
                                try {
                                  const d = await apiFetch(`/branches/nearest?customer_id=${encodeURIComponent(w.customerId)}&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
                                  if (d?.data?.id) {
                                    setClosingBranchId(d.data.id);
                                  }
                                } catch {}
                              }}
                            >
                              Konumdan Şube Öner
                            </button>
                            {(w.locationLat && w.locationLng) || w.locationAddress || (w.branch?.address) ? (
                              <a
                                className="btn btn-secondary"
                                href={
                                  (w.locationLat && w.locationLng)
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${w.locationLat},${w.locationLng}`
                                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(w.locationAddress || w.branch?.address || "")}`
                                }
                                target="_blank" rel="noreferrer"
                              >
                                Yol Tarifi
                              </a>
                            ) : null}
                          </>
                        )}
                        <button className="btn btn-secondary" onClick={() => setToDelete(w.id)}>Sil</button>
                      </>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={async () => {
                          await apiFetch(`/work-orders/${w.id}/restore`, { method: "PATCH" });
                          await load();
                        }}
                      >
                        {loading ? "..." : "Geri Al"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}
            {!loading && filteredRows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Kayıt bulunamadı</td></tr>
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
        <div className="mb-4">Bu iş emrini silmek istiyor musun?</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={() => setToDelete(null)}>Vazgeç</button>
          <button className="btn btn-primary" onClick={onConfirmDelete}>Sil</button>
        </div>
      </Modal>
      <Modal open={!!closingId} title="İş Emrini Kapat" onClose={() => setClosingId(null)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiFetch(`/work-orders/${closingId}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                  status: "kapali",
                  payment_amount: paymentAmount ? Number(paymentAmount) : undefined,
                  payment_note: paymentNote || undefined,
                  branch_id: closingBranchId || undefined,
                  location_address: closingLocationAddress || undefined,
                  location_lat: closingLocationLat ? Number(closingLocationLat) : undefined,
                  location_lng: closingLocationLng ? Number(closingLocationLng) : undefined
                })
              });
              setClosingId(null);
              await load();
              toast.push({ id: Date.now(), text: "İş emri kapatıldı", type: "success" });
            } catch {
              toast.push({ id: Date.now(), text: "Kapatma başarısız", type: "error" });
            }
          }}
        >
          <input className="input" type="number" step="0.01" placeholder="Ödeme tutarı" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} />
          <textarea className="input" placeholder="Not" value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} />
          <select className="input" value={closingBranchId} onChange={(e)=> {
            const val = e.target.value;
            setClosingBranchId(val);
            const b = closingBranches.find((x:any)=>x.id===val);
            if (b) {
              setClosingLocationAddress(b.address || "");
              setClosingLocationLat(b.lat ? String(b.lat) : "");
              setClosingLocationLng(b.lng ? String(b.lng) : "");
            }
          }}>
            <option value="">Şube (opsiyonel)</option>
            {closingBranches.map((b:any)=> <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="grid gap-2 md:grid-cols-3">
            <input className="input" placeholder="Konum adresi" value={closingLocationAddress} onChange={e=>setClosingLocationAddress(e.target.value)} />
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Enlem (lat)" value={closingLocationLat} onChange={e=>setClosingLocationLat(e.target.value)} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async ()=> {
                  const r = await geocodeAddressToLatLng(closingLocationAddress);
                  setClosingLocationLat(r.lat || closingLocationLat);
                  setClosingLocationLng(r.lng || closingLocationLng);
                }}
              >
                Adresten Lat/Lng
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async ()=> {
                  try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                      if (!navigator.geolocation) return reject(new Error("no_geolocation"));
                      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                    });
                    const lat = String(pos.coords.latitude);
                    const lng = String(pos.coords.longitude);
                    setClosingLocationLat(lat);
                    setClosingLocationLng(lng);
                    const addrRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`, { headers: { "Accept-Language": "tr" } });
                    if (addrRes.ok) {
                      const j = await addrRes.json();
                      const disp = j?.display_name || "";
                      setClosingLocationAddress(disp || closingLocationAddress);
                    }
                  } catch {}
                }}
              >
                Konumumu Al
              </button>
            </div>
            <input className="input" placeholder="Boylam (lng)" value={closingLocationLng} onChange={e=>setClosingLocationLng(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={()=>setClosingId(null)}>Vazgeç</button>
            <button type="submit" className="btn btn-primary">Kapat</button>
          </div>
        </form>
      </Modal>
      <Modal open={!!editingId} title="İş Emri Düzenle" onClose={() => setEditingId(null)}>
        <form onSubmit={onSubmit} className="grid gap-3">
          <input className="input" name="order_number" placeholder="İş emri numarası" value={form.order_number} onChange={onChange} />
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.customerName}</option>
            ))}
          </select>
          <select className="input" name="branch_id" value={form.branch_id} onChange={(e)=> {
            const val = e.target.value;
            const b = editBranches.find((x:any)=>x.id===val);
            setForm((f)=> ({ ...f, branch_id: val, location_address: b?.address || "", location_lat: b?.lat ? String(b.lat) : "", location_lng: b?.lng ? String(b.lng) : "" }));
          }}>
            <option value="">Şube (opsiyonel)</option>
            {editBranches.map((b:any)=> <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <textarea className="input" name="description" placeholder="İş açıklaması" value={form.description} onChange={onChange} />
          <select className="input" name="type_id" value={form.type_id} onChange={onChange}>
            <option value="">İş emri tipi</option>
            {types.map((t:any)=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" name="assigned_user_id" value={form.assigned_user_id} onChange={onChange}>
            <option value="">Atanan personel</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select className="input" name="priority" value={form.priority} onChange={onChange}>
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
          </select>
          <div className="grid gap-2 md:grid-cols-3">
            <input className="input" name="location_address" placeholder="Konum adresi" value={form.location_address} onChange={onChange} />
            <input className="input" name="location_lat" placeholder="Enlem (lat)" value={form.location_lat} onChange={onChange} />
            <input className="input" name="location_lng" placeholder="Boylam (lng)" value={form.location_lng} onChange={onChange} />
          </div>
          <textarea className="input" name="notes" placeholder="Notlar" value={form.notes} onChange={onChange} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Vazgeç</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
