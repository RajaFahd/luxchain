"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/api";

export default function NewProductPage() {
  const router = useRouter();
  const [isMinting, setIsMinting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [mintStep, setMintStep] = useState(0);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintResult, setMintResult] = useState<{ total_items: number; minted_items: number; nama_produk: string; blockchain_mode: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    nama_kategori: "",
    nama_sub_kategori: "",
    nama_produk: "",
    harga: "",
    warna: "",
    tipe_artikel: "",
    tanggal_produksi: "",
    quantity: "1",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [error, setError] = useState("");

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReviewModal(true);
  };

  const executeMint = async () => {
    setIsMinting(true);
    setError("");
    setMintStep(1);

    try {
      // Step 1: Check admin authorization (Simulated 800ms)
      await new Promise((resolve) => setTimeout(resolve, 800));
      setMintStep(2);

      // Step 2: Upload metadata & image (Simulated 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMintStep(3);

      // Step 3: Generate unique UUID & Scratch Codes (Simulated 1200ms)
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setMintStep(4);

      // Step 4: Generate QR Physical Tags (Simulated 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMintStep(5);

      // Step 5: Execute actual registration & Blockchain Minting via API
      const formData = new FormData();
      formData.append("nama_kategori", form.nama_kategori);
      formData.append("nama_sub_kategori", form.nama_sub_kategori);
      formData.append("nama_produk", form.nama_produk);
      formData.append("harga", form.harga);
      formData.append("warna", form.warna);
      formData.append("tipe_artikel", form.tipe_artikel);
      formData.append("tanggal_produksi", form.tanggal_produksi);
      formData.append("quantity", form.quantity);
      if (imageFile) {
        formData.append("gambar", imageFile);
      }

      const result = await createProduct(formData);

      if (result.success) {
        setMintStep(6);
        setMintResult({
          total_items: result.data.total_items,
          minted_items: result.data.minted_items,
          nama_produk: result.data.nama_produk,
          blockchain_mode: result.data.blockchain_mode,
        });
        setMintSuccess(true);
        setTimeout(() => router.push("/dashboard/products"), 3000);
      } else {
        setError(result.message || "Gagal mendaftarkan produk");
        setMintStep(0);
        setIsMinting(false);
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
      setMintStep(0);
      setIsMinting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", height: "42px", padding: "0 14px",
    background: "var(--input-background)", border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) - 2px)", color: "var(--foreground)",
    fontSize: "14px", outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "13px", fontWeight: 500,
    color: "var(--foreground)", marginBottom: "6px",
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--ring)";
    e.target.style.boxShadow = "0 0 0 2px rgba(200,169,110,0.15)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border)";
    e.target.style.boxShadow = "none";
  };

  if (mintSuccess && mintResult) {
    return (
      <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", textAlign: "center" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--lc-success-bg)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lc-success)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)", marginBottom: "6px" }}>Berhasil!</h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
          <strong>{mintResult.nama_produk}</strong> — {mintResult.minted_items} dari {mintResult.total_items} item berhasil di-mint.
        </p>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
          Mode: {mintResult.blockchain_mode === "online" ? "⛓️ On-chain" : "🟡 Offline"} — Redirecting ke daftar produk...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => router.push("/dashboard/products")}
          style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "var(--muted-foreground)", fontSize: "13px", cursor: "pointer", marginBottom: "12px", padding: 0, transition: "color 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Kembali
        </button>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
          Daftarkan Produk Baru
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          Isi metadata produk (7 field) + jumlah unit yang ingin di-generate
        </p>
      </div>

      {error && (
        <div
          className="animate-fade-in"
          style={{
            background: "rgba(224, 92, 92, 0.08)",
            border: "1px solid rgba(224, 92, 92, 0.25)",
            borderRadius: "calc(var(--radius) - 2px)",
            padding: "10px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--destructive)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitReview}>
        {/* Product Metadata Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.5px" }}>METADATA PRODUK</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* 1. Nama Kategori */}
            <div>
              <label htmlFor="nama_kategori" style={labelStyle}>Nama Kategori *</label>
              <input id="nama_kategori" type="text" value={form.nama_kategori} onChange={(e) => handleChange("nama_kategori", e.target.value)} placeholder="e.g. Tas" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 2. Nama Sub Kategori */}
            <div>
              <label htmlFor="nama_sub_kategori" style={labelStyle}>Nama Sub Kategori *</label>
              <input id="nama_sub_kategori" type="text" value={form.nama_sub_kategori} onChange={(e) => handleChange("nama_sub_kategori", e.target.value)} placeholder="e.g. Handbag" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 3. Nama Produk */}
            <div>
              <label htmlFor="nama_produk" style={labelStyle}>Nama Produk *</label>
              <input id="nama_produk" type="text" value={form.nama_produk} onChange={(e) => handleChange("nama_produk", e.target.value)} placeholder="e.g. Hermès Birkin 30" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 4. Harga */}
            <div>
              <label htmlFor="harga" style={labelStyle}>Harga (IDR) *</label>
              <input id="harga" type="number" value={form.harga} onChange={(e) => handleChange("harga", e.target.value)} placeholder="e.g. 500000000" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 5. Warna */}
            <div>
              <label htmlFor="warna" style={labelStyle}>Warna</label>
              <input id="warna" type="text" value={form.warna} onChange={(e) => handleChange("warna", e.target.value)} placeholder="e.g. Gold" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 6. Tipe Artikel (Brand) */}
            <div>
              <label htmlFor="tipe_artikel" style={labelStyle}>Tipe Artikel / Brand *</label>
              <input id="tipe_artikel" type="text" value={form.tipe_artikel} onChange={(e) => handleChange("tipe_artikel", e.target.value)} placeholder="e.g. Hermès" required style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            {/* 7. Tanggal Produksi */}
            <div>
              <label htmlFor="tanggal_produksi" style={labelStyle}>Tanggal Produksi</label>
              <input id="tanggal_produksi" type="date" value={form.tanggal_produksi} onChange={(e) => handleChange("tanggal_produksi", e.target.value)} style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
          </div>

          {/* Image Upload */}
          <div style={{ marginTop: "20px" }}>
            <label style={labelStyle}>Gambar Produk</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
              onClick={() => document.getElementById('gambar-input')?.click()}
              style={{
                border: `1.5px dashed ${dragOver || imagePreview ? "var(--ring)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: imagePreview ? "16px" : "36px 24px", textAlign: "center",
                cursor: "pointer", transition: "all 0.15s",
                background: dragOver ? "rgba(200,169,110,0.05)" : "transparent",
                display: "flex", flexDirection: imagePreview ? "row" as const : "column" as const,
                alignItems: "center", justifyContent: "center", gap: imagePreview ? "16px" : "0",
              }}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "calc(var(--radius) - 4px)" }} />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", marginBottom: "2px" }}>{imageFile?.name}</p>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{imageFile ? (imageFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{ fontSize: "12px", color: "var(--destructive)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "4px" }}>Hapus gambar</button>
                  </div>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragOver ? "var(--primary)" : "var(--muted-foreground)"} strokeWidth="1.5" style={{ marginBottom: "8px" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                  </svg>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "2px" }}>Drag & drop atau klik untuk upload gambar</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>PNG, JPG, WebP — maks. 5MB</p>
                </>
              )}
            </div>
            <input id="gambar-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
            }} />
          </div>
        </div>

        {/* Quantity Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "28px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.5px" }}>JUMLAH UNIT</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "12px" }}>
            Berapa banyak item fisik yang ingin di-generate? Setiap item akan mendapat UUID unik + QR Code.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              id="quantity" type="number" min="1" max="100"
              value={form.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              required
              style={{ ...inputStyle, width: "120px", textAlign: "center", fontSize: "18px", fontWeight: 600 }}
              onFocus={handleFocus} onBlur={handleBlur}
            />
            <span style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              item (maks. 100)
            </span>
          </div>
          {parseInt(form.quantity) > 1 && (
            <div className="animate-fade-in" style={{
              marginTop: "12px", padding: "10px 14px",
              background: "var(--lc-info-bg)", border: "1px solid var(--lc-info)",
              borderRadius: "calc(var(--radius) - 4px)", fontSize: "13px", color: "var(--lc-info)",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              {form.quantity} item dengan spesifikasi yang sama akan di-generate secara otomatis.
            </div>
          )}
        </div>

        <button
          type="submit" disabled={isMinting}
          style={{
            width: "100%", height: "48px",
            background: isMinting ? "var(--muted)" : "var(--primary)",
            color: isMinting ? "var(--muted-foreground)" : "var(--primary-foreground)",
            border: "none", borderRadius: "calc(var(--radius) - 2px)",
            fontSize: "14px", fontWeight: 600, cursor: isMinting ? "not-allowed" : "pointer",
            transition: "opacity 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            letterSpacing: "1px",
          }}
          onMouseEnter={(e) => { if (!isMinting) e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          {isMinting ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Generating {form.quantity} item...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              DAFTARKAN {parseInt(form.quantity) > 1 ? `${form.quantity} PRODUK` : "PRODUK"}
            </>
          )}
        </button>
      </form>

      {isMinting && (
        <div
          className="animate-fade-in-up"
          style={{
            marginTop: "20px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" style={{ animation: "spin 1.5s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "0.5px" }}>
              PROSES MINTING & REGISTRASI HYBRID BLOCKCHAIN
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { id: 1, label: "Memeriksa otorisasi Wallet Admin & Smart Contract..." },
              { id: 2, label: "Mengunggah berkas gambar & metadata produk ke MySQL..." },
              { id: 3, label: `Menghasilkan UUID & Secure Scratch Codes untuk ${form.quantity} unit...` },
              { id: 4, label: `Membuat berkas QR Code Physical Tags di server...` },
              { id: 5, label: "Melakukan transaksi Minting ke Blockchain (Hybrid ⛓️)..." }
            ].map((step) => {
              const isCompleted = mintStep > step.id;
              const isActive = mintStep === step.id;
              const isPending = mintStep < step.id;

              return (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {/* Icon step */}
                  {isCompleted ? (
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "var(--lc-success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--lc-success)" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(184, 150, 62, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid var(--border)", background: "transparent" }} />
                  )}

                  {/* Text label */}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: isActive ? 600 : 500,
                      color: isCompleted
                        ? "var(--lc-success)"
                        : isActive
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                      transition: "color 0.2s",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showReviewModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: "20px",
        }}>
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", width: "100%", maxWidth: "560px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
            padding: "28px", display: "flex", flexDirection: "column", gap: "20px",
            animation: "fade-in-up 0.2s ease-out"
          }}>
            {/* Header */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", marginBottom: "6px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h3 style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "0.5px" }}>TINJAU & KONFIRMASI DATA BLOCKCHAIN</h3>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                Harap periksa kembali detail spesifikasi produk sebelum melanjutkan. Registrasi blockchain bersifat permanen.
              </p>
            </div>

            {/* Product Summary Grid */}
            <div style={{
              background: "var(--input-background)", border: "1px solid var(--border)",
              borderRadius: "calc(var(--radius) - 2px)", padding: "16px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px"
            }}>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Brand / Tipe Artikel</p>
                <p style={{ fontWeight: 500, color: "var(--foreground)" }}>{form.tipe_artikel}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Nama Produk</p>
                <p style={{ fontWeight: 500, color: "var(--foreground)" }}>{form.nama_produk}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Kategori / Sub</p>
                <p style={{ fontWeight: 500, color: "var(--foreground)" }}>{form.nama_kategori} / {form.nama_sub_kategori}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Harga (IDR)</p>
                <p style={{ fontWeight: 600, color: "var(--foreground)" }}>Rp {Number(form.harga || 0).toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Warna</p>
                <p style={{ fontWeight: 500, color: "var(--foreground)" }}>{form.warna || "-"}</p>
              </div>
              <div>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tanggal Produksi</p>
                <p style={{ fontWeight: 500, color: "var(--foreground)" }}>{form.tanggal_produksi || "-"}</p>
              </div>
              <div style={{ gridColumn: "span 2", borderTop: "1px dashed var(--border)", paddingTop: "10px", marginTop: "4px" }}>
                <p style={{ color: "var(--muted-foreground)", marginBottom: "2px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Jumlah Unit yang Akan Dibuat</p>
                <p style={{ fontWeight: 600, color: "var(--primary)", fontSize: "14px" }}>{form.quantity} Unit (Physical Tags + QR Codes)</p>
              </div>
            </div>

            {/* Warning Text */}
            <div style={{
              background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)",
              borderRadius: "calc(var(--radius) - 4px)", padding: "12px 14px",
              fontSize: "12px", color: "var(--lc-warning)", display: "flex", gap: "8px", lineHeight: "1.5"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: "2px" }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <strong>PENTING (KEAMANAN BLOCKCHAIN)</strong>: Setelah didaftarkan, sistem akan langsung membuat data digital representasi barang mewah ini ke database & mempersiapkan antrean minting blockchain (smart contract Sepolia). Data blockchain bersifat <strong>kekal (immutable)</strong> dan tidak dapat diubah demi menjamin keaslian barang mewah dari tindakan pemalsuan.
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                style={{
                  flex: 1, height: "42px", background: "transparent", color: "var(--foreground)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)",
                  fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "background 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Kembali & Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  executeMint();
                }}
                style={{
                  flex: 1, height: "42px", background: "var(--primary)", color: "var(--primary-foreground)",
                  border: "none", borderRadius: "calc(var(--radius) - 2px)",
                  fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Ya, Daftarkan Produk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
