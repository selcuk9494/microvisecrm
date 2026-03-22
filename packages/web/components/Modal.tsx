"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
};

export default function Modal({ open, title, onClose, children, size = "xxl" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  const root = document.getElementById("portal-root") || document.body;
  const maxW =
    size === "sm" ? "max-w-md" :
    size === "md" ? "max-w-lg" :
    size === "lg" ? "max-w-2xl" :
    size === "xl" ? "max-w-3xl" :
    "max-w-4xl";
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className={`absolute left-1/2 top-1/2 w-full ${maxW} -translate-x-1/2 -translate-y-1/2`}>
        <div className="card max-h-[90vh] overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <div className="p-4 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>,
    root
  );
}
