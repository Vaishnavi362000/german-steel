import { API_BASE_URL } from '../config/api';

class ApiRequestError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

const toQuery = (params) => new URLSearchParams(
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]),
).toString();

const getJson = async (path, authToken) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ApiRequestError(body || `Request failed with status ${response.status}`, response.status);
  }

  return response.json();
};

const canUseLegacyFallback = (error) => [404, 405, 501].includes(error?.status);

const asPage = (items = [], page = 0, size = items.length || 1) => ({
  content: Array.isArray(items) ? items : [],
  totalElements: Array.isArray(items) ? items.length : 0,
  totalPages: 1,
  number: page,
  size,
  first: page === 0,
  last: true,
  empty: !items?.length,
});

export const fetchEmployeeVisitsPage = async ({ employeeId, start, end, page = 0, size = 20, sort = 'id,desc', authToken }) => {
  const query = toQuery({ id: employeeId, start, end, page, size, sort });

  try {
    const data = await getJson(`/visit/getByDateRangeAndEmployeePaged?${query}`, authToken);
    return { page: data, optimized: true };
  } catch (error) {
    if (!canUseLegacyFallback(error)) throw error;

    const legacyQuery = toQuery({ id: employeeId, start, end });
    const legacyData = await getJson(`/visit/getByDateRangeAndEmployee?${legacyQuery}`, authToken);
    return { page: asPage(legacyData, 0, size), optimized: false };
  }
};

export const fetchStoreVisitsPage = async ({ storeId, page = 0, size = 10, sort = 'visitDate,desc', authToken }) => {
  const query = toQuery({ id: storeId, page, size, sort });

  try {
    const data = await getJson(`/visit/getByStorePaged?${query}`, authToken);
    return { page: data, optimized: true };
  } catch (error) {
    if (!canUseLegacyFallback(error)) throw error;

    const legacyData = await getJson(`/visit/getByStore?${toQuery({ id: storeId })}`, authToken);
    return { page: asPage(legacyData, 0, size), optimized: false };
  }
};

export const fetchMobileHomeSummary = async ({ employeeId, authToken }) => (
  getJson(`/visit/mobile-home-summary?${toQuery({ employeeId })}`, authToken)
);

export const shouldUseLegacyHomeFallback = canUseLegacyFallback;
