"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

const entityTypes = [
  { value: "customer", label: "Müşteri" },
  { value: "line", label: "Hat" },
  { value: "license", label: "Lisans" },
  { value: "workOrder", label: "İş Emri" },
  { value: "operator", label: "Operatör" },
];
const actions = [
  { value: "create", label: "Oluştur" },
  { value: "update", label: "Güncelle" },
  { value: "delete", label: "Sil" },
  { value: "restore", label: "Geri Al" },
  { value: "update_status", label: "Durum Güncelle" },
];

function badge(action: string) {
  const map: any = {
    create: "bg-emerald-100 text-emerald-700",
    update: "bg-amber-100 text-amber-700",
    delete: "bg-rose-100 text-rose-700",
    restore: "bg-sky-100 text-sky-700",
    update_status: "bg-indigo-100 text-indigo-700",
  };
  return map[action] || "bg-slate-100 text-slate-700";
}

function summarize(entityType: string, before: any, after: any) {
  const obj = after || before || {};
  if (entityType === "line") return `${obj.lineNumber || ""} ${obj.operatorId ? `(${obj.operatorId})` : ""}`.trim();
  if (entityType === "license") return `${obj.vendorId || ""} ${obj.device ? `- ${obj.device}` : ""}`.trim();
  if (entityType === "customer") return obj.customerName || obj.name || "";
  if (entityType === "workOrder") return `${obj.orderNumber || ""} ${obj.status ? `- ${obj.status}` : ""}`.trim();
  if (entityType === "operator") return obj.name || "";
  return "";
}

export default function Audit() {
  const [entityType, setEntityType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    if (entityType) qs.set("entityType", entityType);
    if (action) qs.set("action", action);
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    try {
      const data = await apiFetch(`/admin/audit?${qs.toString()}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [page, entityType, action, dateFrom, dateTo]);
  useEffect(() => { (async () => { try { const d = await apiFetch(`/users`); setUsers(d.data || []); } catch {} })(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      const etLabel = entityTypes.find(e=>e.value===r.entityType)?.label || r.entityType;
      const sum = summarize(r.entityType, r.beforeData, r.afterData);
      return etLabel.toLowerCase().includes(s) || (r.action||"").toLowerCase().includes(s) || (sum||"").toLowerCase().includes(s) || (r.entityId||"").toLowerCase().includes(s);
    });
  }, [rows, search]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kayıt Güncellemeleri</h1>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="input max-w-xs" value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="">Tüm Nesneler</option>
          {entityTypes.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
        </select>
        <select className="input max-w-xs" value={action} onChange={e => setAction(e.target.value)}>
          <option value="">Tüm İşlemler</option>
          {actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input className="input max-w-xs" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input className="input max-w-xs" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <input className="input max-w-xs" placeholder="Ara: nesne, işlem, özet, ID" value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn btn-secondary" onClick={() => { setPage(1); load(); }} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const lines = [
              ["Tarih","İşlem","Nesne","Özet","ID","Kullanıcı"],
              ...filtered.map((r) => {
                const etLabel = entityTypes.find(e=>e.value===r.entityType)?.label || r.entityType;
                const sum = summarize(r.entityType, r.beforeData, r.afterData);
                const u = users.find((x:any)=>x.id===r.actorUserId);
                return [
                  r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : "",
                  r.action,
                  etLabel,
                  String(sum||"").replace(/\n/g," "),
                  r.entityId || "",
                  u?.name || r.actorUserId || ""
                ];
              })
            ].map((l)=> l.map((v)=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
            const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "audit.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          CSV Dışa Aktar
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">İşlem</th>
              <th className="px-3 py-2">Nesne</th>
              <th className="px-3 py-2">Özet</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const etLabel = entityTypes.find(e=>e.value===r.entityType)?.label || r.entityType;
              const sum = summarize(r.entityType, r.beforeData, r.afterData);
              const actLabel = actions.find(a=>a.value===r.action)?.label || r.action;
              const link =
                r.entityType === "line" ? `/lines/${r.entityId}` :
                r.entityType === "license" ? `/licenses/${r.entityId}` :
                r.entityType === "workOrder" ? `/work-orders?page=1&q=${encodeURIComponent(r.entityId||"")}` :
                r.entityType === "customer" ? `/customers/${r.entityId}/edit` :
                "";
              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${badge(r.action)}`}>{actLabel}</span></td>
                  <td className="px-3 py-2">{etLabel}</td>
                  <td className="px-3 py-2">{sum || "-"}</td>
                  <td className="px-3 py-2">{link ? <a className="text-sky-700 underline" href={link}>{r.entityId}</a> : r.entityId}</td>
                  <td className="px-3 py-2"><button className="btn btn-secondary" onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}>{expanded[r.id] ? "Gizle" : "Detay"}</button></td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
        {filtered.map(r => expanded[r.id] && (
          <div key={r.id} className="border-t p-3 text-xs grid gap-2 md:grid-cols-2">
            <div>
              <div className="mb-1 font-medium">Önce</div>
              <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 p-2">{JSON.stringify(r.beforeData, null, 2)}</pre>
            </div>
            <div>
              <div className="mb-1 font-medium">Sonra</div>
              <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 p-2">{JSON.stringify(r.afterData, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Toplam {total}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Önceki</button>
          <div className="rounded-md border px-3 py-2 text-sm">{page}</div>
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>Sonraki</button>
        </div>
      </div>
    </div>
  );
}
