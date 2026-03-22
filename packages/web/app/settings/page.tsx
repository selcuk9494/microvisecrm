 "use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useToast } from "../../components/Toast";

export default function Settings() {
  const [tab, setTab] = useState<"import" | "types" | "vendors">("import");
  const toast = useToast();
  const [customersCsv, setCustomersCsv] = useState<File | null>(null);
  const [linesCsv, setLinesCsv] = useState<File | null>(null);
  const [licensesCsv, setLicensesCsv] = useState<File | null>(null);
  const [xlsxReady, setXlsxReady] = useState(false);
  const [rowsCache, setRowsCache] = useState<{[k:string]: any[]}>({});
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<{[k:string]: any}>({});
  const [preview, setPreview] = useState<{[k:string]: string}>({});
  const [progress, setProgress] = useState<{[k:string]: { done: number, total: number } | null}>({});
  const [preErrors, setPreErrors] = useState<{[k:string]: Array<{index:number, errors:string[], row:any}>}>({});
  const [types, setTypes] = useState<any[]>([]);
  const [typeForm, setTypeForm] = useState({ id: "", name: "", code: "" });
  const [savingType, setSavingType] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorForm, setVendorForm] = useState({ id: "", name: "", active: true });
  const [savingVendor, setSavingVendor] = useState(false);

  async function loadTypes() {
    try {
      const d = await apiFetch(`/work-order-types`);
      setTypes(d.data || []);
    } catch {}
  }
  async function loadVendors() {
    try {
      const d = await apiFetch(`/software-vendors`);
      setVendors(d.data || []);
    } catch {}
  }
  useEffect(() => {
    if (tab === "types") loadTypes();
    if (tab === "vendors") loadVendors();
  }, [tab]);

  useEffect(() => {
    const load = async () => {
      if (typeof window === "undefined") return;
      if ((window as any).XLSX) { setXlsxReady(true); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js";
      s.async = true;
      s.onload = () => setXlsxReady(true);
      s.onerror = () => setXlsxReady(false);
      document.body.appendChild(s);
    };
    load();
  }, []);

  function parseExcelSerial(n: number) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + n * 86400000);
  }
  function parseDateFlexible(v: any): Date | null {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v === "number") return parseExcelSerial(v);
    if (typeof v === "string") {
      const s = v.trim();
      const t1 = /^\d{4}-\d{2}-\d{2}$/;
      const t2 = /^(\d{2})\.(\d{2})\.(\d{4})$/;
      const t3 = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      if (t1.test(s)) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
      const m2 = s.match(t2);
      if (m2) { const d = new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1])); return isNaN(d.getTime()) ? null : d; }
      const m3 = s.match(t3);
      if (m3) { const d = new Date(Number(m3[3]), Number(m3[2]) - 1, Number(m3[1])); return isNaN(d.getTime()) ? null : d; }
      const dflt = new Date(s);
      return isNaN(dflt.getTime()) ? null : dflt;
    }
    return null;
  }
  function validateRows(kind: "customers" | "lines" | "licenses", rows: any[]) {
    const out: Array<{ index: number, errors: string[], row: any }> = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const errs: string[] = [];
      if (kind === "customers") {
        if (!r.customer_name || String(r.customer_name).trim() === "") errs.push("customer_name zorunlu");
        if (r.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(r.email))) errs.push("email formatı geçersiz");
      } else if (kind === "lines") {
        if (!r.customer_name || String(r.customer_name).trim() === "") errs.push("customer_name zorunlu");
        if (!r.line_number || String(r.line_number).trim() === "") errs.push("line_number zorunlu");
        if (r.activation_date !== undefined && r.activation_date !== "" && parseDateFlexible(r.activation_date) === null) errs.push("activation_date geçersiz");
        if (r.end_date !== undefined && r.end_date !== "" && parseDateFlexible(r.end_date) === null) errs.push("end_date geçersiz");
        if (r.status && !["aktif","pasif"].includes(String(r.status))) errs.push("status değeri geçersiz");
      } else if (kind === "licenses") {
        if (!r.customer_name || String(r.customer_name).trim() === "") errs.push("customer_name zorunlu");
        if (!r.license_name || String(r.license_name).trim() === "") errs.push("license_name zorunlu");
        if (!r.license_key || String(r.license_key).trim() === "") errs.push("license_key zorunlu");
        if (r.activation_date !== undefined && r.activation_date !== "" && parseDateFlexible(r.activation_date) === null) errs.push("activation_date geçersiz");
        if (r.end_date !== undefined && r.end_date !== "" && parseDateFlexible(r.end_date) === null) errs.push("end_date geçersiz");
        if (r.status && !["aktif","pasif"].includes(String(r.status))) errs.push("status değeri geçersiz");
      }
      if (errs.length) out.push({ index: i + 2, errors: errs, row: r });
    }
    return out;
  }

  async function onImport(kind: "customers" | "lines" | "licenses", force = false) {
    setBusy(true);
    try {
      const file = kind === "customers" ? customersCsv : kind === "lines" ? linesCsv : licensesCsv;
      if (!file) {
        toast.push({ id: Date.now(), text: "Dosya seçin", type: "error" });
        return;
      }
      const rows = rowsCache[kind];
      if (!rows || rows.length === 0) {
        toast.push({ id: Date.now(), text: "XLSX okunamadı", type: "error" });
        return;
      }
      const errs = validateRows(kind, rows);
      setPreErrors((pe) => ({ ...pe, [kind]: errs }));
      if (errs.length && !force) {
        toast.push({ id: Date.now(), text: `Ön doğrulama: ${errs.length} hata bulundu`, type: "error" });
        return;
      }
      const chunkSize = 500;
      const total = rows.length;
      let created = 0, updated = 0; let allErrors: any[] = [];
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        setProgress((p) => ({ ...p, [kind]: { done: Math.min(i + chunk.length, total), total } }));
        const part = await apiFetch(`/imports/${kind}`, { method: "POST", body: JSON.stringify({ rows: chunk }) });
        created += part.created || 0;
        updated += part.updated || 0;
        if (Array.isArray(part.errors)) allErrors = allErrors.concat(part.errors);
      }
      setProgress((p) => ({ ...p, [kind]: null }));
      const res = { created, updated, errors: allErrors };
      setImportResult((r) => ({ ...r, [kind]: res }));
      toast.push({ id: Date.now(), text: `İşlem tamam: eklenen ${res.created}, güncellenen ${res.updated}`, type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "İçeri aktarma başarısız", type: "error" });
    } finally {
      setBusy(false);
    }
  }
  async function handleFile(kind: "customers" | "lines" | "licenses", f: File | null) {
    if (!f) return;
    if (!xlsxReady) { setPreview((p) => ({ ...p, [kind]: "XLSX kütüphanesi yüklenemedi" })); return; }
    try {
      const ab = await f.arrayBuffer();
      const wb = (window as any).XLSX.read(new Uint8Array(ab), { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = (window as any).XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRowsCache((rc) => ({ ...rc, [kind]: rows }));
      setPreview((p) => ({ ...p, [kind]: JSON.stringify(rows.slice(0, 3), null, 2) }));
    } catch {
      setPreview((p) => ({ ...p, [kind]: "Dosya okunamadı" }));
    }
  }

  async function downloadTemplate(kind: "customers" | "lines" | "licenses") {
    try {
      if (!xlsxReady) { toast.push({ id: Date.now(), text: "XLSX kütüphanesi yüklenemedi", type: "error" }); return; }
      const headers: any = {
        customers: ["customer_name","company_name","phone","email","address","tax_number","notes"],
        lines: ["customer_name","line_number","sim_no","operator_name","activation_date","end_date","status","description"],
        licenses: ["customer_name","license_name","license_key","activation_date","end_date","device","status","notes"]
      }[kind];
      const examples: any[] = {
        customers: [{ customer_name: "ACME Ltd", company_name: "ACME", phone: "555-1234", email: "info@acme.com", address: "İstanbul", tax_number: "1234567890", notes: "VIP" }],
        lines: [{ customer_name: "ACME Ltd", line_number: "905551234567", sim_no: "8991101200003204510", operator_name: "Turkcell", activation_date: "2025-01-01", end_date: "2026-01-01", status: "aktif", description: "GPS modem" }],
        licenses: [{ customer_name: "ACME Ltd", license_name: "GMP3 Standard", license_key: "ABC-123-XYZ", activation_date: "2025-02-01", end_date: "2026-02-01", device: "Modül v2", status: "aktif", notes: "" }]
      }[kind] || [];
      const wb = (window as any).XLSX.utils.book_new();
      const ws = (window as any).XLSX.utils.json_to_sheet(examples, { header: headers });
      (window as any).XLSX.utils.book_append_sheet(wb, ws, "Template");
      const descRows: any[] = headers.map((h: string) => {
        const desc: any = {
          customer_name: "Zorunlu. Müşteri adı (mevcutsa günceller).",
          company_name: "Opsiyonel. Firma adı.",
          phone: "Opsiyonel. Telefon.",
          email: "Opsiyonel. Geçerli e-posta.",
          address: "Opsiyonel. Adres.",
          tax_number: "Opsiyonel. Vergi no.",
          notes: "Opsiyonel. Notlar.",
          line_number: "Zorunlu. Hat numarası (mevcutsa günceller).",
          sim_no: "Opsiyonel. SIM kart numarası (ICCID).",
          operator_name: "Opsiyonel. Operatör adı (yoksa oluşturulur).",
          activation_date: "Opsiyonel. Başlangıç tarihi (yyyy-mm-dd, dd.mm.yyyy, dd/mm/yyyy).",
          end_date: "Opsiyonel. Bitiş tarihi (yyyy-mm-dd, dd.mm.yyyy, dd/mm/yyyy).",
          status: "Opsiyonel. aktif|pasif.",
          description: "Opsiyonel. Açıklama.",
          license_name: "Zorunlu. Lisans adı.",
          license_key: "Zorunlu. Anahtar (mevcutsa günceller).",
          device: "Opsiyonel. Cihaz adı."
        }[h] || "";
        return { column: h, description: desc };
      });
      const ws2 = (window as any).XLSX.utils.json_to_sheet(descRows, { header: ["column","description"] });
      (window as any).XLSX.utils.book_append_sheet(wb, ws2, "README");
      const out = (window as any).XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}.template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.push({ id: Date.now(), text: "Şablon indirilemedi", type: "error" });
    }
  }

  function onTypeChange(e: any) {
    setTypeForm({ ...typeForm, [e.target.name]: e.target.value });
  }
  async function saveType(e: any) {
    e.preventDefault();
    if (!typeForm.name.trim()) {
      toast.push({ id: Date.now(), text: "Ad zorunlu", type: "error" });
      return;
    }
    setSavingType(true);
    try {
      if (typeForm.id) {
        await apiFetch(`/work-order-types/${typeForm.id}`, { method: "PUT", body: JSON.stringify({ name: typeForm.name, code: typeForm.code }) });
      } else {
        await apiFetch(`/work-order-types`, { method: "POST", body: JSON.stringify({ name: typeForm.name, code: typeForm.code }) });
      }
      setTypeForm({ id: "", name: "", code: "" });
      await loadTypes();
      toast.push({ id: Date.now(), text: "Kaydedildi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Kayıt başarısız", type: "error" });
    } finally {
      setSavingType(false);
    }
  }
  async function editType(t: any) {
    setTypeForm({ id: t.id, name: t.name, code: t.code || "" });
  }
  async function deleteType(id: string) {
    if (!confirm("Silinsin mi?")) return;
    try {
      await apiFetch(`/work-order-types/${id}`, { method: "DELETE" });
      await loadTypes();
      toast.push({ id: Date.now(), text: "Silindi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    }
  }
  function onVendorChange(e: any) {
    const { name, value, type, checked } = e.target;
    setVendorForm({ ...vendorForm, [name]: type === "checkbox" ? checked : value });
  }
  async function saveVendor(e: any) {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      toast.push({ id: Date.now(), text: "Firma adı zorunlu", type: "error" });
      return;
    }
    setSavingVendor(true);
    try {
      if (vendorForm.id) {
        await apiFetch(`/software-vendors/${vendorForm.id}`, { method: "PUT", body: JSON.stringify({ name: vendorForm.name, active: vendorForm.active }) });
      } else {
        await apiFetch(`/software-vendors`, { method: "POST", body: JSON.stringify({ name: vendorForm.name, active: vendorForm.active }) });
      }
      setVendorForm({ id: "", name: "", active: true });
      await loadVendors();
      toast.push({ id: Date.now(), text: "Kaydedildi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Kayıt başarısız", type: "error" });
    } finally {
      setSavingVendor(false);
    }
  }
  async function editVendor(v: any) {
    setVendorForm({ id: v.id, name: v.name, active: v.active });
  }
  async function deleteVendor(id: string) {
    if (!confirm("Silinsin mi?")) return;
    try {
      await apiFetch(`/software-vendors/${id}`, { method: "DELETE" });
      await loadVendors();
      toast.push({ id: Date.now(), text: "Silindi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <div className="flex gap-2">
          <button className={`btn ${tab === "import" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("import")}>İçeri Aktarma</button>
          <button className={`btn ${tab === "types" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("types")}>İş Emri Tipleri</button>
          <button className={`btn ${tab === "vendors" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("vendors")}>Yazılım Firmaları</button>
        </div>
      </div>
      {tab === "import" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Müşteri Aktarma</div>
            <div className="mb-3 text-sm text-slate-600">XLSX şablonu ile müşteri içeri aktar</div>
            <div className="mb-3">
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={async e => { const f=e.target.files?.[0]||null; setCustomersCsv(f); if (f) await handleFile("customers", f); }} />
            </div>
            {preview.customers && (<pre className="mb-3 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 text-xs">{preview.customers}</pre>)}
      {preErrors.customers?.length ? (
        <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          Ön doğrulama: {preErrors.customers.length} hata bulundu. İlk 3:
          <ul className="list-disc pl-5">
            {preErrors.customers.slice(0,3).map((e) => (<li key={e.index}>Satır {e.index}: {e.errors.join(" | ")}</li>))}
          </ul>
        </div>
      ) : null}
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => downloadTemplate("customers")}>Şablonu indir</button>
        <button className="btn btn-primary" onClick={() => onImport("customers")} disabled={busy}>{busy ? "Yükleniyor..." : "Yükle"}</button>
        {preErrors.customers?.length ? <button className="btn btn-secondary" onClick={() => onImport("customers", true)} disabled={busy}>Zorla Yükle</button> : null}
            </div>
      {progress.customers && <div className="mt-2 text-xs text-slate-600">Yükleme: {progress.customers.done}/{progress.customers.total}</div>}
            {importResult.customers && (
              <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
          <div>Eklenen: {importResult.customers.created}, Güncellenen: {importResult.customers.updated}, Hatalar: {importResult.customers.errors?.length || 0}</div>
                {!!(importResult.customers.errors?.length) && <button className="btn btn-secondary" onClick={() => {
                  const errs = (importResult.customers.errors || []).map((e: any) => {
                    const row = e.row || {};
                    return { row_index: e.index ?? "", errors: (e.errors || [e.error]).filter(Boolean).join(" | "), ...row };
                  });
                  if (!(window as any).XLSX || errs.length === 0) return;
                  const wb = (window as any).XLSX.utils.book_new();
                  const ws = (window as any).XLSX.utils.json_to_sheet(errs);
                  (window as any).XLSX.utils.book_append_sheet(wb, ws, "Errors");
                  const out = (window as any).XLSX.write(wb, { bookType: "xlsx", type: "array" });
                  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "customers.import.errors.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Hata raporu indir</button>}
              </div>
            )}
          </div>
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Hat Aktarma</div>
            <div className="mb-3 text-sm text-slate-600">XLSX şablonu ile hat içeri aktar</div>
            <div className="mb-3">
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={async e => { const f=e.target.files?.[0]||null; setLinesCsv(f); if (f) await handleFile("lines", f); }} />
            </div>
            {preview.lines && (<pre className="mb-3 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 text-xs">{preview.lines}</pre>)}
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => downloadTemplate("lines")}>Şablonu indir</button>
              <button className="btn btn-primary" onClick={() => onImport("lines")} disabled={busy}>{busy ? "Yükleniyor..." : "Yükle"}</button>
            </div>
      {preErrors.lines?.length ? (
        <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          Ön doğrulama: {preErrors.lines.length} hata bulundu. İlk 3:
          <ul className="list-disc pl-5">
            {preErrors.lines.slice(0,3).map((e) => (<li key={e.index}>Satır {e.index}: {e.errors.join(" | ")}</li>))}
          </ul>
        </div>
      ) : null}
      {progress.lines && <div className="mt-2 text-xs text-slate-600">Yükleme: {progress.lines.done}/{progress.lines.total}</div>}
      {importResult.lines && (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
          <div>Eklenen: {importResult.lines.created}, Güncellenen: {importResult.lines.updated}, Hatalar: {importResult.lines.errors?.length || 0}</div>
          {!!(importResult.lines.errors?.length) && <button className="btn btn-secondary" onClick={() => {
                  const errs = (importResult.lines.errors || []).map((e: any) => {
                    const row = e.row || {};
                    return { row_index: e.index ?? "", errors: (e.errors || [e.error]).filter(Boolean).join(" | "), ...row };
                  });
                  if (!(window as any).XLSX || errs.length === 0) return;
                  const wb = (window as any).XLSX.utils.book_new();
                  const ws = (window as any).XLSX.utils.json_to_sheet(errs);
                  (window as any).XLSX.utils.book_append_sheet(wb, ws, "Errors");
                  const out = (window as any).XLSX.write(wb, { bookType: "xlsx", type: "array" });
                  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "lines.import.errors.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Hata raporu indir</button>}
        </div>
      )}
          </div>
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">GMP3 Lisans Aktarma</div>
            <div className="mb-3 text-sm text-slate-600">XLSX şablonu ile lisans içeri aktar</div>
            <div className="mb-3">
              <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={async e => { const f=e.target.files?.[0]||null; setLicensesCsv(f); if (f) await handleFile("licenses", f); }} />
            </div>
            {preview.licenses && (<pre className="mb-3 max-h-32 overflow-auto rounded-md bg-slate-50 p-2 text-xs">{preview.licenses}</pre>)}
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={() => downloadTemplate("licenses")}>Şablonu indir</button>
              <button className="btn btn-primary" onClick={() => onImport("licenses")} disabled={busy}>{busy ? "Yükleniyor..." : "Yükle"}</button>
            </div>
      {preErrors.licenses?.length ? (
        <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          Ön doğrulama: {preErrors.licenses.length} hata bulundu. İlk 3:
          <ul className="list-disc pl-5">
            {preErrors.licenses.slice(0,3).map((e) => (<li key={e.index}>Satır {e.index}: {e.errors.join(" | ")}</li>))}
          </ul>
        </div>
      ) : null}
      {progress.licenses && <div className="mt-2 text-xs text-slate-600">Yükleme: {progress.licenses.done}/{progress.licenses.total}</div>}
      {importResult.licenses && (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
          <div>Eklenen: {importResult.licenses.created}, Güncellenen: {importResult.licenses.updated}, Hatalar: {importResult.licenses.errors?.length || 0}</div>
          {!!(importResult.licenses.errors?.length) && <button className="btn btn-secondary" onClick={() => {
                  const errs = (importResult.licenses.errors || []).map((e: any) => {
                    const row = e.row || {};
                    return { row_index: e.index ?? "", errors: (e.errors || [e.error]).filter(Boolean).join(" | "), ...row };
                  });
                  if (!(window as any).XLSX || errs.length === 0) return;
                  const wb = (window as any).XLSX.utils.book_new();
                  const ws = (window as any).XLSX.utils.json_to_sheet(errs);
                  (window as any).XLSX.utils.book_append_sheet(wb, ws, "Errors");
                  const out = (window as any).XLSX.write(wb, { bookType: "xlsx", type: "array" });
                  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "licenses.import.errors.xlsx";
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Hata raporu indir</button>}
        </div>
      )}
          </div>
        </div>
      )}
      {tab === "types" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Yeni Tip</div>
            <form onSubmit={saveType} className="grid gap-3">
              <input className="input" name="name" placeholder="Ad" value={typeForm.name} onChange={onTypeChange} />
              <input className="input" name="code" placeholder="Kod" value={typeForm.code} onChange={onTypeChange} />
              <div className="flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={savingType}>{savingType ? "Kaydediliyor..." : "Kaydet"}</button>
                {typeForm.id && <button className="btn btn-secondary" type="button" onClick={() => setTypeForm({ id: "", name: "", code: "" })}>Temizle</button>}
              </div>
            </form>
          </div>
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Tanımlı Tipler</div>
            <table className="w-full table-auto text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-3 py-2">Ad</th>
                  <th className="px-3 py-2">Kod</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {types.map(t => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">{t.name}</td>
                    <td className="px-3 py-2">{t.code}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => editType(t)}>Düzenle</button>
                        <button className="btn btn-secondary" onClick={() => deleteType(t.id)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {types.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "vendors" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Yazılım Firması Ekle/Düzenle</div>
            <form className="grid gap-3" onSubmit={saveVendor}>
              <input className="input" name="name" placeholder="Firma adı" value={vendorForm.name} onChange={onVendorChange} />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="active" checked={vendorForm.active} onChange={onVendorChange} />
                Aktif
              </label>
              <div className="flex justify-end gap-2">
                <button type="submit" className="btn btn-primary" disabled={savingVendor}>{savingVendor ? "Kaydediliyor..." : "Kaydet"}</button>
                {vendorForm.id && <button type="button" className="btn btn-secondary" onClick={() => setVendorForm({ id: "", name: "", active: true })}>Temizle</button>}
              </div>
            </form>
          </div>
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Firmalar</div>
            <table className="w-full table-auto text-sm">
              <thead className="bg-slate-100 text-left">
                <tr><th className="px-3 py-2">Ad</th><th className="px-3 py-2">Durum</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2">{v.name}</td>
                    <td className="px-3 py-2">{v.active ? "aktif" : "pasif"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="btn btn-secondary" onClick={() => editVendor(v)}>Düzenle</button>
                        <button className="btn btn-secondary" onClick={() => deleteVendor(v.id)}>Sil</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Kayıt yok</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
