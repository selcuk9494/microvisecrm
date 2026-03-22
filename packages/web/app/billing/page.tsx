"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function Billing() {
  const [items, setItems] = useState<any[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("billing_selected") || "[]");
    if (Array.isArray(ids) && ids.length) {
      Promise.all(ids.map((id: string) => apiFetch(`/licenses/${id}`)))
        .then((rows) => setItems(rows.filter(Boolean)));
    }
  }, []);

  const total = items.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  function openPrint() {
    const html = `
    <div class="page">
      <div class="hdr">FATURA</div>
      <div class="mt">Tarih: ${date}</div>
      <div class="mt">Fatura No: ${invoiceNo}</div>
      <div class="mt">Açıklama: ${note}</div>
      <table style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead><tr><th style="text-align:left">Müşteri</th><th style="text-align:left">Cihaz</th><th style="text-align:right">Tutar</th></tr></thead>
        <tbody>
          ${items.map((r)=>`<tr><td>${r.customerId}</td><td>${r.device||""}</td><td style="text-align:right">${Number(r.amount||0).toFixed(2)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div class="mt" style="text-align:right; font-weight:700">Toplam: ${total.toFixed(2)}</div>
    </div>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Fatura</title><style>
      @page { size: A4; margin: 10mm; }
      body{font-family: Arial,Helvetica,sans-serif; line-height:1.35; color:#0f172a}
      .page{width:190mm; min-height:277mm; margin:0 auto;}
      .hdr{font-size:18px; font-weight:700}
      .mt{margin-top:8px}
    </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fatura Kes</h1>
        <div className="flex gap-2">
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <input className="input" placeholder="Fatura No" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} />
          <button className="btn btn-secondary" onClick={openPrint}>Yazdır</button>
        </div>
      </div>
      <div className="card p-4">
        <textarea className="input" placeholder="Açıklama" value={note} onChange={e=>setNote(e.target.value)} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Cihaz</th>
              <th className="px-3 py-2">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r)=> (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.customerId}</td>
                <td className="px-3 py-2">{r.device || ""}</td>
                <td className="px-3 py-2">
                  <input className="input w-28 text-right" type="number" step="0.01" value={r.amount || ""} onChange={e=>{
                    const val = e.target.value;
                    setItems((list)=> list.map((x)=> x.id===r.id ? { ...x, amount: val } : x));
                  }} />
                </td>
              </tr>
            ))}
            {items.length===0 && (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Seçili uzatma kaydı bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-right text-sm font-semibold">Toplam: {total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
}
