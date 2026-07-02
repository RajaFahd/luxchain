"use client";

import { useState, useEffect } from "react";
import { getProductItems } from "@/lib/api";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
            Daftar Product Items (Unit Fisik)
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            Data seluruh unit produk fisik yang di-minting ke blockchain dan menempel pada produk aslinya.
          </p>
        </div>
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
            { label: "Pending", value: "pending" },
            { label: "Minted", value: "minted" },
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
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
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
                          src={`${API_BASE}${i.gambar_url}`} 
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
                    <CopyableText 
                      text={i.secret_code} 
                      style={{ color: "var(--foreground)", fontWeight: 500 }} 
                    />
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <CopyableText 
                      text={i.hash_blockchain} 
                      truncateText={truncateString(i.hash_blockchain, 6)} 
                      style={{ color: "var(--muted-foreground)" }} 
                    />
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    {i.tx_hash ? (
                      <CopyableText 
                        text={i.tx_hash} 
                        truncateText={truncateString(i.tx_hash, 8)} 
                        style={{ color: "var(--muted-foreground)" }} 
                        link={`https://sepolia.etherscan.io/tx/${i.tx_hash}`} 
                      />
                    ) : (
                      <span style={{ color: "var(--muted-foreground)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{ 
                      background: i.status === 'minted' ? "var(--lc-success-bg)" : "var(--lc-warning-bg)", 
                      color: i.status === 'minted' ? "var(--lc-success)" : "var(--lc-warning)", 
                      padding: "4px 10px", 
                      borderRadius: "20px", 
                      fontSize: "12px",
                      fontWeight: 500
                    }}>
                      {i.status.toUpperCase()}
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
        )}
      </div>

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
