"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function Operators() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch(`/operators`);
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Operatörler</h1>
        <a href="/operators/new" className="btn btn-primary">Yeni Operatör</a>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Kod</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2">{o.name}</td>
                <td className="px-3 py-2">{o.code}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={2} className="px-3 py-6 text-center text-slate-500">Kayıt bulunamadı</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
