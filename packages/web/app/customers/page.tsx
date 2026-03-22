"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPhoneTR, normalizePhoneTR } from "../../lib/phone";
import MapPicker from "../../components/MapPicker";
import { geocodeAddressToLatLng } from "../../lib/geocode";

export default function Customers() {
  const [q, setQ] = useState("");
  const [fName, setFName] = useState("");
  const [fCompany, setFCompany] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favName, setFavName] = useState("");
  const [favorites, setFavorites] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name: "",
    company_name: "",
    phone: "",
    email: "",
    address: "",
    tax_number: "",
    notes: ""
  });
  const [editBranches, setEditBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [branchAddress, setBranchAddress] = useState<string>("");
  const [branchLat, setBranchLat] = useState<string>("");
  const [branchLng, setBranchLng] = useState<string>("");
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>("");
  const [newBranchAddress, setNewBranchAddress] = useState<string>("");
  const [newBranchLat, setNewBranchLat] = useState<string>("");
  const [newBranchLng, setNewBranchLng] = useState<string>("");
  const toast = useToast();
  async function load() {
    setLoading(true);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (fName) params.set("filter[customer_name]", fName);
      if (fCompany) params.set("filter[company_name]", fCompany);
      if (fEmail) params.set("filter[email]", fEmail);
      if (fPhone) params.set("filter[phone]", fPhone);
      if (showDeleted) params.set("include_deleted", "1");
      if (sortKey) params.set("sort_by", sortKey);
      if (sortDir) params.set("sort_dir", sortDir);
      const data = await apiFetch(`/customers?${params.toString()}`);
      setRows(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [page, showDeleted]);
  useEffect(() => {
    const p = Number(searchParams.get("page") || 1);
    const qq = searchParams.get("q") || "";
    const n = searchParams.get("filter[customer_name]") || "";
    const cn = searchParams.get("filter[company_name]") || "";
    const em = searchParams.get("filter[email]") || "";
    const ph = searchParams.get("filter[phone]") || "";
    const inc = searchParams.get("include_deleted") === "1";
    const sk = searchParams.get("sort_by") || "";
    const sd = (searchParams.get("sort_dir") as "asc" | "desc") || "asc";
    setPage(p);
    setQ(qq);
    setFName(n);
    setFCompany(cn);
    setFEmail(em);
    setFPhone(ph);
    setShowDeleted(inc);
    setSortKey(sk);
    setSortDir(sd);
    apiFetch(`/favorites?pageKey=customers`).then(d => setFavorites(d.data || [])).catch(() => {});
  }, []);
  function replaceUrl(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    if (q) params.set("q", q);
    if (fName) params.set("filter[customer_name]", fName);
    if (fCompany) params.set("filter[company_name]", fCompany);
    if (fEmail) params.set("filter[email]", fEmail);
    if (fPhone) params.set("filter[phone]", fPhone);
    if (showDeleted) params.set("include_deleted", "1");
    if (sortKey) params.set("sort_by", sortKey);
    if (sortDir) params.set("sort_dir", sortDir);
    router.replace(`/customers?${params.toString()}`);
  }
  function applyFilters() {
    setPage(1);
    replaceUrl(1);
    load();
  }
  function onSort(key: string) {
    const dir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(dir);
    setTimeout(() => applyFilters(), 0);
  }
  async function saveFavorite() {
    if (!favName.trim()) return;
    await apiFetch(`/favorites`, {
      method: "POST",
      body: JSON.stringify({
        pageKey: "customers",
        name: favName.trim(),
        params: { q, fName, fCompany, fEmail, fPhone, showDeleted, sortKey, sortDir }
      })
    });
    const d = await apiFetch(`/favorites?pageKey=customers`);
    setFavorites(d.data || []);
  }
  async function applyFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    setQ(f.params.q || "");
    setFName(f.params.fName || "");
    setFCompany(f.params.fCompany || "");
    setFEmail(f.params.fEmail || "");
    setFPhone(f.params.fPhone || "");
    setShowDeleted(!!f.params.showDeleted);
    setSortKey(f.params.sortKey || "");
    setSortDir(f.params.sortDir || "asc");
    setTimeout(() => applyFilters(), 0);
  }
  async function deleteFavorite(name: string) {
    const f = favorites.find((x: any) => x.name === name);
    if (!f) return;
    await apiFetch(`/favorites/${f.id}`, { method: "DELETE" });
    const d = await apiFetch(`/favorites?pageKey=customers`);
    setFavorites(d.data || []);
  }

  async function openEdit(id: string) {
    setEditingId(id);
    setSaving(false);
    try {
      const data = await apiFetch(`/customers/${id}`);
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
        const br = await apiFetch(`/customers/${id}/branches`);
        setEditBranches(br.data || []);
        if ((br.data || []).length > 0) {
          const b = br.data[0];
          setSelectedBranchId(b.id);
          setBranchName(b.name || "");
          setBranchAddress(b.address || "");
          setBranchLat(b.lat ? String(b.lat) : "");
          setBranchLng(b.lng ? String(b.lng) : "");
        } else {
          setSelectedBranchId("");
          setBranchName("");
          setBranchAddress("");
          setBranchLat("");
          setBranchLng("");
        }
      } catch {}
    } catch {
      toast.push({ id: Date.now(), text: "Kayıt getirilemedi", type: "error" });
      setEditingId(null);
    }
  }

  function onChange(e: any) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name==="phone" ? normalizePhoneTR(value) : value }));
  }

  async function onSubmit(e: any) {
    e.preventDefault();
    if (!editingId) return;
    if (!form.customer_name || !form.customer_name.trim()) {
      toast.push({ id: Date.now(), text: "Müşteri adı zorunlu", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/customers/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_name: form.customer_name,
          company_name: form.company_name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          tax_number: form.tax_number,
          notes: form.notes
        })
      });
      setEditingId(null);
      await load();
      toast.push({ id: Date.now(), text: "Müşteri güncellendi", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Güncelleme başarısız", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!toDelete) return;
    setLoading(true);
    try {
      await apiFetch(`/customers/${toDelete}`, { method: "DELETE" });
      setToDelete(null);
      await load();
      toast.push({ id: Date.now(), text: "Müşteri silindi", type: "success" });
    } catch (e: any) {
      toast.push({ id: Date.now(), text: "Silme başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function onRestore(id: string) {
    setLoading(true);
    try {
      await apiFetch(`/customers/${id}/restore`, { method: "PATCH" });
      await load();
      toast.push({ id: Date.now(), text: "Müşteri geri alındı", type: "success" });
    } catch {
      toast.push({ id: Date.now(), text: "Geri alma başarısız", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Müşteriler</h1>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => {
              const lines = [
                ["Müşteri", "Firma", "Telefon", "Email"],
                ...rows.map((r) => [r.customerName || "", r.companyName || "", formatPhoneTR(r.phone || ""), r.email || ""]),
              ]
                .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "customers.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            CSV Dışa Aktar
          </button>
          <a href="/customers/new" className="btn btn-primary">Yeni Müşteri</a>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 items-end gap-2 md:grid-cols-6">
        <div className="md:col-span-2">
          <input className="input w-full" placeholder="Serbest arama" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div>
          <input className="input w-full" placeholder="Müşteri adı" value={fName} onChange={e => setFName(e.target.value)} />
        </div>
        <div>
          <input className="input w-full" placeholder="Firma" value={fCompany} onChange={e => setFCompany(e.target.value)} />
        </div>
        <div>
          <input className="input w-full" placeholder="Email" value={fEmail} onChange={e => setFEmail(e.target.value)} />
        </div>
        <div>
          <input className="input w-full" placeholder="(533) 850 90 90" value={formatPhoneTR(fPhone)} onChange={e => setFPhone(normalizePhoneTR(e.target.value))} />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={applyFilters} disabled={loading}>{loading ? "Aranıyor..." : "Ara"}</button>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
            Silinmişleri göster
          </label>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2">
        <input className="input max-w-xs" placeholder="Favori adı" value={favName} onChange={e => setFavName(e.target.value)} />
        <button className="btn btn-secondary" onClick={saveFavorite}>Favoriyi Kaydet</button>
        <select className="input max-w-xs" onChange={e => applyFavorite(e.target.value)} value="">
          <option value="" disabled>Favori seç</option>
          {favorites.map((f: any) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => { if (favName) deleteFavorite(favName); }}>Favoriyi Sil</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("customerName")}>Müşteri {sortKey==="customerName" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("companyName")}>Firma {sortKey==="companyName" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("phone")}>Telefon {sortKey==="phone" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2 cursor-pointer" onClick={() => onSort("email")}>Email {sortKey==="email" ? (sortDir==="asc"?"▲":"▼") : ""}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={`border-t ${c.deletedAt ? "text-slate-400 line-through opacity-70" : ""}`}>
                <td className="px-3 py-2">{c.customerName}</td>
                <td className="px-3 py-2">{c.companyName}</td>
                <td className="px-3 py-2">{formatPhoneTR(c.phone || "")}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    {!c.deletedAt ? (
                      <>
                        <button className="btn btn-secondary" onClick={() => openEdit(c.id)}>Düzenle</button>
                        <button className="btn btn-secondary" onClick={() => setToDelete(c.id)}>Sil</button>
                      </>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => onRestore(c.id)}>Geri Al</button>
                    )}
                  </div>
                </td>
              </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Kayıt bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-600">Toplam {total}</div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { const np = Math.max(1, page - 1); setPage(np); replaceUrl(np); }} disabled={page === 1}>Önceki</button>
          <div className="rounded-md border px-3 py-2 text-sm">{page}</div>
          <button className="btn btn-secondary" onClick={() => { const np = page + 1; setPage(np); replaceUrl(np); }} disabled={page * pageSize >= total}>Sonraki</button>
        </div>
      </div>
      <Modal open={!!toDelete} title="Silme Onayı" onClose={() => setToDelete(null)}>
        <div className="mb-4">Bu müşteriyi silmek istiyor musun?</div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={() => setToDelete(null)}>Vazgeç</button>
          <button className="btn btn-primary" onClick={onConfirmDelete}>Sil</button>
        </div>
      </Modal>
      <Modal open={!!editingId} title="Müşteri Düzenle" onClose={() => setEditingId(null)} size="xxl">
        <form onSubmit={onSubmit} className="grid gap-3">
          <input className="input" name="customer_name" placeholder="Müşteri adı" value={form.customer_name} onChange={onChange} />
          <input className="input" name="company_name" placeholder="Firma adı" value={form.company_name} onChange={onChange} />
          <input className="input" name="phone" placeholder="(533) 850 90 90" value={formatPhoneTR(form.phone)} onChange={onChange} />
          <input className="input" name="email" placeholder="Email" value={form.email} onChange={onChange} />
          <input className="input" name="address" placeholder="Adres" value={form.address} onChange={onChange} />
          <input className="input" name="tax_number" placeholder="Vergi numarası" value={form.tax_number} onChange={onChange} />
          <textarea className="input" name="notes" placeholder="Notlar" value={form.notes} onChange={onChange} />
          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-medium">Şube ve Konum</div>
            <div className="grid gap-2 md:grid-cols-5">
              <select className="input md:col-span-2" value={selectedBranchId} onChange={e=> {
                const val = e.target.value;
                setSelectedBranchId(val);
                const b = editBranches.find((x:any)=>x.id===val);
                if (b) {
                  setBranchName(b.name || "");
                  setBranchAddress(b.address || "");
                  setBranchLat(b.lat ? String(b.lat) : "");
                  setBranchLng(b.lng ? String(b.lng) : "");
                }
              }}>
                <option value="">Şube seç</option>
                {editBranches.map((b:any)=> <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input className="input md:col-span-3" placeholder="Şube adı" value={branchName} onChange={e=> setBranchName(e.target.value)} />
              <input className="input md:col-span-3" placeholder="Adres" value={branchAddress} onChange={e=> setBranchAddress(e.target.value)} />
              <input className="input" placeholder="Lat" value={branchLat} onChange={e=> setBranchLat(e.target.value)} />
              <input className="input" placeholder="Lng" value={branchLng} onChange={e=> setBranchLng(e.target.value)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async ()=> {
                  if (!branchAddress.trim()) return;
                  const r = await geocodeAddressToLatLng(branchAddress);
                  setBranchLat(r.lat || branchLat);
                  setBranchLng(r.lng || branchLng);
                }}
              >
                Adresten Lat/Lng
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={()=> setShowMapPicker(s=> !s)}
              >
                Harita ile Seç
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async ()=> {
                  if (!selectedBranchId) return;
                  await apiFetch(`/branches/${selectedBranchId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                      name: branchName,
                      address: branchAddress,
                      lat: branchLat ? Number(branchLat) : null,
                      lng: branchLng ? Number(branchLng) : null
                    })
                  });
                  const br = await apiFetch(`/customers/${editingId}/branches`);
                  setEditBranches(br.data || []);
                  toast.push({ id: Date.now(), text: "Şube güncellendi", type: "success" });
                }}
              >
                Şubeyi Güncelle
              </button>
            </div>
            {showMapPicker && (
              <div className="mt-2">
                <MapPicker
                  lat={branchLat}
                  lng={branchLng}
                  onChange={(lat: string, lng: string) => { setBranchLat(lat); setBranchLng(lng); }}
                />
              </div>
            )}
            <div className="mt-3 grid gap-2 md:grid-cols-5">
              <input className="input md:col-span-2" placeholder="Yeni şube adı" value={newBranchName} onChange={e=> setNewBranchName(e.target.value)} />
              <input className="input md:col-span-3" placeholder="Yeni şube adresi" value={newBranchAddress} onChange={e=> setNewBranchAddress(e.target.value)} />
              <input className="input" placeholder="Lat" value={newBranchLat} onChange={e=> setNewBranchLat(e.target.value)} />
              <input className="input" placeholder="Lng" value={newBranchLng} onChange={e=> setNewBranchLng(e.target.value)} />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async ()=> {
                  if (!newBranchName.trim()) return;
                  await apiFetch(`/branches`, {
                    method: "POST",
                    body: JSON.stringify({
                      customer_id: editingId,
                      name: newBranchName.trim(),
                      address: newBranchAddress?.trim() || "",
                      lat: newBranchLat ? Number(newBranchLat) : null,
                      lng: newBranchLng ? Number(newBranchLng) : null
                    })
                  });
                  const br = await apiFetch(`/customers/${editingId}/branches`);
                  setEditBranches(br.data || []);
                  setNewBranchName(""); setNewBranchAddress(""); setNewBranchLat(""); setNewBranchLng("");
                  toast.push({ id: Date.now(), text: "Şube eklendi", type: "success" });
                }}
              >
                Yeni Şube Ekle
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Vazgeç</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
