// ============================================================
// Luxchain API Helper — Centralized HTTP client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// ─── Token management ───
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("luxchain-token");
}

export function setToken(token: string): void {
  localStorage.setItem("luxchain-token", token);
}

export function clearToken(): void {
  localStorage.removeItem("luxchain-token");
  localStorage.removeItem("luxchain-admin");
}

export function getAdmin(): { id_admin: number; email: string; wallet_address: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("luxchain-admin");
  return raw ? JSON.parse(raw) : null;
}

export function setAdmin(admin: { id_admin: number; email: string; wallet_address: string }): void {
  localStorage.setItem("luxchain-admin", JSON.stringify(admin));
}

// ─── Core fetch wrapper ───
async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // If 401, clear token and redirect to login
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }

  return res;
}

// ─── Auth endpoints ───
export async function login(email: string, password: string) {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getMe() {
  const res = await apiFetch("/auth/me");
  return res.json();
}

export async function updateWallet(wallet_address: string, signature?: string) {
  const res = await apiFetch("/auth/wallet", {
    method: "PUT",
    body: JSON.stringify({ wallet_address, signature }),
  });
  return res.json();
}

// ─── Product endpoints ───
export async function getProducts(params?: {
  search?: string;
  kategori?: string;
  sub_kategori?: string;
  min_harga?: string;
  max_harga?: string;
  warna?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.kategori) query.set("kategori", params.kategori);
  if (params?.sub_kategori) query.set("sub_kategori", params.sub_kategori);
  if (params?.min_harga) query.set("min_harga", params.min_harga);
  if (params?.max_harga) query.set("max_harga", params.max_harga);
  if (params?.warna) query.set("warna", params.warna);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/products?${query.toString()}`);
  return res.json();
}

export async function getProduct(id: number) {
  const res = await apiFetch(`/products/${id}`);
  return res.json();
}

export async function createProduct(formData: FormData) {
  const res = await apiFetch("/products", {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function deleteProduct(id: number, onlyPending?: boolean) {
  const query = onlyPending ? "?onlyPending=true" : "";
  const res = await apiFetch(`/products/${id}${query}`, {
    method: "DELETE",
  });
  return res.json();
}

// ─── Transaction endpoints ───
export async function getTransactions(params?: {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.type) query.set("type", params.type);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/transactions?${query.toString()}`);
  return res.json();
}

// ─── Category endpoints ───
export async function getCategories() {
  const res = await apiFetch("/categories");
  return res.json();
}

export async function getSubCategories(categoryId: number | string) {
  const res = await apiFetch(`/categories/${categoryId}/subs`);
  return res.json();
}

// ─── Item endpoints ───
export async function getItemByUUID(uuid: string) {
  const res = await apiFetch(`/items/${uuid}`);
  return res.json();
}

export async function verifyItem(uuid: string) {
  const res = await apiFetch(`/items/${uuid}/verify`, { method: "POST" });
  return res.json();
}

// ─── NFC Operations ───
export async function getWaitingNfcQueue(id_produk?: number) {
  const query = id_produk ? `?id_produk=${id_produk}` : "";
  const res = await apiFetch(`/items/queue/waiting-nfc${query}`);
  return res.json();
}

export async function bindNfcItem(payload: { hash: string; uid_fisik: string }) {
  const res = await apiFetch("/items/bind-nfc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function verifyNfcItem(payload: { hash: string; uid_fisik: string }) {
  const res = await apiFetch("/items/verify-nfc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ─── System logs ───
export async function getSystemLogs(params?: {
  action?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.action) query.set("action", params.action);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/system-logs?${query.toString()}`);
  return res.json();
}

// ─── Customers & Items ───
export async function getCustomers(params?: {
  search?: string;
  min_assets?: string;
  min_tx?: string;
  sort_by?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.min_assets) query.set("min_assets", params.min_assets);
  if (params?.min_tx) query.set("min_tx", params.min_tx);
  if (params?.sort_by) query.set("sort_by", params.sort_by);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/customers?${query.toString()}`);
  return res.json();
}

export async function getProductItems(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/items?${query.toString()}`);
  return res.json();
}

// ─── Dashboard stats (custom query) ───
export async function getDashboardStats() {
  // We'll aggregate from multiple endpoints
  const [productsRes, txRes] = await Promise.all([
    apiFetch("/products?limit=1"),
    apiFetch("/transactions?limit=1"),
  ]);

  const products = await productsRes.json();
  const transactions = await txRes.json();

  return {
    totalProducts: products.pagination?.total || 0,
    totalTransactions: transactions.pagination?.total || 0,
  };
}

/**
 * Format image URL: supports both absolute URLs (e.g. Supabase Storage) and legacy relative uploads
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const baseUrl = API_BASE.replace(/\/api\/?$/, "");
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
