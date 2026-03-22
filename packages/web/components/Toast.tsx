"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastItem = { id: number; text: string; type?: "success" | "error" };

const ToastCtx = createContext<{ push: (t: ToastItem) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: ToastItem) => {
    setItems((prev) => [...prev, t]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== t.id));
    }, 3000);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 grid gap-2">
        {items.map((i) => (
          <div key={i.id} className={`pointer-events-auto rounded-md px-4 py-2 text-sm text-white ${i.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider missing");
  return ctx;
}
