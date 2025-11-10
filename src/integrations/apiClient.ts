
const API_BASE = 'http://localhost:5000/api';

type LoginResp = { token: string };

const TOKEN_KEY = 'mf_token';

function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}


function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
    ...authHeaders(),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = JSON.parse(text).msg || JSON.parse(text).error || text; } catch(e){}
    throw new Error(message || `Request failed: ${res.status}`);
  }
  // return parsed json or empty
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return null;
}

export async function login(email: string, password: string) {
  const body = JSON.stringify({ email, password });
  const data = await request('/auth/login', { method: 'POST', body });
  const resp = data as LoginResp;
  if (resp?.token) setToken(resp.token);
  return resp;
}

export async function register(payload: { name: string; email: string; password: string; role: string; department?: string }) {
  const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  const resp = data as LoginResp;
  if (resp?.token) setToken(resp.token);
  return resp;
}

export async function listAlmirah(): Promise<any[]> {
  return request('/almirah');
}

// ✅ Corrected function
export async function useAlmirahItem(productId: string, quantity: number) {
  return request(`/almirah/use/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }), // clear, consistent naming
  });
}

export async function listDepartmentStock(): Promise<any[]> {
  return request("/department-stock"); // GET /api/department-stock
}



// decode JWT payload (no verification) to get id/role
export function getCurrentUserFromToken(): { id?: string; role?: string } | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    if (payload.exp && payload.exp < now) {
      logout(); // Expired
      return null;
    }
    return payload.user || payload;
  } catch {
    return null;
  }
}

export async function addProduct(productData: any) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(productData),
  });
}

export async function getDashboardStats() {
  return request('/analytics/dashboard/stats');
}

export function logout() {
  setToken(null);
}

export async function getProfile() {
  return request('/auth/me'); // GET /api/auth/me should return { id, name, email, role, department? }
}

export async function listAutoclaves(): Promise<any[]> {
  return request('/autoclaves'); // GET /api/autoclaves
}

export async function listAutoclaveItems(): Promise<any[]> {
  // backend may expose items at /api/autoclaves/items or include items in /api/autoclaves
  return request('/autoclaves/items'); // implement backend route if necessary
}
export async function listDepartments(): Promise<any[]> {
  return request('/departments'); // GET /api/departments
}
export async function listProducts(): Promise<any[]> {
  return request('/products'); // GET /api/products
}

export async function listCentralStock(): Promise<any[]> {
  return request('/stock/central'); // GET /api/stock/central
}
export async function listComplaints(): Promise<any[]> {
  return request('/complaints'); // GET /api/complaints
}

export async function createComplaint(payload: { product_id: string; description: string; raised_by?: string }) {
  return request('/complaints', { method: 'POST', body: JSON.stringify(payload) });
}

export async function resolveComplaint(id: string, payload: { resolved_by: string; resolution_notes?: string }) {
  return request(`/complaints/${id}/resolve`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function listRequests(): Promise<any[]> {
  return request('/requests'); // GET /api/requests - backend route may need to be added
}

// ✅ Updated: No departmentId needed, matches new backend route (/api/requests)
export async function createRequest(payload: {
  product: string;
  quantity: number;
  reason?: string;
  requestType?: string;
}) {
  return request("/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRequestStatus(id: string, role: string) {
  let endpoint = `/requests/${id}`;

  if (role === "sister_incharge") endpoint += "/approve-sister";
  else if (role === "hod") endpoint += "/approve-hod";
  else if (role === "inventory_staff") endpoint += "/fulfill";
  else throw new Error("Unauthorized role for approval");

  return request(endpoint, { method: "PUT" });
}

export async function rejectRequest(id: string, role: string) {
  return request(`/requests/${id}/reject`, { method: "PUT" });
}

export async function approveInventoryRequest(id) {
  return request(`/requests/${id}/approve-inventory`, { method: "PUT" });
}


export default {
  login,
  register,
  getCurrentUserFromToken,
  getDashboardStats,
  getProfile, 
  listAutoclaves,
  listAutoclaveItems,
  listDepartments,
  listProducts,
  listCentralStock,
  listComplaints,
  createComplaint,
  resolveComplaint,
  listRequests,
  createRequest,
  updateRequestStatus,
  useAlmirahItem,
  listAlmirah,
  logout,
  rejectRequest,
  addProduct,
  approveInventoryRequest,
  listDepartmentStock
};
