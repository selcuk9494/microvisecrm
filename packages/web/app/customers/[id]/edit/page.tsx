"use client";
import { useEffect, useState } from "react";
import { formatPhoneTR, normalizePhoneTR } from "../../../../lib/phone";
import FormSection from "../../../../components/FormSection";
import { geocodeAddressToLatLng, geocodeLatLngToAddress } from "../../../../lib/geocode";

export default function EditCustomer({ params }: { params: { id: string } }) {
  const [form, setForm] = useState({
    customer_name: "",
    company_name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    notes: ""
  });
  const [branches, setBranches] = useState<any[]>([]);
  const [newBranch, setNewBranch] = useState({ name: "", address: "", lat: "", lng: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const id = params.id;

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/customers/" + id, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForm({
          customer_name: data.customerName || "",
          company_name: data.companyName || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          tax_number: data.taxNumber || "",
          notes: data.notes || ""
        });
        try {
          const br = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/customers/${id}/branches`, { headers: { Authorization: `Bearer ${token}` } });
          const bd = await br.json();
          setBranches(bd.data || []);
        } catch {}
      }
    };
    run();
  }, [id]);

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
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); setLoading(false); return; }
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/customers/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Güncelleme başarısız");
      }
      window.location.href = "/customers";
    } catch (err: any) {
      setError(err.message || "Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Müşteri Düzenle</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
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
              {branches.map((b:any)=> (
                <div key={b.id}>
                  <div className="grid gap-2 md:grid-cols-5">
                  <input className="input" defaultValue={b.name} onBlur={async (e)=> {
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ name: e.target.value })
                    });
                  }} />
                  <input className="input" defaultValue={b.address || ""} onBlur={async (e)=> {
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ address: e.target.value })
                    });
                  }} />
                  <input className="input" defaultValue={b.lat ?? ""} onBlur={async (e)=> {
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ lat: e.target.value ? Number(e.target.value) : null })
                    });
                  }} />
                  <input className="input" defaultValue={b.lng ?? ""} onBlur={async (e)=> {
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ lng: e.target.value ? Number(e.target.value) : null })
                    });
                  }} />
                  <button type="button" className="btn btn-secondary" onClick={async ()=> {
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const br = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/customers/${id}/branches`, { headers: { Authorization: `Bearer ${token}` } });
                    const bd = await br.json();
                    setBranches(bd.data || []);
                  }}>Sil</button>
                  </div>
              <div className="md:col-span-5 flex gap-2">
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
                      const token = localStorage.getItem("access_token") || "";
                      await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ lat: Number(lat), lng: Number(lng), address: addr || b.address })
                      });
                      const br = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/customers/${id}/branches`, { headers: { Authorization: `Bearer ${token}` } });
                      const bd = await br.json();
                      setBranches(bd.data || []);
                    } catch {}
                  }}
                >
                  Konumumu Al
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async ()=> {
                    const r = await geocodeAddressToLatLng(b.address || "");
                    if (!r.lat || !r.lng) return;
                    const token = localStorage.getItem("access_token") || "";
                    await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches/${b.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ lat: Number(r.lat), lng: Number(r.lng) })
                    });
                    const br = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/customers/${id}/branches`, { headers: { Authorization: `Bearer ${token}` } });
                    const bd = await br.json();
                    setBranches(bd.data || []);
                  }}
                >
                  Adresten Lat/Lng
                </button>
              </div>
              </div>
              ))}
              <div className="grid gap-2 md:grid-cols-5">
                <input className="input" placeholder="Şube adı" value={newBranch.name} onChange={e=> setNewBranch(nb=> ({ ...nb, name: e.target.value }))} />
                <input className="input" placeholder="Adres" value={newBranch.address} onChange={e=> setNewBranch(nb=> ({ ...nb, address: e.target.value }))} />
                <input className="input" placeholder="Enlem (lat)" value={newBranch.lat} onChange={e=> setNewBranch(nb=> ({ ...nb, lat: e.target.value }))} />
                <input className="input" placeholder="Boylam (lng)" value={newBranch.lng} onChange={e=> setNewBranch(nb=> ({ ...nb, lng: e.target.value }))} />
                <button type="button" className="btn btn-secondary" onClick={async ()=> {
                  if (!newBranch.name.trim()) return;
                  const token = localStorage.getItem("access_token") || "";
                  await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/branches`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      customer_id: id,
                      name: newBranch.name.trim(),
                      address: newBranch.address?.trim() || "",
                      lat: newBranch.lat ? Number(newBranch.lat) : null,
                      lng: newBranch.lng ? Number(newBranch.lng) : null
                    })
                  });
                  setNewBranch({ name: "", address: "", lat: "", lng: "" });
                  const br = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + `/customers/${id}/branches`, { headers: { Authorization: `Bearer ${token}` } });
                  const bd = await br.json();
                  setBranches(bd.data || []);
                }}>Ekle</button>
              </div>
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
