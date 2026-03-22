"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function Icon({ name }: { name: string }) {
  const cls = "mr-2 inline-block h-4 w-4 align-middle";
  if (name === "home") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 3 10v11h6v-7h6v7h6V10z"/></svg>;
  if (name === "box") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm8-1.5L6.5 8 12 10.5 17.5 8 12 5.5z"/></svg>;
  if (name === "truck") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h11v9H3V5zm12 4h3l3 3v2h-6V9zM6 17a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z"/></svg>;
  if (name === "users") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M16 11a4 4 0 10-4-4 4 4 0 004 4zm-9 2a3 3 0 013-3h4a3 3 0 013 3v4H7z"/></svg>;
  if (name === "gear") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 8a4 4 0 110 8 4 4 0 010-8zm8.94 4a8.94 8.94 0 00-.46-2l2-1.6-2-3.46-2.4 1a9.3 9.3 0 00-2-1.17L15.6 1h-3.2L11 3.77a9.3 9.3 0 00-2 1.17l-2.4-1L4.6 7.4l2 1.6a8.94 8.94 0 000 4l-2 1.6 2 3.46 2.4-1a9.3 9.3 0 002 1.17L12.4 23h3.2l.8-2.77a9.3 9.3 0 002-1.17l2.4 1 2-3.46-2-1.6a8.94 8.94 0 00.06-2z"/></svg>;
  if (name === "chart") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M4 20h16v-2H4v2zm2-4h3V8H6v8zm5 0h3V4h-3v12zm5 0h3V12h-3v4z"/></svg>;
  if (name === "bell") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>;
  if (name === "login") return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M10 17l5-5-5-5v3H3v4h7v3zm9-12h-6v2h6v12h-6v2h8V5h-2z"/></svg>;
  return <span className={cls} />;
}

type Group = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  admin?: boolean;
  children?: Array<{ href: string; label: string; admin?: boolean }>;
};

const groups: Group[] = [
  { key: "home", label: "Giriş", href: "/", icon: "home" },
  { key: "customers", label: "Müşteriler", href: "/customers", icon: "users" },
  { key: "takip", label: "Takip", href: "/takip", icon: "box" },
  {
    key: "work",
    label: "İş Emirleri",
    href: "/work-orders",
    icon: "truck",
    children: [
      { href: "/work-orders", label: "Tümü" },
      { href: "/work-orders?filter[status]=acik", label: "Açık" },
      { href: "/work-orders?filter[status]=devam", label: "Devam" },
      { href: "/work-orders?filter[status]=kapali", label: "Kapalı" },
      { href: `/work-orders?filter[due_from]=${new Date().toISOString().slice(0,10)}&filter[due_to]=${new Date().toISOString().slice(0,10)}`, label: "Bugün (vade)" },
      { href: "/work-orders?filter[overdue]=1", label: "Geciken" },
      { href: (() => { const d=new Date(); const from=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1); const to=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7); const f=from.toISOString().slice(0,10); const t=to.toISOString().slice(0,10); return `/work-orders?filter[due_from]=${f}&filter[due_to]=${t}`; })(), label: "Yaklaşan 7g" },
    ],
  },
  { key: "device", label: "Cihaz Sipariş", href: "/cihaz-siparis", icon: "box" },
  { key: "users", label: "Personeller", href: "/users", icon: "users", admin: true },
  { key: "operators", label: "Operatörler", href: "/operators", icon: "users", admin: true },
  {
    key: "reports",
    label: "Raporlar",
    href: "/reports",
    icon: "chart",
    children: [
      { href: "/reports", label: "Genel" },
      { href: "/reports/payments", label: "Tahsilatlar" },
      { href: "/reports/audit", label: "Kayıt Güncellemeleri" },
      { href: "/reports/lines-csv", label: "Hat CSV" },
      { href: "/reports/licenses-csv", label: "Lisans CSV" },
      { href: "/reports/overdue", label: "Gecikenler" },
      { href: "/reports/branches", label: "Şube Raporu" },
    ],
  },
  { key: "notifications", label: "Bildirimler", href: "/notifications", icon: "bell" },
  { key: "settings", label: "Ayarlar", href: "/settings", icon: "gear", admin: true },
  { key: "login", label: "Giriş", href: "/login", icon: "login" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("personel");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("access_token") || "";
        const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const r = await fetch(api + "/auth/me", { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const d = await r.json();
          setRole(d.role || "personel");
        }
      } catch {}
    };
    run();
  }, []);
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      const act = pathname === g.href || (!!g.href && pathname.startsWith(g.href)) || (g.children || []).some(c => pathname.startsWith(c.href));
      next[g.key] = act;
    }
    setOpen(next);
    try { localStorage.setItem("sidebar_open", JSON.stringify(next)); } catch {}
  }, [pathname]);
  useEffect(() => {
    try {
      const v = localStorage.getItem("sidebar_collapsed");
      setCollapsed(v === "1");
      const st = localStorage.getItem("sidebar_open");
      if (st) {
        const obj = JSON.parse(st);
        if (obj && typeof obj === "object") setOpen(obj);
      }
    } catch {}
  }, []);
  function toggleCollapsed() {
    setCollapsed(c => {
      try { localStorage.setItem("sidebar_collapsed", c ? "0" : "1"); } catch {}
      return !c;
    });
  }
  function toggleGroup(key: string) {
    setOpen(o => {
      const n = { ...o, [key]: !o[key] };
      try { localStorage.setItem("sidebar_open", JSON.stringify(n)); } catch {}
      return n;
    });
  }
  return (
    <aside className={`${collapsed ? "w-16" : "w-64"} bg-[#162a45] text-white transition-all`}>
      <div className="flex items-center justify-between px-4 py-4">
        <div className={`${collapsed ? "text-base" : "text-lg"} font-bold`}>{collapsed ? "MV" : "Microvise CRM"}</div>
        <button className="rounded-md px-2 py-1 text-slate-200 hover:bg-slate-700" onClick={toggleCollapsed}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <nav className="grid gap-2 px-2 relative">
        {groups.filter(g => role === "admin" || !g.admin).map((g) => {
          const active = pathname === g.href || (!!g.href && pathname.startsWith(g.href));
          const hasChildren = (g.children || []).length > 0;
          return (
            <div
              key={g.key}
              className={`relative rounded-md ${active ? "border-l-4 border-sky-500" : ""}`}
              onMouseEnter={() => setHoverKey(g.key)}
              onMouseLeave={() => setHoverKey(k => (k === g.key ? null : k))}
            >
              <a
                href={g.href}
                onClick={(e) => { if (hasChildren) { e.preventDefault(); toggleGroup(g.key); } }}
                className={`flex items-center justify-between rounded-md px-3 py-2 ${active ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
                title={collapsed ? g.label : undefined}
              >
                <span className="flex items-center">
                  <Icon name={g.icon || ""} />
                  {!collapsed && <span>{g.label}</span>}
                </span>
                {hasChildren && !collapsed && (
                  <svg className={`h-4 w-4 transition-transform ${open[g.key] ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5H7z"/>
                  </svg>
                )}
              </a>
              {hasChildren && open[g.key] && !collapsed && (
                <div className="ml-1 mt-1 rounded-md border border-slate-600 bg-[#102037]">
                  <div className="my-2 h-px w-full bg-slate-600"></div>
                  <div className="grid gap-1 px-2 py-1">
                    {(g.children || []).map((c) => {
                      const cActive = pathname === c.href || pathname.startsWith(c.href);
                      return (
                        <a
                          key={c.href}
                          href={c.href}
                          className={`block rounded-md px-3 py-2 ${cActive ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
                        >
                          {c.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {hasChildren && collapsed && hoverKey === g.key && (
                <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-md border border-slate-600 bg-[#102037] shadow-lg">
                  <div className="my-2 h-px w-full bg-slate-600"></div>
                  <div className="grid gap-1 px-2 py-1">
                    {(g.children || []).map((c) => {
                      const cActive = pathname === c.href || pathname.startsWith(c.href);
                      return (
                        <a
                          key={c.href}
                          href={c.href}
                          className={`block rounded-md px-3 py-2 ${cActive ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-700 hover:text-white"}`}
                        >
                          {c.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
