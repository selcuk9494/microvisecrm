 "use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function Reports() {
  const [expiringLines, setExpiringLines] = useState<any[]>([]);
  const [expiredLines, setExpiredLines] = useState<any[]>([]);
  const [expiringLicenses, setExpiringLicenses] = useState<any[]>([]);
  const [expiredLicenses, setExpiredLicenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ workOrdersByUser: any[], customersOverview: any[] }>({ workOrdersByUser: [], customersOverview: [] });
  const [xlsxReady, setXlsxReady] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [lExp, lExpd, licExp, licExpd, sum] = await Promise.all([
          apiFetch(`/lines/expiring?${new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), days: "30" }).toString()}`),
          apiFetch(`/lines/expired?${new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }).toString()}`),
          apiFetch(`/licenses/expiring?${new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}), days: "30" }).toString()}`),
          apiFetch(`/licenses/expired?${new URLSearchParams({ ...(dateFrom ? { date_from: dateFrom } : {}), ...(dateTo ? { date_to: dateTo } : {}) }).toString()}`),
          apiFetch(`/reports/summary`)
        ]);
        setExpiringLines(lExp.data || []);
        setExpiredLines(lExpd.data || []);
        setExpiringLicenses(licExp.data || []);
        setExpiredLicenses(licExpd.data || []);
        setSummary({ workOrdersByUser: sum.workOrdersByUser || [], customersOverview: sum.customersOverview || [] });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [dateFrom, dateTo]);
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
    s.async = true;
    s.onload = () => setXlsxReady(true);
    s.onerror = () => setXlsxReady(false);
    document.body.appendChild(s);
  }, []);
  function exportXlsx(rows: any[], headers: string[], fileName: string) {
    if (!xlsxReady || !Array.isArray(rows)) return;
    const data = rows.map((r) => {
      const o: any = {};
      headers.forEach((h) => {
        o[h] = r[h] ?? "";
      });
      return o;
    });
    const wb = (window as any).XLSX.utils.book_new();
    const ws = (window as any).XLSX.utils.json_to_sheet(data, { header: headers });
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Report");
    const out = (window as any).XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
  function printTable(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Rapor</title><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px}thead{background:#f1f5f9}</style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Raporlar</h1>
      <div className="flex items-end gap-2">
        <div>
          <div className="text-xs text-slate-500">Tarih Başlangıç</div>
          <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-slate-500">Tarih Bitiş</div>
          <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-secondary" onClick={() => { setDateFrom(""); setDateTo(""); }}>Temizle</button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">30 Gün İçinde Bitecek Hatlar</div>
          <div className="mb-2 flex gap-2">
            <button className="btn btn-secondary" onClick={() => exportXlsx(expiringLines.map((r:any)=>({ lineNumber:r.lineNumber, customerId:r.customerId, endDate:r.endDate })), ["lineNumber","customerId","endDate"], "expiring-lines.xlsx")}>XLSX Dışa Aktar</button>
            <button className="btn btn-secondary" onClick={() => printTable("tbl-exp-lines")}>Yazdır/PDF</button>
          </div>
          <table id="tbl-exp-lines" className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Hat No</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {expiringLines.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.lineNumber}</td>
                  <td className="px-3 py-2">{r.customerId}</td>
                  <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                </tr>
              ))}
              {!loading && expiringLines.length === 0 && <tr><td className="px-3 py-6 text-slate-500" colSpan={3}>Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Süresi Dolmuş Hatlar</div>
          <div className="mb-2 flex gap-2">
            <button className="btn btn-secondary" onClick={() => exportXlsx(expiredLines.map((r:any)=>({ lineNumber:r.lineNumber, customerId:r.customerId, endDate:r.endDate })), ["lineNumber","customerId","endDate"], "expired-lines.xlsx")}>XLSX Dışa Aktar</button>
            <button className="btn btn-secondary" onClick={() => printTable("tbl-expired-lines")}>Yazdır/PDF</button>
          </div>
          <table id="tbl-expired-lines" className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Hat No</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {expiredLines.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.lineNumber}</td>
                  <td className="px-3 py-2">{r.customerId}</td>
                  <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                </tr>
              ))}
              {!loading && expiredLines.length === 0 && <tr><td className="px-3 py-6 text-slate-500" colSpan={3}>Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">30 Gün İçinde Bitecek Lisanslar</div>
          <div className="mb-2 flex gap-2">
            <button className="btn btn-secondary" onClick={() => exportXlsx(expiringLicenses.map((r:any)=>({ licenseName:r.licenseName, customerId:r.customerId, endDate:r.endDate })), ["licenseName","customerId","endDate"], "expiring-licenses.xlsx")}>XLSX Dışa Aktar</button>
            <button className="btn btn-secondary" onClick={() => printTable("tbl-exp-licenses")}>Yazdır/PDF</button>
          </div>
          <table id="tbl-exp-licenses" className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {expiringLicenses.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.licenseName}</td>
                  <td className="px-3 py-2">{r.customerId}</td>
                  <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                </tr>
              ))}
              {!loading && expiringLicenses.length === 0 && <tr><td className="px-3 py-6 text-slate-500" colSpan={3}>Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Süresi Dolmuş Lisanslar</div>
          <div className="mb-2 flex gap-2">
            <button className="btn btn-secondary" onClick={() => exportXlsx(expiredLicenses.map((r:any)=>({ licenseName:r.licenseName, customerId:r.customerId, endDate:r.endDate })), ["licenseName","customerId","endDate"], "expired-licenses.xlsx")}>XLSX Dışa Aktar</button>
            <button className="btn btn-secondary" onClick={() => printTable("tbl-expired-licenses")}>Yazdır/PDF</button>
          </div>
          <table id="tbl-expired-licenses" className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Ad</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {expiredLicenses.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.licenseName}</td>
                  <td className="px-3 py-2">{r.customerId}</td>
                  <td className="px-3 py-2">{r.endDate ? new Date(r.endDate).toLocaleDateString("tr-TR") : ""}</td>
                </tr>
              ))}
              {!loading && expiredLicenses.length === 0 && <tr><td className="px-3 py-6 text-slate-500" colSpan={3}>Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Personel Bazlı İş Emirleri</div>
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Personel</th>
                <th className="px-3 py-2">Açık</th>
                <th className="px-3 py-2">Devam</th>
                <th className="px-3 py-2">Tamam</th>
              </tr>
            </thead>
            <tbody>
              {summary.workOrdersByUser.map((u: any) => (
                <tr key={u.userId} className="border-t">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.open}</td>
                  <td className="px-3 py-2">{u.inProgress}</td>
                  <td className="px-3 py-2">{u.closed}</td>
                </tr>
              ))}
              {!loading && summary.workOrdersByUser.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Müşteri Bazlı Özet</div>
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Hat Sayısı</th>
                <th className="px-3 py-2">Lisans Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {summary.customersOverview.map((c: any) => (
                <tr key={c.customerId} className="border-t">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.lineCount}</td>
                  <td className="px-3 py-2">{c.licenseCount}</td>
                </tr>
              ))}
              {!loading && summary.customersOverview.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
