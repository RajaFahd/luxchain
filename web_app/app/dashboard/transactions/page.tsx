"use client";

import { useState, useEffect, useCallback } from "react";
import { getTransactions } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

interface Transaction {
  id_kepemilikan: number;
  id_item: string;
  wallet_address: string;
  tanggal_klaim: string;
  status_kepemilikan: string;
  tx_hash: string | null;
  created_at: string;
  hash_blockchain: string;
  item_status: string;
  nama_produk: string;
  tipe_artikel: string;
  nama_display: string | null;
}

const filterOptions = ["All", "active", "transferred"];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchTransactions = useCallback(async (searchTerm?: string, type?: string, page?: number) => {
    setLoading(true);
    try {
      const res = await getTransactions({
        search: searchTerm,
        type: type === "All" ? undefined : type,
        page: page || 1,
        limit: 20,
      });
      if (res.success) {
        setTransactions(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions(search, typeFilter, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, typeFilter, fetchTransactions]);

  const truncate = (str: string, len: number = 10) => {
    if (!str) return "—";
    if (str.length <= len) return str;
    return str.substring(0, 6) + "..." + str.substring(str.length - 4);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Data Transaksi</h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          {pagination.total} riwayat transaksi kepemilikan
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "320px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Cari item, wallet, produk..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", height: "38px", padding: "0 12px 0 36px",
              background: "var(--input-background)", border: "1px solid var(--border)",
              borderRadius: "calc(var(--radius) - 2px)", color: "var(--foreground)",
              fontSize: "13px", outline: "none", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--ring)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: "2px", background: "var(--muted)", borderRadius: "calc(var(--radius) - 2px)", padding: "3px" }}>
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setTypeFilter(opt)}
              style={{
                padding: "5px 14px", fontSize: "12px", fontWeight: 500,
                borderRadius: "calc(var(--radius) - 4px)", border: "none",
                background: typeFilter === opt ? "var(--background)" : "transparent",
                color: typeFilter === opt ? "var(--foreground)" : "var(--muted-foreground)",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: typeFilter === opt ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                textTransform: "capitalize",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Item ID", "Wallet", "Produk", "Blockchain Hash", "TxHash", "Status", "Tanggal"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 18px", textAlign: "left", fontSize: "11px", fontWeight: 500,
                    color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px",
                    borderBottom: "1px solid var(--border)", background: "var(--muted)", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Loading transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center" }}>
                    <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Tidak ada transaksi ditemukan</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, i) => (
                  <tr
                    key={tx.id_kepemilikan || i}
                    style={{ borderBottom: i < transactions.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 18px", color: "var(--foreground)" }}>
                      <CopyableText text={tx.id_item} truncateText={truncate(tx.id_item, 16)} />
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <div>
                        <CopyableText text={tx.wallet_address} truncateText={truncate(tx.wallet_address)} style={{ color: "var(--muted-foreground)" }} />
                        {tx.nama_display && (
                          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>{tx.nama_display}</p>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <p style={{ fontWeight: 500, color: "var(--foreground)", marginBottom: "2px" }}>{tx.nama_produk}</p>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{tx.tipe_artikel}</p>
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <CopyableText text={tx.hash_blockchain} truncateText={truncate(tx.hash_blockchain, 20)} style={{ color: "var(--muted-foreground)" }} />
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      {tx.tx_hash ? (
                        <CopyableText 
                          text={tx.tx_hash} 
                          truncateText={truncate(tx.tx_hash, 16)} 
                          style={{ color: "var(--muted-foreground)" }} 
                          link={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`} 
                        />
                      ) : (
                        <span style={{ color: "var(--muted-foreground)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 18px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "20px", textTransform: "capitalize",
                        background: tx.status_kepemilikan === "active" ? "var(--lc-success-bg)" : "var(--lc-info-bg)",
                        color: tx.status_kepemilikan === "active" ? "var(--lc-success)" : "var(--lc-info)",
                      }}>
                        {tx.status_kepemilikan}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {tx.tanggal_klaim ? new Date(tx.tanggal_klaim).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchTransactions(search, typeFilter, pagination.page - 1)}
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
            onClick={() => fetchTransactions(search, typeFilter, pagination.page + 1)}
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
