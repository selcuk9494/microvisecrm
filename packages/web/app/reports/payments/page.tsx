"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function PaymentsReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (dateFrom) qs.set("date_from", dateFrom);
      if (dateTo) qs.set("date_to", dateTo);
      const d = await apiFetch(`/reports/payments?${qs.toString()}`);
      setRows(d.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tahsilatlar</h1>
        <div className="flex gap-2">
          <input className="input" type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <input className="input" type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">İş Emri</th>
              <th className="px-3 py-2">Tutar</th>
              <th className="px-3 py-2">Not</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.paidAt ? new Date(r.paidAt).toLocaleString("tr-TR") : ""}</td>
                <td className="px-3 py-2">
                  <a className="text-sky-700 underline" href={`/customers/${r.customer?.id || r.customerId}/edit`}>
                    {r.customer?.customerName || r.customerId}
                  </a>
                </td>
                <td className="px-3 py-2">
                  <a className="text-sky-700 underline" href={`/work-orders/${r.workOrder?.id || r.workOrderId}`}>
                    {r.workOrder?.orderNumber || r.workOrderId}
                  </a>
                </td>
                <td className="px-3 py-2">₺ {Number(r.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-3 py-2">{r.note || ""}</td>
              </tr>
            ))}
            {rows.length===0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-right text-sm font-semibold">Toplam: {total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
}
