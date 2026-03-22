export function normalizePhoneTR(s: string) {
  return String(s || "").replace(/\D/g, "");
}
export function formatPhoneTR(s: string) {
  const d0 = normalizePhoneTR(s);
  let d = d0;
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length >= 10) {
    d = d.slice(-10);
    return `(${d.slice(0,3)}) ${d.slice(3,6)} ${d.slice(6,8)} ${d.slice(8,10)}`;
  }
  return d0;
}
