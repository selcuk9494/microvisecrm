"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function LinesCsv() {
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "200");
      if (status) qs.set("filter[status]", status);
      if (customerId) qs.set("filter[customer_id]", customerId);
      if (operatorId) qs.set("filter[operator_id]", operatorId);
      if (dateFrom) qs.set("filter[date_from]", dateFrom);
      if (dateTo) qs.set("filter[date_to]", dateTo);
      const [ls, cs, ops] = await Promise.all([
        apiFetch(`/lines?${qs.toString()}`),
        apiFetch(`/customers?page=1&pageSize=999`),
        apiFetch(`/operators`)
      ]);
      setRows(ls.data || []);
      setCustomers(cs.data || []);
      setOperators(ops.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function exportCsv() {
    const lines = [
      ["Hat No","Müşteri","Operatör","Aktivasyon","Bitiş","Durum"],
      ...rows.map((r) => [
        r.lineNumber || "",
        (customers.find((c:any)=>c.id===r.customerId)?.customerName) || r.customerId || "",
        (operators.find((o:any)=>o.id===r.operatorId)?.name) || "",
        r.activationDate ? new Date(r.activationDate).toLocaleDateString("tr-TR") : "",
        r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : "",
        r.status || ""
      ])
    ].map((l)=> l.map((v)=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lines.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Hat CSV</h1>
        <div className="flex gap-2">
          <select className="input max-w-xs" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">Durum</option>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <select className="input max-w-xs" value={customerId} onChange={e=>setCustomerId(e.target.value)}>
            <option value="">Müşteri</option>
            {customers.map((c:any)=> <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          <select className="input max-w-xs" value={operatorId} onChange={e=>setOperatorId(e.target.value)}>
            <option value="">Operatör</option>
            {operators.map((o:any)=> <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input className="input max-w-xs" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <input className="input max-w-xs" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
          <button className="btn btn-secondary" onClick={exportCsv} disabled={rows.length===0}>CSV Dışa Aktar</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Hat No</th>
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Operatör</th>
              <th className="px-3 py-2">Aktivasyon</th>
              <th className="px-3 py-2">Bitiş</th>
              <th className="px-3 py-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.lineNumber}</td>
                <td className="px-3 py-2">{customers.find((c:any)=>c.id===r.customerId)?.customerName || r.customerId}</td>
                <td className="px-3 py-2">{operators.find((o:any)=>o.id===r.operatorId)?.name || ""}</td>
                <td className="px-3 py-2">{r.activationDate ? new Date(r.activationDate).toLocaleDateString("tr-TR") : ""}</td>
                <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
