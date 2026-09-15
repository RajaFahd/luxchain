"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProducts, getTransactions } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

interface StatsData {
  totalProducts: number;
  mintedItems: number;
  totalTransactions: number;
  pendingItems: number;
}

interface RecentTx {
  id_kepemilikan: number;
  id_item: string;
  wallet_address: string;
  tanggal_klaim: string;
  status_kepemilikan: string;
  nama_produk?: string;
  tipe_artikel?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData>({
    totalProducts: 0,
    mintedItems: 0,
    totalTransactions: 0,
    pendingItems: 0,
  });
  const [recentTx, setRecentTx] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [productsRes, txRes] = await Promise.all([
          getProducts({ limit: 100 }),
          getTransactions({ limit: 5 }),
        ]);

        if (productsRes.success) {
          let minted = 0;
          let pending = 0;
          for (const p of productsRes.data) {
            minted += Number(p.minted_items) || 0;
            pending += (Number(p.total_items) || 0) - (Number(p.minted_items) || 0) - (Number(p.sold_items) || 0);
          }
          setStats({
            totalProducts: productsRes.pagination?.total || productsRes.data.length,
            mintedItems: minted,
            totalTransactions: txRes.pagination?.total || 0,
            pendingItems: Math.max(0, pending),
          });
        }

        if (txRes.success) {
          setRecentTx(txRes.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: "Total Produk",
      value: stats.totalProducts,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      label: "Minted Items",
      value: stats.mintedItems,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: "Transaksi",
      value: stats.totalTransactions,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      ),
    },
    {
      label: "Pending",
      value: stats.pendingItems,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          Overview sistem Luxchain
        </p>
      </div>

      {/* Stats */}
      <div
        className="stagger-children"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {statCards.map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "20px",
              transition: "box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              {s.icon}
            </div>
            <p style={{ fontSize: "26px", fontWeight: 700, color: "var(--foreground)", lineHeight: 1, marginBottom: "4px" }}>
              {loading ? "—" : s.value}
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>
            Transaksi Terbaru
          </h2>
          <span
            onClick={() => router.push("/dashboard/transactions")}
            style={{ fontSize: "12px", color: "var(--muted-foreground)", cursor: "pointer" }}
          >
            Lihat Semua →
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "600px" }}>
            <thead>
              <tr>
                {["Item ID", "Wallet", "Produk", "Status", "Tanggal"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 20px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                    Loading...
                  </td>
                </tr>
              ) : recentTx.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)" }}>
                    Belum ada transaksi
                  </td>
                </tr>
              ) : (
                recentTx.map((tx, i) => (
                  <tr
                    key={tx.id_kepemilikan || i}
                    style={{
                      borderBottom: i < recentTx.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "12px 20px", color: "var(--foreground)" }}>
                      <CopyableText text={tx.id_item} truncateText={tx.id_item?.substring(0, 8) + "..."} />
                    </td>
                    <td style={{ padding: "12px 20px", color: "var(--muted-foreground)" }}>
                      <CopyableText text={tx.wallet_address} truncateText={tx.wallet_address ? `${tx.wallet_address.substring(0, 6)}...${tx.wallet_address.substring(38)}` : "—"} />
                    </td>
                    <td style={{ padding: "12px 20px", color: "var(--foreground)", fontWeight: 500 }}>
                      {tx.nama_produk || "—"}
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          padding: "3px 10px",
                          borderRadius: "20px",
                          textTransform: "capitalize",
                          background: tx.status_kepemilikan === "active" ? "var(--lc-success-bg)" : "var(--lc-info-bg)",
                          color: tx.status_kepemilikan === "active" ? "var(--lc-success)" : "var(--lc-info)",
                        }}
                      >
                        {tx.status_kepemilikan}
                      </span>
                    </td>
                    <td style={{ padding: "12px 20px", color: "var(--muted-foreground)", fontSize: "12px" }}>
                      {tx.tanggal_klaim ? new Date(tx.tanggal_klaim).toLocaleDateString("id-ID") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
