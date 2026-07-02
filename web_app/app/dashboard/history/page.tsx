"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { getSystemLogs } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

interface LogEntry {
  id: number;
  action: string;
  detail: Record<string, string | number | null | undefined>;
  created_at: string;
}

const actionOptions = ["All", "MINT", "MINT_RETRY", "CLAIM", "TRANSFER"];

const actionColors: Record<string, { bg: string; fg: string }> = {
  MINT: { bg: "var(--lc-success-bg)", fg: "var(--lc-success)" },
  MINT_RETRY: { bg: "var(--lc-warning-bg)", fg: "var(--lc-warning)" },
  CLAIM: { bg: "var(--lc-info-bg)", fg: "var(--lc-info)" },
  TRANSFER: { bg: "rgba(200,169,110,0.1)", fg: "var(--primary)" },
};

const actionIcons: Record<string, React.ReactNode> = {
  MINT: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lc-success)" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  MINT_RETRY: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lc-warning)" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
  CLAIM: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lc-info)" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  TRANSFER: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
      <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const fetchLogs = useCallback(async (action?: string, searchTerm?: string, page?: number) => {
    setLoading(true);
    try {
      const res = await getSystemLogs({
        action: action === "All" ? undefined : action,
        search: searchTerm,
        page: page || 1,
        limit: 50,
      });
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch system logs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(actionFilter, search, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, actionFilter, fetchLogs]);

  const truncate = (str: string | null | undefined, len: number = 16) => {
    if (!str) return null;
    if (str.length <= len) return str;
    return str.substring(0, 8) + "..." + str.substring(str.length - 6);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>
          System History / Log
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          {pagination.total} aktivitas — Kronologi sistem dan konfirmasi blockchain
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {/* Search input */}
        <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "320px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2"
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="Cari UUID, Tx Hash, Wallet..." value={search}
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

        {/* Action filter */}
        <div style={{ display: "flex", gap: "2px", background: "var(--muted)", borderRadius: "calc(var(--radius) - 2px)", padding: "3px" }}>
          {actionOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setActionFilter(opt)}
              style={{
                padding: "5px 14px", fontSize: "12px", fontWeight: 500,
                borderRadius: "calc(var(--radius) - 4px)", border: "none",
                background: actionFilter === opt ? "var(--background)" : "transparent",
                color: actionFilter === opt ? "var(--foreground)" : "var(--muted-foreground)",
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: actionFilter === opt ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading system logs...
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted-foreground)" }}>
          <p style={{ fontSize: "14px" }}>Belum ada aktivitas tercatat</p>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: "28px" }}>
          {/* Line */}
          <div
            style={{
              position: "absolute", left: "9px", top: "8px", bottom: "8px",
              width: "2px", background: "var(--border)", borderRadius: "1px",
            }}
          />

          <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {logs.map((log) => {
              const colors = actionColors[log.action] || { bg: "var(--muted)", fg: "var(--muted-foreground)" };
              const icon = actionIcons[log.action];

              return (
                <div key={log.id} style={{ position: "relative" }}>
                  {/* Dot */}
                  <div
                    style={{
                      position: "absolute", left: "-24px", top: "20px",
                      width: "10px", height: "10px", borderRadius: "50%",
                      background: colors.fg,
                      border: "2px solid var(--background)",
                    }}
                  />

                  {/* Card */}
                  <div
                    style={{
                      background: "var(--card)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius)", padding: "16px 20px",
                      transition: "box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "28px", height: "28px", borderRadius: "calc(var(--radius) - 4px)",
                            background: colors.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {icon || (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "12px",
                              background: colors.bg, color: colors.fg, letterSpacing: "0.5px",
                            }}
                          >
                            {log.action}
                          </span>
                        </div>
                        {log.detail.admin && (
                          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                            by {log.detail.admin}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontFamily: "var(--font-roboto-mono), monospace" }}>
                          {formatTime(log.created_at)}
                        </span>
                        <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "1px" }}>
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ background: "var(--muted)", borderRadius: "calc(var(--radius) - 2px)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {Object.entries(log.detail)
                        .filter(([key, val]) => val !== null && val !== undefined && key !== "admin")
                        .map(([key, val]) => {
                          const value = String(val);
                          const isHash = key.includes("hash") || key.includes("tx_");
                          const isId = key.includes("id_");
                          const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

                          return (
                            <div key={key} style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "12px" }}>
                              <span style={{ color: "var(--muted-foreground)", fontWeight: 500, minWidth: "90px" }}>
                                {label}:
                              </span>
                              <CopyableText
                                text={value}
                                truncateText={value.length > 24 ? truncate(value, 24)! : value}
                                style={{
                                  color: isHash ? "var(--lc-success)" : "var(--foreground)",
                                  fontSize: "11px",
                                }}
                                link={value.startsWith("0x") && value.length === 66 ? `https://sepolia.etherscan.io/tx/${value}` : undefined}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchLogs(actionFilter, search, pagination.page - 1)}
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
            onClick={() => fetchLogs(actionFilter, search, pagination.page + 1)}
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
