 "use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [trend, setTrend] = useState<number[]>([]);
  const [bars, setBars] = useState<{ lines: number[], licenses: number[] }>({ lines: [], licenses: [] });
  const [series, setSeries] = useState<{ months: number, lines: number[], licenses: number[], workOrders: number[] } | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const s = await apiFetch(`/admin/stats`);
        setStats(s);
        const vals = [s.customers, s.activeLines, s.linesExpiring, s.linesExpired, s.activeLicenses, s.openWorkOrders].map((v: number) => Number(v || 0));
        const max = Math.max(...vals, 1);
        const norm = vals.map((v) => Math.round((v / max) * 80) + 10);
        setTrend(norm);
        const [lx, gx] = await Promise.all([
          apiFetch(`/lines/expiring?days=30`),
          apiFetch(`/licenses/expiring?days=30`)
        ]);
        const weeks = [0, 0, 0, 0];
        const weeksLic = [0, 0, 0, 0];
        const now = new Date();
        function weekIndex(d: Date) {
          const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
          const idx = Math.max(0, Math.min(3, Math.floor(diff / 7)));
          return idx;
        }
        (lx.data || []).forEach((r: any) => { if (r.endDate) weeks[weekIndex(new Date(r.endDate))]++; });
        (gx.data || []).forEach((r: any) => { if (r.endDate) weeksLic[weekIndex(new Date(r.endDate))]++; });
        setBars({ lines: weeks, licenses: weeksLic });
        const t = await apiFetch(`/admin/trends?months=6`);
        setSeries(t);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const cards = [
    { title: "Toplam Müşteri", value: stats?.customers ?? 0 },
    { title: "Aktif Hat", value: stats?.activeLines ?? 0 },
    { title: "Yaklaşan Hatlar", value: stats?.linesExpiring ?? 0 },
    { title: "Süresi Dolmuş Hatlar", value: stats?.linesExpired ?? 0 },
    { title: "Aktif GMP3 Lisansları", value: stats?.activeLicenses ?? 0 },
    { title: "Açık İş Emirleri", value: stats?.openWorkOrders ?? 0 },
  ];
  return (
    <div className="space-y-6">
      {stats && (stats.linesExpiring > 0 || stats.linesExpired > 0) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Yaklaşan: {stats.linesExpiring} hat, Süresi dolmuş: {stats.linesExpired} hat. <a className="underline" href="/reports">Raporlar</a>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <a className="btn btn-primary" href="/work-orders/new">Yeni İş Emri</a>
        <a className="btn btn-secondary" href="/customers/new">Yeni Müşteri</a>
        <a className="btn btn-secondary" href="/lines/new">Yeni Hat</a>
        <a className="btn btn-secondary" href="/licenses/new">Yeni Lisans</a>
      </div>
      <div className="stat-grid">
        {cards.map((c, idx) => {
          const bg =
            idx === 0 ? "bg-gradient-to-br from-[#fb7185] to-[#f97316]"
            : idx === 1 ? "bg-gradient-to-br from-[#60a5fa] to-[#7c3aed]"
            : idx === 2 ? "bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]"
            : idx === 3 ? "bg-gradient-to-br from-[#fb7185] to-[#be123c]"
            : idx === 4 ? "bg-gradient-to-br from-[#34d399] to-[#059669]"
            : "bg-gradient-to-br from-[#fbbf24] to-[#f97316]";
          return (
            <a key={c.title} href={c.title === "Açık İş Emirleri" ? "/work-orders?filter[status]=acik" : "/"} className={`stat-tile ${bg}`}>
              <div className="label text-sm font-semibold">{c.title}</div>
              <div className="value">{loading ? "…" : c.value}</div>
            </a>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mb-2 text-sm text-slate-500">Yaklaşan Hatlar (4 hafta)</div>
          <div className="flex items-end gap-3">
            {bars.lines.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-10 bg-sky-500" style={{ height: `${10 + v * 8}px` }} />
                <div className="mt-1 text-xs text-slate-500">W{i + 1}</div>
                <div className="text-xs">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-2 text-sm text-slate-500">Yaklaşan Lisanslar (4 hafta)</div>
          <div className="flex items-end gap-3">
            {bars.licenses.map((v, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-10 bg-emerald-500" style={{ height: `${10 + v * 8}px` }} />
                <div className="mt-1 text-xs text-slate-500">W{i + 1}</div>
                <div className="text-xs">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {series && (
        <div className="card p-4">
          <div className="mb-2 text-sm text-slate-500">Son 6 Ay Trend (Hat/Lisans/İş Emri)</div>
          <div className="h-40 w-full">
            <svg viewBox="0 0 120 80" className="h-full w-full">
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                points={series.lines.map((v, i) => `${(i * (120 / (series.months - 1))).toFixed(2)},${(80 - (v / Math.max(1, Math.max(...series.lines, ...series.licenses, ...series.workOrders))) * 70).toFixed(2)}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                points={series.licenses.map((v, i) => `${(i * (120 / (series.months - 1))).toFixed(2)},${(80 - (v / Math.max(1, Math.max(...series.lines, ...series.licenses, ...series.workOrders))) * 70).toFixed(2)}`).join(" ")}
              />
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                points={series.workOrders.map((v, i) => `${(i * (120 / (series.months - 1))).toFixed(2)},${(80 - (v / Math.max(1, Math.max(...series.lines, ...series.licenses, ...series.workOrders))) * 70).toFixed(2)}`).join(" ")}
              />
            </svg>
            <div className="mt-2 flex gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1"><span className="inline-block h-2 w-3 bg-[#2563eb]" /> Hat</div>
              <div className="flex items-center gap-1"><span className="inline-block h-2 w-3 bg-[#059669]" /> Lisans</div>
              <div className="flex items-center gap-1"><span className="inline-block h-2 w-3 bg-[#f59e0b]" /> İş Emri</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
