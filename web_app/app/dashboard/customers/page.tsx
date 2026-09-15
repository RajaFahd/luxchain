"use client";

import { useState, useEffect } from "react";
import { getCustomers } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Sort states
  const [search, setSearch] = useState("");
  const [minAssets, setMinAssets] = useState("");
  const [minTx, setMinTx] = useState("");
  const [sortBy, setSortBy] = useState("join_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedMinAssets, setDebouncedMinAssets] = useState("");
  const [debouncedMinTx, setDebouncedMinTx] = useState("");

  // Debouncing inputs
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinAssets(minAssets), 300);
    return () => clearTimeout(timer);
  }, [minAssets]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinTx(minTx), 300);
    return () => clearTimeout(timer);
  }, [minTx]);

  const fetchCustomers = async (searchVal: string, minAssetsVal: string, minTxVal: string, sortVal: string, pageNum: number) => {
    try {
      setLoading(true);
      const res = await getCustomers({
        search: searchVal,
        min_assets: minAssetsVal,
        min_tx: minTxVal,
        sort_by: sortVal,
        page: pageNum,
        limit: 20,
      });
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination || { page: pageNum, limit: 20, total: res.data.length, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when any debounced/direct criteria or page changes
  useEffect(() => {
    fetchCustomers(debouncedSearch, debouncedMinAssets, debouncedMinTx, sortBy, page);
  }, [debouncedSearch, debouncedMinAssets, debouncedMinTx, sortBy, page]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedMinAssets, debouncedMinTx, sortBy]);

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const hasActiveFilters = !!(minAssets || minTx || search || sortBy !== "join_desc");
  const activeFilterCount = [
    minAssets,
    minTx,
    search,
    sortBy !== "join_desc" ? "sort" : ""
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearch("");
    setMinAssets("");
    setMinTx("");
    setSortBy("join_desc");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
            Daftar Customer
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            Semua pengguna aplikasi mobile yang mendaftar dan mengklaim produk.
          </p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text" placeholder="Cari nama display, alamat wallet..." value={search}
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

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              height: "38px", padding: "0 14px",
              background: showFilters || hasActiveFilters ? "var(--accent)" : "var(--card)",
              color: showFilters || hasActiveFilters ? "var(--primary)" : "var(--foreground)",
              border: `1px solid ${showFilters || hasActiveFilters ? "var(--primary)" : "var(--border)"}`,
              borderRadius: "calc(var(--radius) - 2px)",
              fontSize: "13px", fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
              transition: "all 0.15s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter & Urutkan
            {hasActiveFilters && (
              <span style={{
                background: "var(--primary)", color: "var(--primary-foreground)",
                borderRadius: "50%", width: "16px", height: "16px", fontSize: "10px",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
              }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                height: "38px", padding: "0 12px",
                background: "transparent", color: "var(--muted-foreground)",
                border: "none", fontSize: "13px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--destructive)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted-foreground)"}
            >
              Reset
            </button>
          )}
        </div>

        {/* Collapsible advanced filters grid with glassmorphism style */}
        {showFilters && (
          <div className="animate-fade-in" style={{
            background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px", marginTop: "4px"
          }}>
            {/* Min Assets */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>MIN TOTAL ASET (PRODUK)</label>
              <input
                type="number" placeholder="Batas minimal aset" value={minAssets}
                onChange={(e) => setMinAssets(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              />
            </div>

            {/* Min Tx */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>MIN TRANSAKSI</label>
              <input
                type="number" placeholder="Batas minimal transaksi" value={minTx}
                onChange={(e) => setMinTx(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              />
            </div>

            {/* Sort By */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>URUTKAN BERDASARKAN</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              >
                <option value="join_desc">Tanggal Bergabung (Terbaru)</option>
                <option value="assets_desc">Aset Terbanyak</option>
                <option value="assets_asc">Aset Tersedikit</option>
                <option value="tx_desc">Transaksi Terbanyak</option>
                <option value="tx_asc">Transaksi Tersedikit</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
            Loading data...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
            Belum ada customer yang terdaftar.
          </div>
        ) : (
          <div className="table-responsive-container" style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px", minWidth: "600px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
                  <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>WALLET</th>
                  <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>NAMA</th>
                  <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>TOTAL ASET</th>
                  <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>TOTAL TX</th>
                  <th style={{ padding: "16px 20px", fontWeight: 500, color: "var(--muted-foreground)" }}>BERGABUNG</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.wallet_address} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--sidebar-accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", fontWeight: 600, fontSize: "12px" }}>
                          {c.wallet_address.substring(2, 4).toUpperCase()}
                        </div>
                        <CopyableText 
                          text={c.wallet_address} 
                          truncateText={truncateAddress(c.wallet_address)} 
                          style={{ color: "var(--foreground)" }} 
                        />
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--foreground)" }}>{c.nama_display || "-"}</td>
                    <td style={{ padding: "16px 20px", color: "var(--foreground)", fontWeight: 500 }}>
                      <span style={{ background: "var(--lc-success-bg)", color: "var(--lc-success)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
                        {c.active_items} Produk
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--foreground)", fontWeight: 500 }}>
                      <span style={{ background: "var(--lc-info-bg)", color: "var(--lc-info)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" }}>
                        {c.total_tx} Tx
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px", color: "var(--muted-foreground)", fontSize: "13px" }}>
                      {formatDate(c.join_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
