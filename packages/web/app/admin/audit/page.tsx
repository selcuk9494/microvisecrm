 "use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

const entityTypes = [
  { value: "customer", label: "Müşteri" },
  { value: "line", label: "Hat" },
  { value: "license", label: "Lisans" },
  { value: "workOrder", label: "İş Emri" },
  { value: "operator", label: "Operatör" },
];

const actions = ["create", "update", "delete", "restore", "update_status"];

export default function Audit() {
  const [entityType, setEntityType] = useState<string>("");
  const [action, setAction] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    if (entityType) qs.set("entityType", entityType);
    if (action) qs.set("action", action);
    try {
      const data = await apiFetch(`/admin/audit?${qs.toString()}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page, entityType, action]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kayıt Güncellemeleri</h1>
      </div>
      <div className="mb-3 flex items-center gap-3">
        <select className="input max-w-xs" value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="">Tüm Nesneler</option>
          {entityTypes.map(et => (
            <option key={et.value} value={et.value}>
              {et.label}
            </option>
          ))}
        </select>
        <select className="input max-w-xs" value={action} onChange={e => setAction(e.target.value)}>
          <option value="">Tüm İşlemler</option>
          {actions.map(a => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={() => { setPage(1); load(); }} disabled={loading}>
          {loading ? "Yükleniyor..." : "Uygula"}
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">İşlem</th>
              <th className="px-3 py-2">Nesne</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.entityType}</td>
                <td className="px-3 py-2">{r.entityId}</td>
                <td className="px-3 py-2">
                  <button className="btn btn-secondary" onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}>
                    {expanded[r.id] ? "Gizle" : "Detay"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Kayıt yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.map(
          r =>
            expanded[r.id] && (
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
            )
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Toplam {total}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Önceki
          </button>
          <div className="rounded-md border px-3 py-2 text-sm">{page}</div>
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total}>
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}
