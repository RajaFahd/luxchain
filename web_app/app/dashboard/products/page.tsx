"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProducts, deleteProduct, getCategories, getSubCategories, getMediaUrl } from "@/lib/api";
import CopyableText from "@/components/CopyableText";

interface Product {
  id_produk: number;
  nama_produk: string;
  harga: number;
  warna: string;
  tipe_artikel: string;
  tanggal_produksi: string;
  gambar_url: string | null;
  nama_kategori: string;
  nama_sub_kategori: string;
  admin_email: string;
  total_items: number;
  minted_items: number;
  sold_items: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Filter states
  const [categories, setCategories] = useState<{ id_kategori: number; nama_kategori: string }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id_sub_kategori: number; nama_sub_kategori: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [warna, setWarna] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setViewMode("table");
    }
  }, []);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: "confirm" | "success" | "error";
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    isProcessing?: boolean;
  }>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });

  // Debounced input states
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedMinPrice, setDebouncedMinPrice] = useState("");
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState("");
  const [debouncedWarna, setDebouncedWarna] = useState("");

  // Load categories list on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await getCategories();
        if (res.success) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  // Load sub-categories dynamically when category selection changes
  useEffect(() => {
    async function loadSubCategories() {
      if (!selectedCategory) {
        setSubCategories([]);
        setSelectedSubCategory("");
        return;
      }
      try {
        const res = await getSubCategories(selectedCategory);
        if (res.success) {
          setSubCategories(res.data);
        }
      } catch (err) {
        console.error("Failed to load subcategories:", err);
      }
      setSelectedSubCategory("");
    }
    loadSubCategories();
  }, [selectedCategory]);

  // Handle debouncing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinPrice(minPrice), 300);
    return () => clearTimeout(timer);
  }, [minPrice]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMaxPrice(maxPrice), 300);
    return () => clearTimeout(timer);
  }, [maxPrice]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWarna(warna), 300);
    return () => clearTimeout(timer);
  }, [warna]);

  // Fetch function based on current active filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        search: debouncedSearch,
        kategori: selectedCategory,
        sub_kategori: selectedSubCategory,
        min_harga: debouncedMinPrice,
        max_harga: debouncedMaxPrice,
        warna: debouncedWarna,
        status: status,
        page: page,
        limit: 20
      });
      if (res.success) {
        setProducts(res.data);
        setPagination(res.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedSubCategory, debouncedMinPrice, debouncedMaxPrice, debouncedWarna, status, page]);

  // Trigger load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, selectedSubCategory, debouncedMinPrice, debouncedMaxPrice, debouncedWarna, status]);

  const handleDelete = (id: number, name: string, totalCount: number, mintedCount: number, soldCount: number) => {
    const pending = totalCount - mintedCount - soldCount;
    const hasMintedOrSold = mintedCount > 0 || soldCount > 0;

    if (pending === 0) {
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Tidak Dapat Dihapus",
        message: `Produk "${name}" tidak dapat dihapus karena seluruh item (${totalCount} item) telah ter-mint secara permanen di blockchain Sepolia. Penghapusan dibatalkan demi menjaga integritas data smart contract.`,
      });
      return;
    }

    if (hasMintedOrSold) {
      // Partially minted/sold, can only delete pending items
      setAlertModal({
        isOpen: true,
        type: "confirm",
        title: "Hapus Item Pending",
        message: `Produk "${name}" tidak dapat dihapus sepenuhnya karena sudah memiliki ${mintedCount + soldCount} item yang ter-mint secara permanen di blockchain. Namun, Anda dapat menghapus ${pending} item yang masih pending dari database. Apakah Anda ingin menghapus item pending tersebut?`,
        confirmLabel: "Hapus Item Pending",
        cancelLabel: "Batal",
        onConfirm: async () => {
          try {
            const res = await deleteProduct(id, true); // Pass true to only delete pending
            if (res.success) {
              fetchProducts();
              setAlertModal({
                isOpen: true,
                type: "success",
                title: "Berhasil Dihapus",
                message: `${pending} item pending dari produk "${name}" telah berhasil dihapus. Produk master tetap dipertahankan karena memiliki item blockchain aktif.`,
              });
            } else {
              setAlertModal({
                isOpen: true,
                type: "error",
                title: "Gagal Menghapus",
                message: res.message || "Gagal menghapus item pending dari sistem.",
              });
            }
          } catch {
            setAlertModal({
              isOpen: true,
              type: "error",
              title: "Gagal Menghapus",
              message: "Terjadi kesalahan jaringan atau server saat menghapus item pending.",
            });
          }
        }
      });
      return;
    }

    // Fully pending, can delete the whole product
    setAlertModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Produk",
      message: `Apakah Anda yakin ingin menghapus produk "${name}" beserta seluruh ${pending} item yang masih pending? Tindakan ini bersifat permanen.`,
      confirmLabel: "Hapus Produk",
      cancelLabel: "Batal",
      onConfirm: async () => {
        try {
          const res = await deleteProduct(id); // Deletes whole product
          if (res.success) {
            fetchProducts();
            setAlertModal({
              isOpen: true,
              type: "success",
              title: "Berhasil Dihapus",
              message: `Produk "${name}" telah berhasil dihapus dari sistem beserta seluruh item pending-nya.`,
            });
          } else {
            setAlertModal({
              isOpen: true,
              type: "error",
              title: "Gagal Menghapus",
              message: res.message || "Gagal menghapus produk dari sistem.",
            });
          }
        } catch {
          setAlertModal({
            isOpen: true,
            type: "error",
            title: "Gagal Menghapus",
            message: "Terjadi kesalahan jaringan atau server saat menghapus produk.",
          });
        }
      }
    });
  };

  const getItemStatus = (p: Product) => {
    if (p.sold_items > 0) return "sold";
    if (p.minted_items > 0) return "minted";
    return "pending";
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case "minted": return { background: "var(--lc-success-bg)", color: "var(--lc-success)" };
      case "pending": return { background: "var(--lc-warning-bg)", color: "var(--lc-warning)" };
      case "sold": return { background: "var(--lc-info-bg)", color: "var(--lc-info)" };
      default: return { background: "var(--muted)", color: "var(--muted-foreground)" };
    }
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:3001";

  const hasActiveFilters = !!(selectedCategory || selectedSubCategory || minPrice || maxPrice || warna || status || search);
  const activeFilterCount = [
    selectedCategory,
    selectedSubCategory,
    minPrice,
    maxPrice,
    warna,
    status,
    search
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedSubCategory("");
    setMinPrice("");
    setMaxPrice("");
    setWarna("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: "4px" }}>Daftar Produk</h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            {pagination.total} produk terdaftar
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/products/new")}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 16px",
            background: "var(--primary)", color: "var(--primary-foreground)",
            border: "none", borderRadius: "calc(var(--radius) - 2px)",
            fontSize: "13px", fontWeight: 500, cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Produk Baru
        </button>
      </div>

      {/* Search & Filter Panel */}
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
              type="text" placeholder="Cari nama, tipe artikel, warna, kategori..." value={search}
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
            Filter
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
          {/* View Mode Toggle */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)", padding: "2px", height: "38px" }}>
            <button
              onClick={() => setViewMode("cards")}
              title="Tampilan Kartu (Mobile Friendly)"
              style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", height: "100%",
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
                display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", height: "100%",
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

        {/* Collapsible advanced filters grid with glassmorphism style */}
        {showFilters && (
          <div className="animate-fade-in" style={{
            background: "var(--card)",
            border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px", marginTop: "4px"
          }}>
            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>KATEGORI</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id_kategori} value={c.id_kategori}>{c.nama_kategori}</option>
                ))}
              </select>
            </div>

            {/* Sub-Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>SUB-KATEGORI</label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                disabled={!selectedCategory}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none",
                  opacity: selectedCategory ? 1 : 0.5, cursor: selectedCategory ? "pointer" : "not-allowed"
                }}
              >
                <option value="">Semua Sub-Kategori</option>
                {subCategories.map((sc) => (
                  <option key={sc.id_sub_kategori} value={sc.id_sub_kategori}>{sc.nama_sub_kategori}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>STATUS MINT</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="minted">Minted</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            {/* Warna */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>WARNA</label>
              <input
                type="text" placeholder="Misal: Black, Gold" value={warna}
                onChange={(e) => setWarna(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              />
            </div>

            {/* Min Price */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>HARGA MIN (RP)</label>
              <input
                type="number" placeholder="0" value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              />
            </div>

            {/* Max Price */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>HARGA MAX (RP)</label>
              <input
                type="number" placeholder="Maksimal" value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                style={{
                  height: "36px", padding: "0 10px", background: "var(--input-background)",
                  border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 4px)",
                  color: "var(--foreground)", fontSize: "12px", outline: "none"
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Products Content: Card View or Table View */}
      {viewMode === "cards" ? (
        loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading produk...
          </div>
        ) : products.length === 0 ? (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {products.map((p) => {
              const status = getItemStatus(p);
              const pending = p.total_items - p.minted_items - p.sold_items;
              return (
                <div
                  key={p.id_produk}
                  className="animate-fade-in"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Top: Image & Title */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {p.gambar_url ? (
                      <img
                        src={getMediaUrl(p.gambar_url)}
                        alt={p.nama_produk}
                        style={{ width: "56px", height: "56px", borderRadius: "calc(var(--radius) - 2px)", objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "calc(var(--radius) - 2px)",
                        background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.nama_produk}
                        </h3>
                        <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "12px", textTransform: "capitalize", flexShrink: 0, ...statusStyle(status) }}>
                          {status}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                        {p.tipe_artikel} • {p.nama_kategori}
                      </p>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--primary)", margin: "4px 0 0" }}>
                        Rp {Number(p.harga).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>

                  {/* Specs Pill */}
                  <div style={{
                    background: "var(--input-background)",
                    borderRadius: "calc(var(--radius) - 4px)",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                  }}>
                    <div>
                      <span style={{ color: "var(--muted-foreground)" }}>Warna: </span>
                      <strong style={{ color: "var(--foreground)", textTransform: "capitalize" }}>{p.warna || "-"}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Items: </span>
                      <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{p.total_items}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>/</span>
                      <span style={{ fontWeight: 600, color: pending > 0 ? "var(--lc-warning)" : "var(--muted-foreground)" }}>
                        {pending} pnd
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "4px" }}>
                    {pending > 0 && (
                      <button
                        onClick={() => router.push(`/dashboard/nfc-queue?id_produk=${p.id_produk}`)}
                        style={{
                          flex: 1,
                          padding: "7px 10px",
                          background: "var(--accent)",
                          color: "var(--primary)",
                          border: "1px solid var(--primary)",
                          borderRadius: "calc(var(--radius) - 4px)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                        Antrean NFC ({pending})
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/dashboard/product-items?search=${encodeURIComponent(p.nama_produk)}`)}
                      style={{
                        flex: pending > 0 ? undefined : 1,
                        padding: "7px 10px",
                        background: "var(--secondary)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border)",
                        borderRadius: "calc(var(--radius) - 4px)",
                        fontSize: "12px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      Unit Fisik
                    </button>
                    <button
                      onClick={() => handleDelete(p.id_produk, p.nama_produk, p.total_items, p.minted_items, p.sold_items)}
                      style={{
                        padding: "7px 10px",
                        background: "transparent",
                        color: "var(--destructive)",
                        border: "1px solid var(--border)",
                        borderRadius: "calc(var(--radius) - 4px)",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                      title="Hapus Produk"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Table View */
        <div>
          <div className="show-on-mobile" style={{ alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /><polyline points="19 18 13 12 19 6" /></svg>
            <span>Geser tabel ke samping ↔ untuk melihat kolom lainnya</span>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            <div className="table-responsive-container">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "750px" }}>
                <thead>
                  <tr>
                    {["Image", "Artikel", "Nama Produk", "Warna", "Harga", "Items", "Status", "Action"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 18px", textAlign: "left", fontSize: "11px", fontWeight: 500,
                        color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px",
                        borderBottom: "1px solid var(--border)", background: "var(--muted)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted-foreground)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Loading produk...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center" }}>
                        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Tidak ada produk ditemukan</p>
                      </td>
                    </tr>
                  ) : (
                    products.map((p, i) => {
                      const status = getItemStatus(p);
                      return (
                        <tr
                          key={p.id_produk}
                          style={{ borderBottom: i < products.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.1s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ padding: "10px 18px" }}>
                            {p.gambar_url ? (
                              <img
                                src={getMediaUrl(p.gambar_url)}
                                alt={p.nama_produk}
                                style={{ width: "36px", height: "36px", borderRadius: "calc(var(--radius) - 4px)", objectFit: "cover" }}
                              />
                            ) : (
                              <div style={{
                                width: "36px", height: "36px", borderRadius: "calc(var(--radius) - 4px)",
                                background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "10px 18px", color: "var(--muted-foreground)" }}>
                            <CopyableText text={p.tipe_artikel} />
                          </td>
                          <td style={{ padding: "10px 18px" }}>
                            <p style={{ fontWeight: 500, color: "var(--foreground)", marginBottom: "2px" }}>{p.nama_produk}</p>
                            <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{p.nama_kategori} / {p.nama_sub_kategori}</p>
                          </td>
                          <td style={{ padding: "10px 18px", color: "var(--foreground)", textTransform: "capitalize" }}>
                            {p.warna}
                          </td>
                          <td style={{ padding: "10px 18px", color: "var(--foreground)", fontSize: "12px" }}>
                            Rp {Number(p.harga).toLocaleString("id-ID")}
                          </td>
                          <td style={{ padding: "10px 18px", fontSize: "12px" }}>
                            {(() => {
                              const pending = p.total_items - p.minted_items - p.sold_items;
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <p style={{ color: "var(--foreground)", fontWeight: 500, margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span>{p.total_items}</span>
                                    <span style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>/</span>
                                    <span style={{ color: pending > 0 ? "var(--lc-warning)" : "var(--muted-foreground)", fontWeight: pending > 0 ? 600 : 500 }}>
                                      {pending}
                                    </span>
                                    {pending > 0 && (
                                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--lc-warning)", marginLeft: "2px" }} />
                                    )}
                                  </p>
                                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Total / Pending
                                  </p>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "10px 18px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 500, padding: "3px 10px", borderRadius: "20px", textTransform: "capitalize", ...statusStyle(status) }}>
                              {status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                onClick={() => handleDelete(p.id_produk, p.nama_produk, p.total_items, p.minted_items, p.sold_items)}
                                style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "calc(var(--radius) - 4px)", border: "1px solid var(--border)", background: "transparent", cursor: "pointer", color: "var(--muted-foreground)", transition: "all 0.15s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--destructive)"; e.currentTarget.style.color = "var(--destructive)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted-foreground)"; }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(10, 10, 15, 0.65)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
        }} className="animate-fade-in">
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            width: "100%",
            maxWidth: "400px",
            padding: "28px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center"
          }} className="animate-fade-in-up">
            
            {/* Animated Icon Container based on Alert Type */}
            <div style={{
              width: "56px", height: "56px",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px",
              background: alertModal.type === "confirm" ? "rgba(224, 92, 92, 0.08)" : alertModal.type === "success" ? "var(--lc-success-bg)" : "rgba(224, 92, 92, 0.08)",
              color: alertModal.type === "confirm" ? "var(--destructive)" : alertModal.type === "success" ? "var(--lc-success)" : "var(--destructive)"
            }}>
              {alertModal.type === "confirm" && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              )}
              {alertModal.type === "success" && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {alertModal.type === "error" && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>

            {/* Title & Message */}
            <h3 style={{
              fontSize: "18px", fontWeight: 600, color: "var(--foreground)",
              marginBottom: "8px", fontFamily: "var(--font-sans)"
            }}>{alertModal.title}</h3>
            <p style={{
              fontSize: "13px", color: "var(--muted-foreground)",
              lineHeight: "1.5", marginBottom: "28px"
            }}>{alertModal.message}</p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              {alertModal.type === "confirm" ? (
                <>
                  <button
                    disabled={alertModal.isProcessing}
                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    style={{
                      flex: 1, height: "40px", borderRadius: "calc(var(--radius) - 4px)",
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--foreground)", fontSize: "13px", fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {alertModal.cancelLabel || "Batal"}
                  </button>
                  <button
                    disabled={alertModal.isProcessing}
                    onClick={async () => {
                      if (alertModal.onConfirm) {
                        setAlertModal(prev => ({ ...prev, isProcessing: true }));
                        await alertModal.onConfirm();
                      }
                    }}
                    style={{
                      flex: 1, height: "40px", borderRadius: "calc(var(--radius) - 4px)",
                      border: "none", background: "var(--destructive)",
                      color: "var(--destructive-foreground)", fontSize: "13px", fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    {alertModal.isProcessing ? (
                      <span style={{
                        width: "14px", height: "14px", border: "2px solid currentColor",
                        borderTopColor: "transparent", borderRadius: "50%",
                        animation: "spin 0.6s linear infinite"
                      }} />
                    ) : null}
                    {alertModal.confirmLabel || "Hapus"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    width: "100%", height: "40px", borderRadius: "calc(var(--radius) - 4px)",
                    border: "none", background: "var(--primary)",
                    color: "var(--primary-foreground)", fontSize: "13px", fontWeight: 500,
                    cursor: "pointer", transition: "all 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
