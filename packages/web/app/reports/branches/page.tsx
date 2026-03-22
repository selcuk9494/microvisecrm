"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function BranchesReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [br, cs] = await Promise.all([apiFetch(`/reports/branches`), apiFetch(`/customers?page=1&pageSize=999`)]);
        setRows(br.data || []);
        setCustomers(cs.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);
  function exportCsv() {
    const lines = [
      ["Şube","Müşteri","Adres","Lat","Lng","Açık","Devam","Kapalı"],
      ...rows.map((r)=> [
        r.name || "",
        customers.find((c:any)=>c.id===r.customerId)?.customerName || r.customerId || "",
        r.address || "",
        r.lat ?? "",
        r.lng ?? "",
        r.open || 0,
        r.progress || 0,
        r.closed || 0
      ])
    ].map((l)=> l.map((v)=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "branches.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Şube Raporu</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={exportCsv} disabled={rows.length===0}>CSV Dışa Aktar</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Şube</th>
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Adres</th>
              <th className="px-3 py-2">Açık</th>
              <th className="px-3 py-2">Devam</th>
              <th className="px-3 py-2">Kapalı</th>
              <th className="px-3 py-2">Yol Tarifi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> {
              const mapsUrl = (r.lat && r.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}` : (r.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address)}` : "");
              return (
                <tr key={r.branchId} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{customers.find((c:any)=>c.id===r.customerId)?.customerName || r.customerId}</td>
                  <td className="px-3 py-2">{r.address || ""}</td>
                  <td className="px-3 py-2">{r.open || 0}</td>
                  <td className="px-3 py-2">{r.progress || 0}</td>
                  <td className="px-3 py-2">{r.closed || 0}</td>
                  <td className="px-3 py-2">{mapsUrl ? <a className="text-sky-700 underline" href={mapsUrl} target="_blank" rel="noreferrer">Yol Tarifi</a> : ""}</td>
                </tr>
              );
            })}
            {rows.length===0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
