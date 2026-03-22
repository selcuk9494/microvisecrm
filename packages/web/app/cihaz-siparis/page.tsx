"use client";
import { useEffect, useMemo, useState } from "react";

type KV = { key: string; label: string; value?: string; fixed?: boolean; type?: "text" | "date" | "number" };

export default function CihazSiparis() {
  const [rows, setRows] = useState<KV[]>([
    { key: "invoice_date_no", label: "Satışa Ait faturanın Tarih ve No' su", value: "", type: "text" },
    { key: "buyer_name", label: "Adı - Soyadı / Ünvanı", value: "", type: "text" },
    { key: "buyer_address", label: "İşyeri Adresi", value: "", type: "text" },
    { key: "buyer_tax_office", label: "Bağlı olduğu Vergi Dairesi", value: "Lefkoşa", type: "text" },
    { key: "buyer_vkn", label: "VKN", value: "", type: "text" },
    { key: "buyer_file_number", label: "Dosya Sicil No", value: "", type: "text" },
    { key: "device_start_date", label: "Cihazın çalıştırılma Tarihi", value: "", type: "date" },
    { key: "buyer_director", label: "Direktör", value: "", type: "text" },
    { key: "device_brand", label: "Markası", value: "INGENICO", type: "text", fixed: true },
    { key: "device_model", label: "Modeli", value: "A910SF", type: "text" },
    { key: "device_serial", label: "Cihaz Sicil No", value: "", type: "text" },
    { key: "mali_kod", label: "Mali Sembol ve Firma Kodu", value: "MF-2D", type: "text", fixed: true },
    { key: "departman_count", label: "Cihazın Departman Sayısı", value: "8", type: "number" },
    { key: "muhasebe", label: "Muhasebe ofisi", value: "", type: "text" },
    { key: "okc_start", label: "Ökc Kullanılmaya başlama Tarihi", value: "", type: "date" },
    { key: "activity", label: "Ticari Faaliyet / Meslek Türü", value: "", type: "text" },
    { key: "invoice_no", label: "Fatura No", value: "", type: "text" },
  ]);
  const seller = useMemo(() => ({
    name: "MICROVISE INNOVATION LTD.",
    address: "Atatürk Cad Emek 2 No:1 Yenişehir Lefkoşa",
    ruhsat: "068",
    garanti_ay: "12",
  }), []);
  useEffect(() => {
    try {
      const s = localStorage.getItem("cihaz_siparis_rows");
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) setRows((prev) => prev.map((r) => ({ ...r, value: parsed.find((p: any) => p.key === r.key)?.value ?? r.value })));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("cihaz_siparis_rows", JSON.stringify(rows.map((r) => ({ key: r.key, value: r.value }))));
    } catch {}
  }, [rows]);
  function setValue(key: string, v: string) {
    setRows((rs) => rs.map((r) => r.key === key ? { ...r, value: v } : r));
  }
  function get(key: string) {
    return rows.find((r) => r.key === key)?.value || "";
  }
  function fmt(d: string) {
    if (!d) return "";
    try {
      const t = new Date(d);
      return `${t.getDate()}.${String(t.getMonth()+1).padStart(2,"0")}.${t.getFullYear()}`;
    } catch {
      return d;
    }
  }
  function openPrint(html: string, title: string) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>
      @page { size: A4; margin: 10mm; }
      html,body{background:#fff}
      body{font-family: Arial,Helvetica,sans-serif; line-height:1.35; color:#0f172a}
      .frame{border:6px solid #111827; padding:6mm}
      .page{width:190mm; min-height:277mm; margin:0 auto;}
      .mt{margin-top:10px}
      .hdr{font-weight:700;text-align:center; letter-spacing:0.2px}
      .sub{position:relative}
      .sub .formid{position:absolute; right:0; top:-14px; font-size:12px}
      table{width:100%;border-collapse:collapse}
      td{padding:3px 6px;vertical-align:top}
      .sep{border-bottom:1px dashed #6b7280;margin:8px 0}
      .section{font-weight:700; margin:6px 0}
      .box{border:1px solid #111827;padding:8px}
      .leader{display:flex; align-items:baseline; gap:6px; margin:2px 0}
      .leader .lab{white-space:nowrap}
      .leader .dots{flex:1; border-bottom:1px dotted #111827; transform:translateY(-3px)}
      .leader .val{white-space:nowrap; font-weight:600}
      .small{font-size:12px}
    </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }
  function printTutanak() {
    const html = `
    <div class="frame"><div class="page sub">
      <div class="formid small">(Forma. KDV 4A)</div>
      <div class="hdr">ÖDEME KAYDEDİCİ CİHAZ KULLANIM ONAYINA<br/>İLİŞKİN MALİ MÜHÜR UYGULAMA TUTANAĞI</div>
      <div class="mt"><strong>Maliye Bakanlığı</strong><br/>Gelir ve Vergi Dairesi Müdürlüğü<br/><strong>LEFKOŞA</strong></div>
      <div class="sep"></div>
      <div class="box">
        <div class="section">1- CİHAZI SATAN KİŞİ VEYA İŞLETMENİN</div>
        <div class="leader"><span class="lab">-- Adı - Soyadı / Ünvanı</span><span class="dots"></span><span class="val">${seller.name}</span></div>
        <div class="leader"><span class="lab">-- İşyeri Adresi</span><span class="dots"></span><span class="val">${seller.address}</span></div>
        <div class="leader"><span class="lab">-- Ruhsatname No</span><span class="dots"></span><span class="val">${seller.ruhsat}</span></div>
        <div class="leader"><span class="lab">-- Satışa Ait faturanın Tarih ve No' su</span><span class="dots"></span><span class="val">${get("invoice_date_no")}</span></div>
        <div class="leader"><span class="lab">-- Cihazın Garanti Süresi</span><span class="dots"></span><span class="val">${seller.garanti_ay}</span></div>
        <div class="leader"><span class="lab">-- Firmanın Kaşesi ve Yetkilinin İmzası</span><span class="dots"></span><span class="val"></span></div>
      </div>
      <div class="mt box">
        <div class="section">2- CİHAZI SATIN ALAN KİŞİ VEYA İŞLETMENİN</div>
        <div class="leader"><span class="lab">-- Adı - Soyadı / Ünvanı</span><span class="dots"></span><span class="val">${get("buyer_name")}</span></div>
        <div class="leader"><span class="lab">-- İşyeri Adresi</span><span class="dots"></span><span class="val">${get("buyer_address")}</span></div>
        <div class="leader"><span class="lab">-- Bağlı olduğu Vergi Dairesi ve Dosya Sicil No</span><span class="dots"></span><span class="val">${get("buyer_tax_office")} VKN: ${get("buyer_file_number")}</span></div>
        <div class="leader"><span class="lab">-- Cihazın çalıştırılma Tarihi</span><span class="dots"></span><span class="val">${fmt(get("device_start_date"))}</span></div>
      </div>
      <div class="mt box">
        <div class="section">3- SATIŞI YAPILAN CİHAZIN ÖZELLİKLERİ</div>
        <div class="leader"><span class="lab">-- Markası ve Modeli</span><span class="dots"></span><span class="val">${get("device_brand")} ${get("device_model")}</span></div>
        <div class="leader"><span class="lab">-- Cihaz Sicil No</span><span class="dots"></span><span class="val">${get("device_serial")}</span></div>
        <div class="leader"><span class="lab">-- Mali Sembol ve Firma Kodu</span><span class="dots"></span><span class="val">${get("mali_kod")}</span></div>
        <div class="leader"><span class="lab">-- Cihazın Departman Sayısı</span><span class="dots"></span><span class="val">${get("departman_count")}</span></div>
      </div>
      <div class="mt box">
        <div class="section">4- YETKİLİ BAKIM ONARIM SERVİSİNİN</div>
        <div class="leader"><span class="lab">-- Adı - Soyadı / Ünvanı</span><span class="dots"></span><span class="val">${seller.name}</span></div>
        <div class="leader"><span class="lab">-- İşyeri Adresi</span><span class="dots"></span><span class="val">${seller.address}</span></div>
      </div>
      <div class="mt box">
        <div class="section">5- CİHAZA MALİ MÜHÜRÜ TATBİK EDEN</div>
        <div class="leader"><span class="lab">İmzası</span><span class="dots"></span><span class="val"></span></div>
        <div class="leader"><span class="lab">Açık İsmi</span><span class="dots"></span><span class="val"></span></div>
        <div class="leader"><span class="lab">Makamı</span><span class="dots"></span><span class="val"></span></div>
      </div>
    </div></div>`;
    openPrint(html, "Mali Mühür Uygulama Tutanağı");
  }
  function printTalep() {
    const html = `
    <div class="frame"><div class="page sub">
      <div class="formid small">(Forma. KDV 4)</div>
      <div class="hdr">ÖDEME KAYDEDİCİ CİHAZ ONAY TALEP FORMU</div>
      <div class="mt"><strong>Maliye Bakanlığı</strong><br/>Gelir ve Vergi Dairesi<br/><strong>LEFKOŞA</strong></div>
      <div class="sep"></div>
      <div class="leader"><span class="lab">Tarih</span><span class="dots"></span><span class="val">${fmt(get("okc_start"))}</span></div>
      <div class="section">1- İşletmenin Ünvanı</div>
      <div class="leader"><span class="lab">a) İşletmenin Sahibi</span><span class="dots"></span><span class="val">${get("buyer_name")}</span></div>
      <div class="leader"><span class="lab">b) İşletmenin Direktörü</span><span class="dots"></span><span class="val">${get("buyer_director")}</span></div>
      <div class="section">2- İşletmenin Adres Bilgileri</div>
      <div class="leader"><span class="lab">Merkez Adresi</span><span class="dots"></span><span class="val">${get("buyer_address")}</span></div>
      <div class="leader"><span class="lab">VKN / Dosya Sicil</span><span class="dots"></span><span class="val">${get("buyer_tax_office")} / ${get("buyer_file_number")}</span></div>
      <div class="leader"><span class="lab">Muhasip - Murakkıb</span><span class="dots"></span><span class="val">${get("muhasebe") || ""}</span></div>
      <div class="section">3- Kullanıma Başlama</div>
      <div class="leader"><span class="lab">ÖKC Kullanım Başlangıç Tarihi</span><span class="dots"></span><span class="val">${fmt(get("okc_start"))}</span></div>
      <div class="leader"><span class="lab">Ticari Faaliyet / Meslek Türü</span><span class="dots"></span><span class="val">${get("activity")}</span></div>
      <div class="section">4- Ödeme Kaydedici Cihaz</div>
      <div class="leader"><span class="lab">Markası</span><span class="dots"></span><span class="val">${get("device_brand")}</span></div>
      <div class="leader"><span class="lab">Modeli</span><span class="dots"></span><span class="val">${get("device_model")}</span></div>
      <div class="leader"><span class="lab">Sicil No</span><span class="dots"></span><span class="val">${get("device_serial")}</span></div>
      <div class="leader"><span class="lab">Mali Sembol ve Firma Kodu</span><span class="dots"></span><span class="val">${get("mali_kod")}</span></div>
      <div class="section">5- Satıcı/Servis</div>
      <div class="leader"><span class="lab">Adı - Soyadı / Ünvanı</span><span class="dots"></span><span class="val">${seller.name}</span></div>
      <div class="leader"><span class="lab">Adresi</span><span class="dots"></span><span class="val">${seller.address}</span></div>
      <div class="mt small">Başvuru Sahibinin: ${get("buyer_name")} &nbsp;&nbsp; İmzası: .................................. &nbsp;&nbsp; Statüsü: ${get("buyer_director") || "DİREKTÖR"}</div>
    </div></div>`;
    openPrint(html, "Onay Talep Formu");
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cihaz Sipariş</h1>
      <div className="card p-4">
        <div className="mb-3 flex gap-2">
          <button className="btn btn-primary" onClick={printTutanak}>Yazdır: Tutanak</button>
          <button className="btn btn-secondary" onClick={printTalep}>Yazdır: Talep Formu</button>
        </div>
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="w-1/2 px-3 py-2">Alan</th>
              <th className="w-1/2 px-3 py-2">Değer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2">
                  {r.fixed ? (
                    <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-700">{r.value}</span>
                  ) : (
                    r.type === "date" ? (
                      <input type="date" className="input bg-green-50" value={r.value} onChange={e => setValue(r.key, e.target.value)} />
                    ) : (
                      <input type={r.type || "text"} className="input bg-green-50" value={r.value} onChange={e => setValue(r.key, e.target.value)} />
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card p-4">
        <div className="text-sm text-slate-600">
          Kırmızı alanlar sabit, yeşil alanlar manuel girilir. Veriler tarayıcıda saklanır.
        </div>
      </div>
    </div>
  );
}
