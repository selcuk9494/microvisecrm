"use client";
import { useEffect, useState } from "react";
import { apiBase, apiFetch } from "../../../lib/api";
import FormSection from "../../../components/FormSection";
import { formatPhoneTR, normalizePhoneTR } from "../../../lib/phone";

export default function NewLine() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [createLine, setCreateLine] = useState(true);
  const [createLicense, setCreateLicense] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    line_number: "",
    imei_number: "",
    operator_id: "",
    activation_date: new Date().toISOString().slice(0,10),
    end_date: (() => { const d = new Date(); const year = d.getFullYear(); return `${year}-12-31`; })(),
    status: "aktif",
    description: ""
  });
  const [license, setLicense] = useState({
    vendor_id: "",
    activation_date: new Date().toISOString().slice(0,10),
    end_date: (() => { const d = new Date(); const year = d.getFullYear(); return `${year}-12-31`; })(),
    device: "",
    status: "aktif",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    const api = apiBase();
    fetch(api + "/customers?page=1&pageSize=999", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCustomers(d.data || []));
    fetch(api + "/operators", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setOperators(d.data || []));
    fetch(api + "/software-vendors", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setVendors(d.data || []));
    const last = localStorage.getItem("last_customer_id");
    if (last) {
      setForm(f => ({ ...f, customer_id: last }));
    }
  }, []);

  function onChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((errs)=> {
      const n = { ...errs };
      delete n[e.target.name];
      return n;
    });
  }
  function onLicenseChange(e: any) {
    setLicense({ ...license, [e.target.name]: e.target.value });
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextErrors: Record<string,string> = {};
      if (!createLine && !createLicense) nextErrors._global = "En az bir kayıt türü seçin";
      if (createLine) {
        if (!form.customer_id) nextErrors.customer_id = "Müşteri zorunlu";
        if (!form.line_number || form.line_number.replace(/\D/g,"").length !== 10) nextErrors.line_number = "Hat numarası 10 hane olmalı";
      }
      if (createLicense) {
        if (!form.customer_id) nextErrors.customer_id = "Müşteri zorunlu";
        if (!license.vendor_id) nextErrors.vendor_id = "Yazılım firması zorunlu";
      }
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); setLoading(false); return; }
      let createdLine: any = null;
      if (createLine) {
        createdLine = await apiFetch(`/lines`, { method: "POST", body: JSON.stringify(form) });
      }
      localStorage.setItem("last_customer_id", form.customer_id);
      if (createLicense) {
        const licBody = {
          customer_id: form.customer_id,
          line_id: createdLine?.id,
          vendor_id: license.vendor_id,
          activation_date: license.activation_date,
          end_date: license.end_date,
          device: license.device,
          status: license.status,
          notes: license.notes
        };
        await apiFetch(`/licenses`, { method: "POST", body: JSON.stringify(licBody) });
      }
      window.location.href = "/takip";
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Yeni Hat / GMP3</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <FormSection cols={2}>
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          {errors.customer_id && <div className="text-xs text-red-600">{errors.customer_id}</div>}
          <div className="grid items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createLine} onChange={e=>setCreateLine(e.target.checked)} />
              Hat kaydı oluştur
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={createLicense} onChange={e=>setCreateLicense(e.target.checked)} />
              GMP3 lisansı oluştur
            </label>
          </div>
        </FormSection>
        {createLine && (
          <FormSection title="Hat Bilgileri" cols={3}>
            <input className="input" type="text" name="line_number" placeholder="(533) 850 90 90" value={formatPhoneTR(form.line_number)} onChange={e=>setForm({...form, line_number: normalizePhoneTR(e.target.value)})} />
            {errors.line_number && <div className="text-xs text-red-600">{errors.line_number}</div>}
            <input className="input" name="imei_number" placeholder="SIM No" value={form.imei_number} onChange={onChange} />
            <select className="input" name="operator_id" value={form.operator_id} onChange={onChange}>
              <option value="">Operatör</option>
              {operators.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input className="input" type="date" name="activation_date" value={form.activation_date} onChange={onChange} />
            <input className="input" type="date" name="end_date" value={form.end_date} onChange={onChange} />
            <select className="input" name="status" value={form.status} onChange={onChange}>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </select>
            <textarea className="input md:col-span-3" name="description" placeholder="Açıklama" value={form.description} onChange={onChange} />
          </FormSection>
        )}
        {createLicense && (
          <FormSection title="GMP3 Lisans Bilgileri" cols={3}>
            <select className="input" name="vendor_id" value={license.vendor_id} onChange={onLicenseChange}>
              <option value="">Yazılım firması</option>
              {vendors.map((v:any)=> <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {errors.vendor_id && <div className="text-xs text-red-600">{errors.vendor_id}</div>}
            <input className="input" type="date" name="activation_date" value={license.activation_date} onChange={onLicenseChange} />
            <input className="input" type="date" name="end_date" value={license.end_date} onChange={onLicenseChange} />
            <input className="input" name="device" placeholder="Cihaz" value={license.device} onChange={onLicenseChange} />
            <select className="input" name="status" value={license.status} onChange={onLicenseChange}>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </select>
            <textarea className="input md:col-span-3" name="notes" placeholder="Notlar" value={license.notes} onChange={onLicenseChange} />
          </FormSection>
        )}
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/lines">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
