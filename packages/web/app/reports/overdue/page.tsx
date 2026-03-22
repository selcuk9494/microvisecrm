"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function OverdueReport() {
  const [lines, setLines] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [ls, wo, cs, us] = await Promise.all([
        apiFetch(`/lines/expired`),
        apiFetch(`/work-orders?filter[overdue]=1&page=1&pageSize=200`),
        apiFetch(`/customers?page=1&pageSize=999`),
        apiFetch(`/users`)
      ]);
      setLines(ls.data || []);
      setWorkOrders(wo.data || []);
      setCustomers(cs.data || []);
      setUsers(us.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function exportLinesCsv() {
    const linesCsv = [
      ["Hat No","Müşteri","Bitiş","Durum"],
      ...lines.map((r)=>[
        r.lineNumber || "",
        (customers.find((c:any)=>c.id===r.customerId)?.customerName) || r.customerId || "",
        r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : "",
        r.status || ""
      ])
    ].map((l)=> l.map((v)=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([linesCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "overdue_lines.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportWoCsv() {
    const csv = [
      ["Numara","Müşteri","Personel","Vade","Durum"],
      ...workOrders.map((r)=>[
        r.orderNumber || "",
        (customers.find((c:any)=>c.id===r.customerId)?.customerName) || r.customerId || "",
        (users.find((u:any)=>u.id===r.assignedUserId)?.name) || r.assignedUserId || "",
        r.dueDate ? new Date(r.dueDate).toLocaleString("tr-TR") : "",
        r.status || ""
      ])
    ].map((l)=> l.map((v)=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "overdue_work_orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gecikenler</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? "Yükleniyor..." : "Yenile"}</button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-3">
            <div className="text-lg font-medium">Süresi Dolmuş Hatlar</div>
            <button className="btn btn-secondary" onClick={exportLinesCsv} disabled={lines.length===0}>CSV</button>
          </div>
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr><th className="px-3 py-2">Hat No</th><th className="px-3 py-2">Müşteri</th><th className="px-3 py-2">Bitiş</th><th className="px-3 py-2">Durum</th></tr>
            </thead>
            <tbody>
              {lines.map((r)=>(
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.lineNumber}</td>
                  <td className="px-3 py-2">{customers.find((c:any)=>c.id===r.customerId)?.customerName || r.customerId}</td>
                  <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
              {lines.length===0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-3">
            <div className="text-lg font-medium">Geciken İş Emirleri</div>
            <button className="btn btn-secondary" onClick={exportWoCsv} disabled={workOrders.length===0}>CSV</button>
          </div>
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr><th className="px-3 py-2">Numara</th><th className="px-3 py-2">Müşteri</th><th className="px-3 py-2">Personel</th><th className="px-3 py-2">Vade</th><th className="px-3 py-2">Durum</th></tr>
            </thead>
            <tbody>
              {workOrders.map((r)=>(
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.orderNumber}</td>
                  <td className="px-3 py-2">{customers.find((c:any)=>c.id===r.customerId)?.customerName || r.customerId}</td>
                  <td className="px-3 py-2">{users.find((u:any)=>u.id===r.assignedUserId)?.name || r.assignedUserId || ""}</td>
                  <td className="px-3 py-2">{r.dueDate ? new Date(r.dueDate).toLocaleString("tr-TR") : ""}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))}
              {workOrders.length===0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
