"use client";
import { useEffect, useState } from "react";
import { apiBase } from "../../../lib/api";
import FormSection from "../../../components/FormSection";
import { formatPhoneTR, normalizePhoneTR } from "../../../lib/phone";

export default function EditLine({ params }: { params: { id: string } }) {
  const id = params.id;
  const [customers, setCustomers] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    customer_id: "",
    line_number: "",
    imei_number: "",
    operator_id: "",
    activation_date: "",
    end_date: "",
    status: "aktif",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    const api = apiBase();
    Promise.all([
      fetch(api + "/customers?page=1&pageSize=999", { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
      fetch(api + "/operators", { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()),
      fetch(api + "/lines/" + id, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json())
    ]).then(([cs, ops, ln]) => {
      setCustomers(cs.data || []);
      setOperators(ops.data || []);
      setForm({
        customer_id: ln.customerId || "",
        line_number: ln.lineNumber || "",
        imei_number: ln.imeiNumber || "",
        operator_id: ln.operatorId || "",
        activation_date: ln.activationDate ? new Date(ln.activationDate).toISOString().slice(0,10) : "",
        end_date: ln.endDate ? new Date(ln.endDate).toISOString().slice(0,10) : "",
        status: ln.status || "aktif",
        description: ln.description || ""
      });
    }).catch(()=> setError("Kayıt bulunamadı"));
  }, [id]);

  function onChange(e: any) {
    const { name, value } = e.target;
    setForm((f:any)=> ({ ...f, [name]: value }));
    setErrors((errs)=> {
      const n = { ...errs };
      delete n[name];
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
      if (!form.line_number || String(form.line_number).replace(/\D/g,"").length !== 10) nextErrors.line_number = "Hat numarası 10 hane olmalı";
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); setLoading(false); return; }
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(apiBase() + "/lines/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Güncelleme başarısız");
      }
      window.location.href = "/takip";
    } catch (err: any) {
      setError(err.message || "Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Hat Düzenle</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <FormSection cols={1}>
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          {errors.customer_id && <div className="text-xs text-red-600">{errors.customer_id}</div>}
        </FormSection>
        <FormSection title="Hat Bilgileri" cols={3}>
          <input className="input" type="text" name="line_number" placeholder="(533) 850 90 90" value={formatPhoneTR(form.line_number)} onChange={e=> setForm((f:any)=> ({ ...f, line_number: normalizePhoneTR(e.target.value) }))} />
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
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/takip">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
