"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { formatPhoneTR } from "../../lib/phone";
import Modal from "../../components/Modal";

type Tab = "lines" | "licenses";

export default function Takip() {
  const [tab, setTab] = useState<Tab>("lines");
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [hasLicense, setHasLicense] = useState<"" | "1" | "0">("");
  const [hasLine, setHasLine] = useState<"" | "1" | "0">("");
  const [qLine, setQLine] = useState("");
  const [qLineCust, setQLineCust] = useState("");
  const [qLineOp, setQLineOp] = useState("");
  const [qLineAct, setQLineAct] = useState("");
  const [qLineEnd, setQLineEnd] = useState("");
  const [qLineStatus, setQLineStatus] = useState("");
  const [qLicName, setQLicName] = useState("");
  const [qLicKey, setQLicKey] = useState("");
  const [qLicCust, setQLicCust] = useState("");
  const [selectedLic, setSelectedLic] = useState<string[]>([]);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [extendDaysLines, setExtendDaysLines] = useState<number>(30);
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignCustomer, setReassignCustomer] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "200");
      if (status) qs.set("filter[status]", status);
      if (customerId) qs.set("filter[customer_id]", customerId);
      if (dateFrom) qs.set("filter[date_from]", dateFrom);
      if (dateTo) qs.set("filter[date_to]", dateTo);
      const qsLines = new URLSearchParams(qs);
      const qsLic = new URLSearchParams(qs);
      if (hasLicense) qsLines.set("filter[has_license]", hasLicense);
      if (operatorId) qsLines.set("filter[operator_id]", operatorId);
      if (hasLine) qsLic.set("filter[has_line]", hasLine);
      const [ls, g, cs, ops] = await Promise.all([
        apiFetch(`/lines?${qsLines.toString()}`),
        apiFetch(`/licenses?${qsLic.toString()}`),
        apiFetch(`/customers?page=1&pageSize=999`),
        apiFetch(`/operators`)
      ]);
      setLines(ls.data || []);
      setLicenses(g.data || []);
      setCustomers(cs.data || []);
      setOperators(ops.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  const viewLines = lines.filter((l) => {
    const custName = customers.find((c:any)=>c.id===l.customerId)?.customerName || "";
    const opName = operators.find((o:any)=>o.id===l.operatorId)?.name || "";
    const act = l.activationDate ? new Date(l.activationDate).toLocaleDateString("tr-TR") : "";
    const end = l.endDate ? new Date(l.endDate).toLocaleDateString("tr-TR") : "";
    return (qLine ? String(l.lineNumber||"").toLowerCase().includes(qLine.toLowerCase()) : true)
      && (qLineCust ? custName.toLowerCase().includes(qLineCust.toLowerCase()) : true)
      && (qLineOp ? opName.toLowerCase().includes(qLineOp.toLowerCase()) : true)
      && (qLineAct ? act.toLowerCase().includes(qLineAct.toLowerCase()) : true)
      && (qLineEnd ? end.toLowerCase().includes(qLineEnd.toLowerCase()) : true)
      && (qLineStatus ? String(l.status||"").toLowerCase().includes(qLineStatus.toLowerCase()) : true);
  });
  const viewLicenses = licenses.filter((g) => {
    const custName = customers.find((c:any)=>c.id===g.customerId)?.customerName || "";
    return (qLicName ? String(g.licenseName||"").toLowerCase().includes(qLicName.toLowerCase()) : true)
      && (qLicKey ? String(g.licenseKey||"").toLowerCase().includes(qLicKey.toLowerCase()) : true)
      && (qLicCust ? custName.toLowerCase().includes(qLicCust.toLowerCase()) : true);
  });
  function toggleLic(id: string, checked: boolean) {
    setSelectedLic((s)=> checked ? Array.from(new Set([...s,id])) : s.filter(x=>x!==id));
  }
  function toggleLine(id: string, checked: boolean) {
    setSelectedLines((s)=> checked ? Array.from(new Set([...s,id])) : s.filter(x=>x!==id));
  }
  function toggleLineAll(checked: boolean) {
    if (checked) setSelectedLines(viewLines.map((l)=>l.id));
    else setSelectedLines([]);
  }
  async function bulkExtendLines() {
    if (extendDaysLines <= 0 || selectedLines.length===0) return;
    setLoading(true);
    try {
      await apiFetch(`/lines/bulk-extend`, { method: "POST", body: JSON.stringify({ ids: selectedLines, days: extendDaysLines }) });
      await load();
      setSelectedLines([]);
    } finally {
      setLoading(false);
    }
  }
  function toggleLicAll(checked: boolean) {
    if (checked) setSelectedLic(viewLicenses.map((g)=>g.id));
    else setSelectedLic([]);
  }
  async function bulkExtend() {
    if (extendDays <= 0 || selectedLic.length===0) return;
    setLoading(true);
    try {
      await Promise.all(selectedLic.map(async (id) => {
        const g = licenses.find((x)=>x.id===id);
        const base = g?.endDate ? new Date(g.endDate) : new Date();
        base.setDate(base.getDate() + extendDays);
        const nd = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,"0")}-${String(base.getDate()).padStart(2,"0")}`;
        await apiFetch(`/licenses/${id}`, { method: "PUT", body: JSON.stringify({ end_date: nd }) });
      }));
      await load();
      setSelectedLic([]);
    } finally {
      setLoading(false);
    }
  }
  async function bulkSetStatus() {
    if (!bulkStatus || selectedLic.length===0) return;
    setLoading(true);
    try {
      await Promise.all(selectedLic.map((id)=> apiFetch(`/licenses/${id}`, { method: "PUT", body: JSON.stringify({ status: bulkStatus }) })));
      await load();
      setSelectedLic([]);
    } finally {
      setLoading(false);
    }
  }
  async function bulkDelete() {
    if (selectedLic.length===0) return;
    setLoading(true);
    try {
      await Promise.all(selectedLic.map((id)=> apiFetch(`/licenses/${id}`, { method: "DELETE" })));
      await load();
      setSelectedLic([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Takip</h1>
        <div className="flex gap-2">
          <a className="btn btn-primary" href="/lines/new">Yeni Hat + GMP3</a>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <button className={`rounded-full px-3 py-1 text-sm ${tab==="lines"?"bg-slate-900 text-white":"bg-slate-100 text-slate-700"}`} onClick={()=>setTab("lines")}>Hatlar</button>
          <button className={`rounded-full px-3 py-1 text-sm ${tab==="licenses"?"bg-slate-900 text-white":"bg-slate-100 text-slate-700"}`} onClick={()=>setTab("licenses")}>GMP3 Lisanslar</button>
        </div>
        <select className="input max-w-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Durum</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
        <select className="input max-w-xs" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Müşteri</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
        </select>
        {tab==="lines" && (
          <select className="input max-w-xs" value={operatorId} onChange={e => setOperatorId(e.target.value)}>
            <option value="">Operatör</option>
            {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        {tab==="lines" ? (
          <select className="input max-w-xs" value={hasLicense} onChange={e=>setHasLicense(e.target.value as any)}>
            <option value="">Lisans filtresi</option>
            <option value="1">GMP3 lisansı olan hatlar</option>
            <option value="0">GMP3 lisansı olmayan hatlar</option>
          </select>
        ) : (
          <select className="input max-w-xs" value={hasLine} onChange={e=>setHasLine(e.target.value as any)}>
            <option value="">Hat filtresi</option>
            <option value="1">Hattı olan lisanslar</option>
            <option value="0">Hattı olmayan lisanslar</option>
          </select>
        )}
        <input className="input max-w-xs" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input className="input max-w-xs" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn btn-secondary" onClick={load} disabled={loading}>{loading ? "Yükleniyor..." : "Uygula"}</button>
      </div>
      <div className="card overflow-hidden">
        {tab==="lines" ? (
          <>
          {selectedLines.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2">
              <div className="text-sm text-slate-700">Seçili {selectedLines.length} hat</div>
              <input className="input w-24" type="number" min={1} value={extendDaysLines} onChange={e=>setExtendDaysLines(Number(e.target.value))} />
              <button className="btn btn-secondary" onClick={bulkExtendLines} disabled={loading || extendDaysLines<=0}>Gün Uzat</button>
              <button className="btn btn-secondary" onClick={()=>setSelectedLines([])}>Seçimi Temizle</button>
            </div>
          )}
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-3 py-2">
                  <input type="checkbox" checked={selectedLines.length>0 && selectedLines.length===viewLines.length} onChange={e=>toggleLineAll(e.target.checked)} />
                </th>
                <th className="px-3 py-2">Hat No</th>
                <th className="px-3 py-2">Müşteri</th>
                <th className="px-3 py-2">Operatör</th>
                <th className="px-3 py-2">Aktivasyon</th>
                <th className="px-3 py-2">Bitiş</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2"></th>
              </tr>
              <tr>
                <th></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLine} onChange={e=>setQLine(e.target.value)} /></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLineCust} onChange={e=>setQLineCust(e.target.value)} /></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLineOp} onChange={e=>setQLineOp(e.target.value)} /></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLineAct} onChange={e=>setQLineAct(e.target.value)} /></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLineEnd} onChange={e=>setQLineEnd(e.target.value)} /></th>
                <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLineStatus} onChange={e=>setQLineStatus(e.target.value)} /></th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {viewLines.map((l) => (
                <tr key={l.id} className={`border-t ${l.hasLicense ? "bg-emerald-50" : ""}`}>
                  <td className="px-3 py-2"><input type="checkbox" checked={selectedLines.includes(l.id)} onChange={e=>toggleLine(l.id, e.target.checked)} /></td>
                  <td className="px-3 py-2">{formatPhoneTR(l.lineNumber||"")}</td>
                  <td className="px-3 py-2">{customers.find((c:any)=>c.id===l.customerId)?.customerName || l.customerId}</td>
                  <td className="px-3 py-2">{operators.find((o:any)=>o.id===l.operatorId)?.name || "-"}</td>
                  <td className="px-3 py-2">{l.activationDate ? new Date(l.activationDate).toLocaleDateString("tr-TR") : ""}</td>
                  <td className="px-3 py-2">{l.endDate ? new Date(l.endDate).toLocaleDateString("tr-TR") : ""}</td>
                  <td className="px-3 py-2">
                    {l.status}
                    {l.hasLicense && <span className="ml-2 inline-block rounded bg-emerald-200 px-2 py-0.5 text-xs text-emerald-800">GMP3</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <a className="btn btn-secondary" href={`/lines/${l.id}`}>Düzenle</a>
                      <button className="btn btn-secondary" onClick={() => { setReassignId(l.id); setReassignCustomer(l.customerId); }}>Devret</button>
                      <button className="btn btn-secondary" onClick={async () => { await apiFetch(`/lines/${l.id}`, { method: "DELETE" }); await load(); }}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && lines.length===0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>
              )}
            </tbody>
          </table>
          </>
        ) : (
          <div>
            {selectedLic.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2">
                <div className="text-sm text-slate-700">Seçili {selectedLic.length} lisans</div>
                <input className="input w-24" type="number" min={1} value={extendDays} onChange={e=>setExtendDays(Number(e.target.value))} />
                <button className="btn btn-secondary" onClick={bulkExtend} disabled={loading || extendDays<=0}>Gün Uzat</button>
                <select className="input" value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}>
                  <option value="">Durum değiştir</option>
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
                <button className="btn btn-secondary" onClick={bulkSetStatus} disabled={!bulkStatus || loading}>Uygula</button>
                <button className="btn btn-secondary" onClick={bulkDelete} disabled={loading}>Sil</button>
                <button className="btn btn-secondary" onClick={()=>setSelectedLic([])}>Seçimi Temizle</button>
              </div>
            )}
            <table className="w-full table-auto text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-3 py-2">
                    <input type="checkbox" checked={selectedLic.length>0 && selectedLic.length===viewLicenses.length} onChange={e=>toggleLicAll(e.target.checked)} />
                  </th>
                  <th className="px-3 py-2">Lisans Adı</th>
                  <th className="px-3 py-2">Anahtar</th>
                  <th className="px-3 py-2">Müşteri</th>
                  <th className="px-3 py-2">Aktivasyon</th>
                  <th className="px-3 py-2">Bitiş</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2"></th>
                </tr>
                <tr>
                  <th></th>
                  <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLicName} onChange={e=>setQLicName(e.target.value)} /></th>
                  <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLicKey} onChange={e=>setQLicKey(e.target.value)} /></th>
                  <th className="px-3 py-2"><input className="input" placeholder="Ara" value={qLicCust} onChange={e=>setQLicCust(e.target.value)} /></th>
                  <th></th><th></th><th></th>
                </tr>
              </thead>
              <tbody>
                {viewLicenses.map((g) => (
                  <tr key={g.id} className={`border-t ${g.hasLine ? "bg-sky-50" : ""}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selectedLic.includes(g.id)} onChange={e=>toggleLic(g.id, e.target.checked)} /></td>
                    <td className="px-3 py-2">{g.licenseName}</td>
                    <td className="px-3 py-2">{g.licenseKey}</td>
                    <td className="px-3 py-2">{customers.find((c:any)=>c.id===g.customerId)?.customerName || g.customerId}</td>
                    <td className="px-3 py-2">{g.activationDate ? new Date(g.activationDate).toLocaleDateString("tr-TR") : ""}</td>
                    <td className="px-3 py-2">{g.endDate ? new Date(g.endDate).toLocaleDateString("tr-TR") : ""}</td>
                    <td className="px-3 py-2">
                      {g.status}
                      {g.hasLine && <span className="ml-2 inline-block rounded bg-sky-200 px-2 py-0.5 text-xs text-sky-900">Hat</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <a className="btn btn-secondary" href={`/licenses/${g.id}`}>Düzenle</a>
                        <button className="btn btn-secondary" onClick={async () => { await apiFetch(`/licenses/${g.id}`, { method: "DELETE" }); await load(); }}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && viewLicenses.length===0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!reassignId} title="Hat Devret" onClose={() => setReassignId(null)}>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiFetch(`/lines/${reassignId}`, {
                method: "PUT",
                body: JSON.stringify({ customer_id: reassignCustomer })
              });
              setReassignId(null);
              await load();
            } catch {}
          }}
        >
          <select className="input" value={reassignCustomer} onChange={e=>setReassignCustomer(e.target.value)}>
            {customers.map((c:any)=> <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" type="button" onClick={()=>setReassignId(null)}>Vazgeç</button>
            <button className="btn btn-primary" type="submit">Devret</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
