import { API_BASE_URL } from '../config/api';

/**
 * Location Master API utility.
 *
 * Wraps the backend `/locations/*` endpoints and converts every response into
 * `{ label, value, id, name }` objects that the Select component can consume
 * directly.
 *
 * Hierarchy: State → District → City → Village
 */

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const toOption = (item) => ({
  label: item.name,
  value: item.id,
  id: item.id,
  name: item.name,
  lgdCode: item.lgdCode,
});

// ─── States ──────────────────────────────────────────────────────────────────

export const fetchStates = async (authToken) => {
  const res = await fetch(`${API_BASE_URL}/locations/states`, {
    headers: authHeaders(authToken),
  });
  if (!res.ok) throw new Error(`Failed to fetch states (HTTP ${res.status})`);
  const data = await res.json();
  return (data || []).map(toOption);
};

// ─── Districts (by state) ────────────────────────────────────────────────────

export const fetchDistricts = async (authToken, stateId) => {
  if (!stateId) return [];
  const res = await fetch(
    `${API_BASE_URL}/locations/districts?stateId=${encodeURIComponent(stateId)}`,
    { headers: authHeaders(authToken) },
  );
  if (!res.ok) throw new Error(`Failed to fetch districts (HTTP ${res.status})`);
  const data = await res.json();
  return (data || []).map(toOption);
};

// ─── Cities (by district, paginated + optional search) ──────────────────────

export const fetchCities = async (authToken, districtId, query = '') => {
  if (!districtId) return [];
  let url = `${API_BASE_URL}/locations/cities?districtId=${encodeURIComponent(districtId)}&page=0&size=100`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: authHeaders(authToken) });
  if (!res.ok) throw new Error(`Failed to fetch cities (HTTP ${res.status})`);
  const data = await res.json();
  // Paginated response: { content: [...], totalElements, ... }
  const items = Array.isArray(data) ? data : data?.content || [];
  return items.map(toOption);
};

// ─── Villages (by city, paginated + optional search) ─────────────────────────

export const fetchVillages = async (authToken, cityId, query = '') => {
  if (!cityId) return [];
  let url = `${API_BASE_URL}/locations/villages?cityId=${encodeURIComponent(cityId)}&page=0&size=100`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: authHeaders(authToken) });
  if (!res.ok) throw new Error(`Failed to fetch villages (HTTP ${res.status})`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data?.content || [];
  return items.map(toOption);
};

// ─── Hierarchy resolution ────────────────────────────────────────────────────

/**
 * Given a cityId, returns the full hierarchy { state, district, city } with
 * each level containing { id, lgdCode, name, type }.
 */
export const fetchCityHierarchy = async (authToken, cityId) => {
  if (!cityId) return null;
  const res = await fetch(
    `${API_BASE_URL}/locations/hierarchy/city?cityId=${encodeURIComponent(cityId)}`,
    { headers: authHeaders(authToken) },
  );
  if (!res.ok) throw new Error(`Failed to fetch city hierarchy (HTTP ${res.status})`);
  return res.json();
};

/**
 * Given a villageId, returns the full hierarchy { state, district, city, village }.
 */
export const fetchVillageHierarchy = async (authToken, villageId) => {
  if (!villageId) return null;
  const res = await fetch(
    `${API_BASE_URL}/locations/hierarchy/village?villageId=${encodeURIComponent(villageId)}`,
    { headers: authHeaders(authToken) },
  );
  if (!res.ok) throw new Error(`Failed to fetch village hierarchy (HTTP ${res.status})`);
  return res.json();
};
