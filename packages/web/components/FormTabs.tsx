"use client";
import { ReactNode } from "react";

type Tab = { key: string; label: string; icon?: ReactNode };

export default function FormTabs({ tabs, active, onChange }: { tabs: Tab[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${isActive ? "border-sky-600 bg-sky-50 text-sky-800" : "border-slate-600 bg-[#102037] text-slate-200 hover:bg-slate-700"}`}
            onClick={() => onChange(t.key)}
            type="button"
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
