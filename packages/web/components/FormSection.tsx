"use client";
import { ReactNode } from "react";

export default function FormSection({ title, children, cols = 2 }: { title?: string; children: ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div className="card p-4">
      {title && <div className="mb-3 text-lg font-medium">{title}</div>}
      <div className={`grid gap-3 ${cols===1 ? "grid-cols-1" : cols===2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {children}
      </div>
    </div>
  );
}
