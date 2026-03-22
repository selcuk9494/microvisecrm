"use client";

export async function geocodeAddressToLatLng(address: string): Promise<{ lat?: string; lng?: string }> {
  const q = address?.trim();
  if (!q) return {};
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "tr" } });
    if (!res.ok) return {};
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length) {
      const item = arr[0];
      return { lat: String(item.lat || ""), lng: String(item.lon || "") };
    }
  } catch {}
  return {};
}

export async function geocodeLatLngToAddress(lat: string, lng: string): Promise<string | undefined> {
  if (!lat || !lng) return undefined;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "tr" } });
    if (!res.ok) return undefined;
    const j = await res.json();
    return j?.display_name || undefined;
  } catch {}
  return undefined;
}
