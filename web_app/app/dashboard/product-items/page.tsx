"use client";

import { useState, useEffect } from "react";
import { getProductItems, getMediaUrl } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

export default function ProductItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Selection state for batch actions
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = async (searchVal: string, statusVal: string, pageNum: number) => {
    try {
      setLoading(true);
      const res = await getProductItems({ search: searchVal, status: statusVal, page: pageNum, limit: 20 });
      if (res.success) {
        setItems(res.data);
        setPagination(res.pagination || { page: pageNum, limit: 20, total: res.data.length, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch product items", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when debounced search, status filter, or page changes
  useEffect(() => {
    fetchItems(debouncedSearch, statusFilter, page);
    setSelectedItems([]); // Reset selection when filters or page change
  }, [debouncedSearch, statusFilter, page]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setViewMode("table");
    }
  }, []);

  const truncateString = (str: string, len: number = 8) => {
    if (!str) return "-";
    if (str.length <= len * 2) return str;
    return str.substring(0, len) + "..." + str.substring(str.length - len);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadQR = async (uuid: string) => {
    try {
      const item = items.find((i) => i.id_item === uuid);
      const productName = item ? item.nama_produk : "item";
      const safeProductName = productName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      
      const qrUrl = `${API_BASE}/qrcodes/qr_${uuid}.png`;
      
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error("QR not found");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `luxchain_qr_${safeProductName}_${uuid.substring(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengunduh QR Code. Kemungkinan file belum di-generate di server.");
      console.error(err);
    }
  };

  const handleDownloadBatch = async () => {
    if (selectedItems.length === 0) return;
    
    setBatchDownloading(true);
    setDownloadProgress({ current: 0, total: selectedItems.length });
    
    let successCount = 0;
    for (let i = 0; i < selectedItems.length; i++) {
      const uuid = selectedItems[i];
      setDownloadProgress({ current: i + 1, total: selectedItems.length });
      
      try {
        const item = items.find((itm) => itm.id_item === uuid);
        const productName = item ? item.nama_produk : "item";
        const safeProductName = productName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        
        const qrUrl = `${API_BASE}/qrcodes/qr_${uuid}.png`;
        const response = await fetch(qrUrl);
        if (!response.ok) throw new Error("QR not found");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `luxchain_qr_${safeProductName}_${uuid.substring(0, 8)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        successCount++;
        
        // Wait 250ms between downloads to avoid popup blocker / throttling
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (err) {
        console.error(`Failed to download QR for ${uuid}:`, err);
      }
    }
    
    setBatchDownloading(false);
    alert(`Berhasil mengunduh ${successCount} dari ${selectedItems.length} QR Code.`);
    setSelectedItems([]);
  };

  const handleSelectItem = (uuid: string) => {
    setSelectedItems((prev) =>
      prev.includes(uuid)
        ? prev.filter((id) => id !== uuid)
        : [...prev, uuid]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((i) => i.id_item));
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
            Daftar Product Items (Unit Fisik)
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            Data seluruh unit produk fisik yang di-minting ke blockchain dan menempel pada produk aslinya.
          </p>
        </div>
        <a
          href="/dashboard/nfc-queue"
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 16px", background: "var(--primary)",
            color: "var(--primary-foreground)", textDecoration: "none",
            borderRadius: "calc(var(--radius) - 2px)", fontSize: "13px",
            fontWeight: 600, transition: "opacity 0.15s"
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          Stasiun Antrean NFC
        </a>
      </div>

      {/* Search & Filter Section */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: 1, minWidth: "280px", maxWidth: "400px" }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Cari UUID, nama produk, secret code, hash, tx..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: "38px", padding: "0 12px 0 36px",
              background: "var(--input-background)", border: "1px solid var(--border)",
              borderRadius: "calc(var(--radius) - 2px)", color: "var(--foreground)",
              fontSize: "13px", outline: "none", transition: "all 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Status Pills */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { label: "All", value: "" },
            { label: "Waiting NFC", value: "waiting_nfc" },
            { label: "Minted", value: "minted" },
            { label: "Pending", value: "pending" },
            { label: "Sold", value: "sold" },
          ].map((pill) => {
            const isActive = statusFilter === pill.value;
            return (
              <button
                key={pill.label}
                onClick={() => setStatusFilter(pill.value)}
                style={{
                  padding: "6px 14px",
                  background: isActive ? "var(--primary)" : "var(--card)",
                  color: isActive ? "var(--primary-foreground)" : "var(--foreground)",
                  border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)", padding: "2px", height: "36px" }}>
          <button
            onClick={() => setViewMode("cards")}
            title="Tampilan Kartu (Mobile Friendly)"
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", height: "100%",
              background: viewMode === "cards" ? "var(--primary)" : "transparent",
              color: viewMode === "cards" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              border: "none", borderRadius: "calc(var(--radius) - 4px)", fontSize: "12px", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Kartu</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Tampilan Tabel"
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", height: "100%",
              background: viewMode === "table" ? "var(--primary)" : "transparent",
              color: viewMode === "table" ? "var(--primary-foreground)" : "var(--muted-foreground)",
              border: "none", borderRadius: "calc(var(--radius) - 4px)", fontSize: "12px", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* Batch Actions Panel */}
      {selectedItems.length > 0 && (
        <div 
          className="animate-fade-in" 
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px",
            background: "var(--card)", border: "1px solid var(--primary)",
            borderRadius: "var(--radius)", padding: "12px 18px",
            marginBottom: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>
              {selectedItems.length} item dipilih
            </span>
            {batchDownloading && (
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Mengunduh {downloadProgress.current} / {downloadProgress.total}...
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleDownloadBatch}
              disabled={batchDownloading}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", background: "var(--primary)",
                color: "var(--primary-foreground)", border: "none",
                borderRadius: "calc(var(--radius) - 2px)", fontSize: "12px",
                fontWeight: 500, cursor: batchDownloading ? "not-allowed" : "pointer",
                opacity: batchDownloading ? 0.7 : 1, transition: "opacity 0.15s"
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Unduh QR Terpilih
            </button>
            <button
              onClick={() => setSelectedItems([])}
              disabled={batchDownloading}
              style={{
                background: "transparent", color: "var(--muted-foreground)",
                border: "none", fontSize: "13px", cursor: batchDownloading ? "not-allowed" : "pointer",
                transition: "color 0.15s"
              }}
              onMouseEnter={(e) => { if (!batchDownloading) e.currentTarget.style.color = "var(--foreground)"; }}
              onMouseLeave={(e) => { if (!batchDownloading) e.currentTarget.style.color = "var(--muted-foreground)"; }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Product Items Content: Card View or Table View */}
      {viewMode === "cards" ? (
        loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading data...
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
            Belum ada item yang terdaftar.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
            {items.map((i: any) => (
              <div
                key={i.id_item}
                className="animate-fade-in"
                style={{
                  background: "var(--card)",
                  border: selectedItems.includes(i.id_item) ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.15s ease",
                }}
              >
                {/* Header: Checkbox + Image + Product Title + Status */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(i.id_item)}
                    onChange={() => handleSelectItem(i.id_item)}
                    style={{ cursor: "pointer", accentColor: "var(--primary)", marginTop: "3px" }}
                  />
                  {i.gambar_url ? (
                    <img
                      src={getMediaUrl(i.gambar_url)}
                      alt={i.nama_produk}
                      style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: "44px", height: "44px", background: "var(--muted)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      📦
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {i.nama_produk}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
                        background: i.status === "minted" ? "var(--lc-success-bg)" : i.status === "waiting_nfc" ? "rgba(245, 158, 11, 0.12)" : "rgba(200, 169, 110, 0.15)",
                        color: i.status === "minted" ? "var(--lc-success)" : i.status === "waiting_nfc" ? "var(--lc-warning)" : "var(--primary)"
                      }}>
                        {i.status === "waiting_nfc" ? "Waiting NFC" : i.status}
                      </span>
                      <span style={{ fontSize: "11px", color: i.is_claimed ? "var(--lc-success)" : "var(--muted-foreground)", fontWeight: 500 }}>
                        {i.is_claimed ? "✓ Claimed" : "Belum Claim"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specs Block */}
                <div style={{
                  background: "var(--input-background)",
                  borderRadius: "calc(var(--radius) - 4px)",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12px",
                }}>
                  {/* UUID + Download QR */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>UUID:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CopyableText text={i.id_item} truncateText={truncateString(i.id_item, 6)} style={{ color: "var(--primary)", fontFamily: "monospace" }} />
                      <button
                        onClick={() => handleDownloadQR(i.id_item)}
                        title="Download QR Code"
                        style={{
                          background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px",
                          width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)"
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      </button>
                    </div>
                  </div>

                  {/* UID Fisik NFC */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>UID Fisik NFC:</span>
                    {i.uid_fisik ? (
                      <CopyableText text={i.uid_fisik} style={{ color: "var(--primary)", fontFamily: "monospace", fontWeight: 500 }} />
                    ) : (
                      <a href="/dashboard/nfc-queue" style={{ color: "var(--lc-warning)", fontStyle: "italic", fontSize: "11px", textDecoration: "underline" }}>
                        Waiting NFC (Tap Sekarang →)
                      </a>
                    )}
                  </div>

                  {/* Hash Blockchain */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Hash:</span>
                    <CopyableText text={i.hash_blockchain} truncateText={truncateString(i.hash_blockchain, 6)} style={{ fontFamily: "monospace", fontSize: "11px" }} />
                  </div>

                  {/* Secret Code */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Secret Code:</span>
                    <CopyableText text={i.secret_code} style={{ fontWeight: 500 }} />
                  </div>
                </div>

                {/* Footer info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--muted-foreground)", marginTop: "auto" }}>
                  <span>Mint: {formatDate(i.created_at)}</span>
                  {i.tx_hash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${i.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}
                    >
                      <span>Etherscan</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Table View */
        <div>
          <div className="show-on-mobile" style={{ alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /><polyline points="19 18 13 12 19 6" /></svg>
            <span>Geser tabel ke samping ↔ untuk melihat semua data fisik</span>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
                Loading data...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
                Belum ada item yang terdaftar.
              </div>
            ) : (
              <div className="table-responsive-container">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px", minWidth: "850px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
                    <th style={{ padding: "16px 20px", width: "40px" }}>
                      <input 
                        type="checkbox" 
                        checked={items.length > 0 && selectedItems.length === items.length}
                        onChange={handleSelectAll}
                        style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                      />
                    </th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>PRODUK</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>UUID (QR CODE)</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>UID FISIK (NFC)</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>SECRET CODE</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>HASH BLOCKCHAIN</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>TXHASH</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>STATUS MINT</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>CLAIMED?</th>
                    <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>TANGGAL MINT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i: any) => (
                    <tr key={i.id_item} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "16px 20px", width: "40px" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedItems.includes(i.id_item)}
                          onChange={() => handleSelectItem(i.id_item)}
                          style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                        />
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {i.gambar_url ? (
                            <img 
                              src={getMediaUrl(i.gambar_url)} 
                              alt={i.nama_produk} 
                              style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "8px" }} 
                            />
                          ) : (
                            <div style={{ width: "40px", height: "40px", background: "var(--muted)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              📦
                            </div>
                          )}
                          <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{i.nama_produk}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ background: "rgba(184, 150, 62, 0.1)", padding: "4px 8px", borderRadius: "4px", display: "inline-block" }}>
                            <CopyableText 
                              text={i.id_item} 
                              truncateText={truncateString(i.id_item, 6)} 
                              style={{ color: "var(--primary)" }} 
                            />
                          </div>
                          <button
                            onClick={() => handleDownloadQR(i.id_item)}
                            title="Download QR Code Physical Tag"
                            style={{
                              background: "var(--secondary)",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "var(--muted-foreground)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--primary)";
                              e.currentTarget.style.color = "var(--primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--border)";
                              e.currentTarget.style.color = "var(--muted-foreground)";
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {i.uid_fisik ? (
                          <CopyableText 
                            text={i.uid_fisik} 
                            style={{ color: "var(--primary)", fontFamily: "monospace", fontSize: "12px", fontWeight: 500 }} 
                          />
                        ) : (
                          <span style={{ color: "var(--muted-foreground)", fontSize: "12px", fontStyle: "italic" }}>
                            Belum diikat
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <CopyableText 
                          text={i.secret_code} 
                          style={{ color: "var(--foreground)", fontWeight: 500 }} 
                        />
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <CopyableText 
                          text={i.hash_blockchain} 
                          truncateText={truncateString(i.hash_blockchain, 6)} 
                          style={{ color: "var(--primary)", fontFamily: "monospace", fontSize: "12px" }} 
                        />
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {i.tx_hash ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CopyableText 
                              text={i.tx_hash} 
                              truncateText={truncateString(i.tx_hash, 6)} 
                              style={{ color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: "12px" }} 
                            />
                            <a 
                              href={`https://sepolia.etherscan.io/tx/${i.tx_hash}`} 
                              target="_blank" 
                              rel="noreferrer"
                              title="Lihat di Sepolia Etherscan"
                              style={{ color: "var(--primary)", display: "flex", alignItems: "center" }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ 
                          background: 
                            i.status === 'minted' 
                              ? "var(--lc-success-bg)" 
                              : i.status === 'waiting_nfc'
                              ? "rgba(59, 130, 246, 0.12)"
                              : i.status === 'sold'
                              ? "rgba(168, 85, 247, 0.12)"
                              : "var(--lc-warning-bg)", 
                          color: 
                            i.status === 'minted' 
                              ? "var(--lc-success)" 
                              : i.status === 'waiting_nfc'
                              ? "#3b82f6"
                              : i.status === 'sold'
                              ? "#a855f7"
                              : "var(--lc-warning)", 
                          padding: "4px 10px", 
                          borderRadius: "20px", 
                          fontSize: "12px",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {i.status === 'waiting_nfc' && <span>🏷️</span>}
                          {i.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {i.is_claimed ? (
                          <span style={{ color: "var(--lc-success)", fontWeight: 500, fontSize: "13px" }}>✓ YES</span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>- NO</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px", color: "var(--muted-foreground)", fontSize: "13px" }}>
                        {formatDate(i.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPage(pagination.page - 1)}
            style={{
              padding: "6px 12px", fontSize: "12px", borderRadius: "calc(var(--radius) - 4px)",
              border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
              cursor: pagination.page <= 1 ? "not-allowed" : "pointer", opacity: pagination.page <= 1 ? 0.5 : 1,
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage(pagination.page + 1)}
            style={{
              padding: "6px 12px", fontSize: "12px", borderRadius: "calc(var(--radius) - 4px)",
              border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)",
              cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
