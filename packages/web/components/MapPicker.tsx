"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  lat?: string;
  lng?: string;
  onChange: (lat: string, lng: string) => void;
};

export default function MapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cssUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    const jsUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    function ensureCss() {
      if (document.querySelector(`link[href="${cssUrl}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      document.head.appendChild(link);
    }
    function ensureJs() {
      if ((window as any).L) { setReady(true); return; }
      if (document.querySelector(`script[src="${jsUrl}"]`)) return;
      const script = document.createElement("script");
      script.src = jsUrl;
      script.onload = () => setReady(true);
      document.body.appendChild(script);
    }
    ensureCss();
    ensureJs();
  }, []);
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const center = (lat && lng) ? [Number(lat), Number(lng)] : [35.1856, 33.3823];
    const map = L.map(containerRef.current).setView(center, 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    let marker = L.marker(center, { draggable: true }).addTo(map);
    function update(loc: any) {
      const c = marker.getLatLng();
      onChange(String(c.lat), String(c.lng));
    }
    marker.on("dragend", update);
    map.on("click", (e: any) => {
      marker.setLatLng(e.latlng);
      update(null);
    });
    return () => { map.remove(); };
  }, [ready, lat, lng]);
  return (
    <div ref={containerRef} className="h-80 w-full rounded-md border" />
  );
}
