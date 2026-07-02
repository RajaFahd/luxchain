"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, getAdmin, clearToken, updateWallet, setAdmin } from "@/lib/api";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/dashboard/products",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    label: "Product Items",
    href: "/dashboard/product-items",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
    ),
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    label: "History",
    href: "/dashboard/history",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [adminData, setAdminData] = useState<{ email: string; wallet_address: string } | null>(null);

  // Auth guard
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/");
      return;
    }
    const admin = getAdmin();
    setAdminData(admin);
    setIsAuthed(true);
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem("luxchain-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("luxchain-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("luxchain-theme", "light");
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace("/");
  };

  // ─── Wallet connect state ───
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");

  // Check if wallet was already connected (from admin data)
  useEffect(() => {
    if (adminData?.wallet_address && adminData.wallet_address !== "0x0000000000000000000000000000000000000000") {
      setWalletAddress(adminData.wallet_address);
    }
  }, [adminData]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
      } else if (walletAddress && accounts[0].toLowerCase() !== walletAddress.toLowerCase()) {
        // Account switched — update
        const newAddress = accounts[0];
        try {
          const message = `Luxchain Admin Wallet Verification: ${newAddress}`;
          const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          
          const signature = await eth.request({
            method: "personal_sign",
            params: [hexMessage, newAddress],
          });

          setWalletAddress(newAddress);
          const res = await updateWallet(newAddress, signature);
          if (res.success) {
            const admin = getAdmin();
            if (admin) {
              setAdmin({ ...admin, wallet_address: newAddress });
              setAdminData({ ...admin, wallet_address: newAddress });
            }
          } else {
            // Revert on backend failure
            setWalletAddress(null);
            await updateWallet("0x0000000000000000000000000000000000000000");
            const admin = getAdmin();
            if (admin) {
              setAdmin({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
              setAdminData({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
            }
          }
        } catch (err) {
          console.error("Gagal verifikasi ganti akun MetaMask:", err);
          // Disconnect wallet securely on error/rejection
          setWalletAddress(null);
          await updateWallet("0x0000000000000000000000000000000000000000");
          const admin = getAdmin();
          if (admin) {
            setAdmin({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
            setAdminData({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
          }
        }
      }
    };

    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener("accountsChanged", handleAccountsChanged);
  }, [walletAddress]);

  const connectWallet = useCallback(async () => {
    setWalletError("");
    setWalletConnecting(true);

    try {
      if (!(window as any).ethereum) {
        setWalletError("MetaMask belum terinstall");
        setWalletConnecting(false);
        return;
      }

      const eth = (window as any).ethereum;
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });

      if (accounts.length === 0) {
        setWalletError("Tidak ada akun yang dipilih");
        setWalletConnecting(false);
        return;
      }

      const address = accounts[0];

      // Request cryptographic signature to verify ownership
      const message = `Luxchain Admin Wallet Verification: ${address}`;
      const hexMessage = "0x" + Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const signature = await eth.request({
        method: "personal_sign",
        params: [hexMessage, address],
      });

      setWalletAddress(address);

      // Save to backend
      const res = await updateWallet(address, signature);
      if (res.success) {
        const admin = getAdmin();
        if (admin) {
          setAdmin({ ...admin, wallet_address: address });
          setAdminData({ ...admin, wallet_address: address });
        }
      } else {
        setWalletError(res.message || "Verifikasi wallet gagal");
        setWalletAddress(null);
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setWalletError("Tanda tangan ditolak atau koneksi dibatalkan");
      } else {
        setWalletError(err.message || "Gagal menghubungkan wallet");
      }
      setWalletAddress(null);
    } finally {
      setWalletConnecting(false);
    }
  }, []);

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletError("");
    // Clear from backend
    updateWallet("0x0000000000000000000000000000000000000000").then((res) => {
      if (res.success) {
        const admin = getAdmin();
        if (admin) {
          setAdmin({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
          setAdminData({ ...admin, wallet_address: "0x0000000000000000000000000000000000000000" });
        }
      }
    });
  };

  const truncateAddress = (addr: string) =>
    addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);

  if (!isAuthed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? "64px" : "240px",
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "20px 12px" : "20px 16px",
            borderBottom: "1px solid var(--sidebar-border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minHeight: "64px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "calc(var(--radius) - 2px)",
              background: "var(--sidebar-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sidebar-primary-foreground)" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          {!collapsed && (
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--sidebar-foreground)",
                letterSpacing: "1px",
              }}
            >
              LUXCHAIN
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: collapsed ? "10px 12px" : "9px 12px",
                    borderRadius: "calc(var(--radius) - 2px)",
                    border: "none",
                    background: active ? "var(--sidebar-accent)" : "transparent",
                    color: active ? "var(--sidebar-foreground)" : "var(--muted-foreground)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontSize: "13px",
                    fontWeight: active ? 500 : 400,
                    width: "100%",
                    textAlign: "left",
                    justifyContent: collapsed ? "center" : "flex-start",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--sidebar-accent)";
                      e.currentTarget.style.color = "var(--sidebar-accent-foreground)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted-foreground)";
                    }
                  }}
                >
                  {item.icon}
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Collapse btn */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--sidebar-border)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: "10px",
              padding: "9px 12px",
              width: "100%",
              border: "none",
              borderRadius: "calc(var(--radius) - 2px)",
              background: "transparent",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--sidebar-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          marginLeft: collapsed ? "64px" : "240px",
          transition: "margin-left 0.2s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: "56px",
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "calc(var(--radius) - 2px)",
                border: "1px solid var(--border)",
                background: "var(--background)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                color: "var(--muted-foreground)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.color = "var(--foreground)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--background)";
                e.currentTarget.style.color = "var(--muted-foreground)";
              }}
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Connect Wallet */}
            {walletAddress ? (
              <div style={{ position: "relative" }}>
                <button
                  onClick={disconnectWallet}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 12px",
                    borderRadius: "calc(var(--radius) - 2px)",
                    border: "1px solid var(--lc-success)",
                    background: "var(--lc-success-bg)",
                    color: "var(--lc-success)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "var(--font-roboto-mono), monospace",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(224,92,92,0.08)";
                    e.currentTarget.style.borderColor = "var(--destructive)";
                    e.currentTarget.style.color = "var(--destructive)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--lc-success-bg)";
                    e.currentTarget.style.borderColor = "var(--lc-success)";
                    e.currentTarget.style.color = "var(--lc-success)";
                  }}
                  title={`Connected: ${walletAddress}\nClick to disconnect`}
                >
                  {/* MetaMask fox icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                  {truncateAddress(walletAddress)}
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={walletConnecting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--muted-foreground)",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: walletConnecting ? "wait" : "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!walletConnecting) {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.color = "var(--primary)";
                    e.currentTarget.style.background = "rgba(200,169,110,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--muted-foreground)";
                  e.currentTarget.style.background = "transparent";
                }}
                title={walletError || "Connect MetaMask wallet"}
              >
                {walletConnecting ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                  </svg>
                )}
                {walletConnecting ? "Connecting..." : walletError || "Connect Wallet"}
              </button>
            )}

            {/* Divider */}
            <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

            {/* Avatar + Logout */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--primary-foreground)",
                }}
              >
                {adminData?.email?.charAt(0).toUpperCase() || "A"}
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", lineHeight: 1.3 }}>
                  {adminData?.email?.split("@")[0] || "Admin"}
                </p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Admin
                </p>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  marginLeft: "4px",
                  width: "30px",
                  height: "30px",
                  borderRadius: "calc(var(--radius) - 2px)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--muted-foreground)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(224,92,92,0.08)";
                  e.currentTarget.style.color = "var(--destructive)";
                  e.currentTarget.style.borderColor = "var(--destructive)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--muted-foreground)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
                title="Logout"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
