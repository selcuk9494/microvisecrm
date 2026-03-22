"use client";
import { useState } from "react";
import { formatPhoneTR, normalizePhoneTR } from "../../../lib/phone";
import FormSection from "../../../components/FormSection";
import { geocodeAddressToLatLng, geocodeLatLngToAddress } from "../../../lib/geocode";

export default function NewCustomer() {
  const [form, setForm] = useState({
    customer_name: "",
    company_name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    notes: ""
  });
  const [branches, setBranches] = useState<Array<{ name: string; address: string; lat: string; lng: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onChange(e: any) {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm({ ...form, phone: normalizePhoneTR(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
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
      if (!form.customer_name.trim()) nextErrors.customer_name = "Müşteri adı zorunlu";
      if (form.phone && form.phone.replace(/\D/g,"").length !== 10) nextErrors.phone = "Telefon 10 hane olmalı";
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = "Email geçersiz";
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        setLoading(false);
        const order = ["customer_name","phone","email"];
        const first = order.find(k => nextErrors[k]);
        if (first) {
          setTimeout(() => {
            const el = document.querySelector(`input[name="${first}"], textarea[name="${first}"], select[name="${first}"]`) as HTMLElement | null;
            el?.focus();
          }, 0);
        }
        return;
      }
      const token = localStorage.getItem("access_token") || "";
      const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(api + "/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Kayıt başarısız");
      }
      const cust = await res.json();
      const toCreate = branches.filter(b => b.name && b.name.trim());
      if (toCreate.length) {
        for (const b of toCreate) {
          await fetch(api + "/branches", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              customer_id: cust.id,
              name: b.name.trim(),
              address: b.address?.trim() || "",
              lat: b.lat ? Number(b.lat) : null,
              lng: b.lng ? Number(b.lng) : null
            })
          });
        }
      }
      window.location.href = "/customers";
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Yeni Müşteri</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        {Object.keys(errors).length > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            <div className="font-medium">Düzeltmen gereken alanlar:</div>
            <ul className="ml-4 list-disc">
              {Object.entries(errors).map(([k,v]) => <li key={k}>{v}</li>)}
            </ul>
          </div>
        )}
        <FormSection cols={3}>
          <input className="input" name="customer_name" placeholder="Müşteri adı *" value={form.customer_name} onChange={onChange} />
          {errors.customer_name && <div className="text-xs text-red-600">{errors.customer_name}</div>}
          <input className="input" name="company_name" placeholder="Firma adı" value={form.company_name} onChange={onChange} />
          <input className="input" name="tax_number" placeholder="Vergi numarası" value={form.tax_number} onChange={onChange} />
          <textarea className="input md:col-span-3" name="notes" placeholder="Notlar" value={form.notes} onChange={onChange} />
        </FormSection>
        <FormSection title="İletişim">
          <input className="input" name="phone" placeholder="(533) 850 90 90" value={formatPhoneTR(form.phone)} onChange={onChange} />
          {errors.phone && <div className="text-xs text-red-600">{errors.phone}</div>}
          <input className="input" name="email" placeholder="Email" value={form.email} onChange={onChange} />
          {errors.email && <div className="text-xs text-red-600">{errors.email}</div>}
        </FormSection>
        <FormSection title="Adres" cols={1}>
          <input className="input" name="address" placeholder="Adres" value={form.address} onChange={onChange} />
        </FormSection>
        <FormSection title="Şubeler" cols={1}>
          <div className="grid gap-2">
            {branches.map((b, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-4">
                <input className="input" placeholder="Şube adı" value={b.name} onChange={e=> setBranches(list => list.map((x,i)=> i===idx ? { ...x, name: e.target.value } : x))} />
                <input className="input" placeholder="Adres" value={b.address} onChange={e=> setBranches(list => list.map((x,i)=> i===idx ? { ...x, address: e.target.value } : x))} />
                <input className="input" placeholder="Enlem (lat)" value={b.lat} onChange={e=> setBranches(list => list.map((x,i)=> i===idx ? { ...x, lat: e.target.value } : x))} />
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Boylam (lng)" value={b.lng} onChange={e=> setBranches(list => list.map((x,i)=> i===idx ? { ...x, lng: e.target.value } : x))} />
                  <button type="button" className="btn btn-secondary" onClick={()=> setBranches(list => list.filter((_,i)=> i!==idx))}>Sil</button>
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async ()=> {
                      try {
                        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                          if (!navigator.geolocation) return reject(new Error("no_geolocation"));
                          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                        });
                        const lat = String(pos.coords.latitude);
                        const lng = String(pos.coords.longitude);
                        const addr = await geocodeLatLngToAddress(lat, lng);
                        setBranches(list => list.map((x,i)=> i===idx ? { ...x, lat, lng, address: addr || x.address } : x));
                      } catch {}
                    }}
                  >
                    Konumumu Al
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async ()=> {
                      const r = await geocodeAddressToLatLng(b.address);
                      if (r.lat && r.lng) setBranches(list => list.map((x,i)=> i===idx ? { ...x, lat: r.lat!, lng: r.lng! } : x));
                    }}
                  >
                    Adresten Lat/Lng
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={()=> setBranches(list => [...list, { name: "", address: "", lat: "", lng: "" }])}>Şube Ekle</button>
          </div>
        </FormSection>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/customers">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
