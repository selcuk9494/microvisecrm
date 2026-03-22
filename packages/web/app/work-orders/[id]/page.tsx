"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function WorkOrderDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [row, setRow] = useState<any | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [wo, cs, us] = await Promise.all([
          apiFetch(`/work-orders/${id}`),
          apiFetch(`/customers?page=1&pageSize=999`),
          apiFetch(`/users`)
        ]);
        setRow(wo);
        setCustomers(cs.data || []);
        setUsers(us.data || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);
  const customerName = row ? (customers.find((c:any)=>c.id===row.customerId)?.customerName || row.customerId) : "";
  const assigneeName = row ? (users.find((u:any)=>u.id===row.assignedUserId)?.name || row.assignedUserId || "") : "";
  const mapsUrl = row
    ? ((row.locationLat && row.locationLng)
        ? `https://www.google.com/maps/dir/?api=1&destination=${row.locationLat},${row.locationLng}`
        : (row.locationAddress || row.branch?.address)
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(row.locationAddress || row.branch?.address)}`
          : "")
    : "";
  const embedUrl = row
    ? ((row.locationLat && row.locationLng)
        ? `https://www.google.com/maps?q=${row.locationLat},${row.locationLng}&z=15&output=embed`
        : (row.locationAddress || row.branch?.address)
          ? `https://www.google.com/maps?q=${encodeURIComponent(row.locationAddress || row.branch?.address)}&z=15&output=embed`
          : "")
    : "";
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">İş Emri Detayı</h1>
        <div className="flex gap-2">
          <a className="btn btn-secondary" href="/work-orders">Liste</a>
          <a className="btn btn-secondary" href={`/work-orders?page=1&q=${encodeURIComponent(row?.orderNumber||"")}`}>Listede Göster</a>
          {mapsUrl && <a className="btn btn-secondary" href={mapsUrl} target="_blank" rel="noreferrer">Yol Tarifi</a>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">{row?.orderNumber || "-"}</div>
          <div className="grid gap-2 text-sm">
            <div><span className="text-slate-500">Müşteri:</span> <a className="text-sky-700 underline" href={row ? `/customers/${row.customerId}/edit` : "#"}>{customerName}</a></div>
            <div><span className="text-slate-500">Durum:</span> {row?.status || "-"}</div>
            <div><span className="text-slate-500">Öncelik:</span> {row?.priority || "-"}</div>
            <div><span className="text-slate-500">Tip:</span> {row?.type?.name || "-"}</div>
            <div><span className="text-slate-500">Atanan:</span> {assigneeName}</div>
            <div><span className="text-slate-500">Vade:</span> {row?.dueDate ? new Date(row.dueDate).toLocaleString("tr-TR") : ""}</div>
            <div><span className="text-slate-500">Oluşturma:</span> {row?.createdAt ? new Date(row.createdAt).toLocaleString("tr-TR") : ""}</div>
            <div><span className="text-slate-500">Tamamlandı:</span> {row?.completedAt ? new Date(row.completedAt).toLocaleString("tr-TR") : ""}</div>
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Açıklama</div>
          <div className="whitespace-pre-wrap break-words text-sm">{row?.description || "-"}</div>
          {row?.notes && (
            <>
              <div className="mt-3 mb-2 text-lg font-medium">Notlar</div>
              <div className="whitespace-pre-wrap break-words text-sm">{row.notes}</div>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Ekler</div>
          <ul className="list-disc pl-4 text-sm">
            {(row?.attachments||[]).map((a:any)=>(
              <li key={a.id}>{a.fileId || a.id}</li>
            ))}
            {(row?.attachments||[]).length===0 && <li>Ek yok</li>}
          </ul>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-lg font-medium">Günlük</div>
          <ul className="list-disc pl-4 text-sm">
            {(row?.workNotes||[]).map((n:any)=>(
              <li key={n.id}>{n.createdAt ? new Date(n.createdAt).toLocaleString("tr-TR") : ""} — {n.content}</li>
            ))}
            {(row?.workNotes||[]).length===0 && <li>Kayıt yok</li>}
          </ul>
        </div>
        {embedUrl && (
          <div className="card p-4">
            <div className="mb-2 text-lg font-medium">Konum Haritası</div>
            <div className="aspect-video w-full overflow-hidden rounded">
              <iframe src={embedUrl} className="h-full w-full" loading="lazy"></iframe>
            </div>
          </div>
        )}
      </div>
      {loading && <div className="mt-3 text-sm text-slate-600">Yükleniyor...</div>}
    </div>
  );
}
