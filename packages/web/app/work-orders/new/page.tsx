"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { geocodeAddressToLatLng } from "../../../lib/geocode";
import FormSection from "../../../components/FormSection";

export default function NewWorkOrder() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({
    order_number: "",
    customer_id: "",
    branch_id: "",
    description: "",
    assigned_user_id: "",
    type_id: "",
    priority: "orta",
    notes: "",
    location_address: "",
    location_lat: "",
    location_lng: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string,string>>({});

  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(api + "/customers?page=1&pageSize=999", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCustomers(d.data || []));
    fetch(api + "/users", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUsers(d.data || []));
    fetch(api + "/work-order-types", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setTypes(d.data || []));
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (form.customer_id) {
      fetch(api + "/customers/" + form.customer_id + "/branches", { headers: { Authorization: `Bearer ${token}` } })
        .then(r=>r.json()).then(d=> setBranches(d.data || []));
    } else {
      setBranches([]);
    }
  }, [form.customer_id]);

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
      if (!form.description || !form.description.trim()) nextErrors.description = "Açıklama zorunlu";
      if (form.location_lat && isNaN(Number(form.location_lat))) nextErrors.location_lat = "Lat sayı olmalı";
      if (form.location_lng && isNaN(Number(form.location_lng))) nextErrors.location_lng = "Lng sayı olmalı";
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); setLoading(false); return; }
      await apiFetch(`/work-orders`, { method: "POST", body: JSON.stringify({
        order_number: form.order_number,
        customer_id: form.customer_id,
        branch_id: form.branch_id || undefined,
        description: form.description,
        assigned_user_id: form.assigned_user_id,
        type_id: form.type_id,
        priority: form.priority,
        notes: form.notes,
        location_address: form.location_address || undefined,
        location_lat: form.location_lat ? Number(form.location_lat) : undefined,
        location_lng: form.location_lng ? Number(form.location_lng) : undefined
      }) });
      window.location.href = "/work-orders";
    } catch (err: any) {
      let msg = err.message || "Kayıt başarısız";
      try {
        const j = JSON.parse(msg);
        if (j.error === "order_number_in_use") {
          setForm(f => ({ ...f, order_number: j.next || f.order_number }));
          msg = `İş emri numarası kullanımda. Önerilen numara: ${j.next}`;
        }
      } catch {}
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold">Yeni İş Emri</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <FormSection cols={2}>
          <div className="flex gap-2 md:col-span-2">
            <input className="input flex-1" name="order_number" placeholder="İş emri numarası" value={form.order_number} onChange={onChange} />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const d = await apiFetch(`/work-orders/next-number`);
                  setForm(f => ({ ...f, order_number: d.next || f.order_number }));
                } catch {}
              }}
            >
              Otomatik Numara
            </button>
          </div>
          <select className="input" name="customer_id" value={form.customer_id} onChange={onChange}>
            <option value="">Müşteri</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.customerName}</option>)}
          </select>
          {errors.customer_id && <div className="text-xs text-red-600">{errors.customer_id}</div>}
          <select className="input" name="branch_id" value={form.branch_id} onChange={(e)=> {
            const val = e.target.value;
            const b = branches.find((x:any)=>x.id===val);
            setForm((f)=> ({ ...f, branch_id: val, location_address: b?.address || f.location_address, location_lat: b?.lat ? String(b.lat) : f.location_lat, location_lng: b?.lng ? String(b.lng) : f.location_lng }));
          }}>
            <option value="">Şube (opsiyonel)</option>
            {branches.map((b:any)=> <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormSection>
        <FormSection title="İş Emri Detayı" cols={3}>
          <textarea className="input md:col-span-3" name="description" placeholder="İş açıklaması" value={form.description} onChange={onChange} />
          {errors.description && <div className="text-xs text-red-600">{errors.description}</div>}
          <select className="input" name="type_id" value={form.type_id} onChange={onChange}>
            <option value="">İş emri tipi</option>
            {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="input" name="assigned_user_id" value={form.assigned_user_id} onChange={onChange}>
            <option value="">Atanan personel</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select className="input" name="priority" value={form.priority} onChange={onChange}>
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
          </select>
          <textarea className="input md:col-span-3" name="notes" placeholder="Notlar" value={form.notes} onChange={onChange} />
        </FormSection>
        <FormSection title="Konum" cols={3}>
          <input className="input md:col-span-3" name="location_address" placeholder="Konum adresi" value={form.location_address} onChange={onChange} />
          <div className="flex gap-2">
            <input className="input flex-1" name="location_lat" placeholder="Enlem (lat)" value={form.location_lat} onChange={onChange} />
            {errors.location_lat && <div className="text-xs text-red-600">{errors.location_lat}</div>}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async ()=> {
                const r = await geocodeAddressToLatLng(form.location_address);
                setForm(f=> ({ ...f, location_lat: r.lat || f.location_lat, location_lng: r.lng || f.location_lng }));
              }}
            >
              Adresten Lat/Lng
            </button>
          </div>
          <input className="input" name="location_lng" placeholder="Boylam (lng)" value={form.location_lng} onChange={onChange} />
          {errors.location_lng && <div className="text-xs text-red-600">{errors.location_lng}</div>}
          <div className="flex gap-2 md:col-span-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async ()=> {
                if (!form.customer_id) return;
                try {
                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    if (!navigator.geolocation) return reject(new Error("no_geolocation"));
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                  });
                  const lat = String(pos.coords.latitude);
                  const lng = String(pos.coords.longitude);
                  setForm(f=> ({ ...f, location_lat: lat, location_lng: lng }));
                  const addrRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`, { headers: { "Accept-Language": "tr" } });
                  if (addrRes.ok) {
                    const j = await addrRes.json();
                    const disp = j?.display_name || "";
                    setForm(f=> ({ ...f, location_address: disp || f.location_address }));
                  }
                } catch {}
              }}
            >
              Konumumu Al
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async ()=> {
                if (!form.customer_id || !form.location_lat || !form.location_lng) return;
                try {
                  const d = await apiFetch(`/branches/nearest?customer_id=${encodeURIComponent(form.customer_id)}&lat=${encodeURIComponent(form.location_lat)}&lng=${encodeURIComponent(form.location_lng)}`);
                  if (d?.data?.id) {
                    setForm(f=> ({ ...f, branch_id: d.data.id, location_address: d.data.address || f.location_address }));
                  }
                } catch {}
              }}
            >
              Konumdan Şube Öner
            </button>
            {form.location_lat && form.location_lng && (
              <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${form.location_lat},${form.location_lng}`}>Yol Tarifi</a>
            )}
          </div>
        </FormSection>
        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : "Kaydet"}</button>
          <a className="btn btn-secondary" href="/work-orders">Vazgeç</a>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </div>
  );
}
