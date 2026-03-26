"use client";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

function titleFor(pathname: string) {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/work-orders")) return "İş Emirleri";
  if (pathname.startsWith("/customers")) return "Müşteriler";
  if (pathname.startsWith("/lines")) return "Hatlar";
  if (pathname.startsWith("/licenses")) return "Lisanslar";
  if (pathname.startsWith("/reports")) return "Raporlar";
  if (pathname.startsWith("/notifications")) return "Bildirimler";
  if (pathname.startsWith("/users")) return "Personeller";
  if (pathname.startsWith("/operators")) return "Operatörler";
  if (pathname.startsWith("/settings")) return "Ayarlar";
  if (pathname.startsWith("/takip")) return "Takip";
  if (pathname.startsWith("/billing")) return "Faturalandırma";
  return "Microvise CRM";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = useMemo(() => titleFor(pathname || "/"), [pathname]);
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <a href="/" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
          </svg>
        </a>
        <div className="text-lg font-extrabold tracking-tight">{title}</div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/notifications"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white"
          title="Bildirimler"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 22a2 2 0 002-2H10a2 2 0 002 2zm6-6V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </a>
        <a
          href="/settings"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/15 px-4 text-sm font-bold text-white"
        >
          Hesap
        </a>
      </div>
    </header>
  );
}
