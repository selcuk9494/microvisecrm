"use client";
import { useEffect, useState } from "react";
import { apiBase } from "../../../lib/api";
import FormSection from "../../../components/FormSection";

export default function NewLicense() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
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
    fetch(api + "/software-vendors", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setVendors(d.data || []));
  }, []);

  function onChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((errs)=> {
      const n = { ...errs };
      delete n[e.target.name];
      return n;
    });
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextErrors: Record<string,string> = {};
      if (!form.customer_id) nextErrors.customer_id = "Müşteri zorunlu";
      if (!form.vendor_id) nextErrors.vendor_id = "Yazılım firması zorunlu";
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); setLoading(false); return; }
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(apiBase() + "/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Kayıt başarısız");
      }
      window.location.href = "/licenses";
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Yeni GMP3 Lisansı</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <FormSection cols={2}>
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          {errors.customer_id && <div className="text-xs text-red-600">{errors.customer_id}</div>}
          <select className="input" name="vendor_id" value={form.vendor_id} onChange={onChange}>
            <option value="">Yazılım firması</option>
            {vendors.map((v:any)=> <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {errors.vendor_id && <div className="text-xs text-red-600">{errors.vendor_id}</div>}
        </FormSection>
        <FormSection title="Lisans Bilgileri" cols={3}>
          <input className="input" type="date" name="activation_date" value={form.activation_date} onChange={onChange} />
          <input className="input" type="date" name="end_date" value={form.end_date} onChange={onChange} />
          <input className="input" name="device" placeholder="Kurulu cihaz" value={form.device} onChange={onChange} />
          <select className="input" name="status" value={form.status} onChange={onChange}>
            <option value="aktif">Aktif</option>
            <option value="pasif">Pasif</option>
          </select>
          <textarea className="input md:col-span-3" name="notes" placeholder="Açıklama" value={form.notes} onChange={onChange} />
        </FormSection>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/licenses">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
