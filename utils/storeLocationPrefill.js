import { API_BASE_URL } from '../config/api';

const textValue = (...values) => values.find((value) => (
  value !== undefined && value !== null && String(value).trim() !== ''
));

export const extractStoreLocationDefaults = (employee = {}) => {
  const sources = [
    employee,
    employee.location,
    employee.address,
    employee.employeeLocation,
    employee.locationDefaults,
  ].filter(Boolean);

  const pick = (...keys) => textValue(
    ...sources.flatMap((source) => keys.map((key) => source?.[key])),
  );

  return {
    city: pick('city', 'cityName'),
    state: pick('state', 'stateName'),
    village: pick('village', 'villageName', 'subDistrict'),
    taluka: pick('taluka', 'tehsil', 'tehsilName', 'district'),
  };
};

/**
 * Extract numeric location IDs from the employee response so the cascading
 * dropdowns can call /locations/hierarchy/* to pre-select all four levels.
 */
export const extractLocationIds = (employee = {}) => {
  const sources = [
    employee,
    employee.location,
    employee.address,
    employee.employeeLocation,
    employee.locationDefaults,
  ].filter(Boolean);

  const pickId = (...keys) => {
    for (const source of sources) {
      for (const key of keys) {
        const val = source?.[key];
        if (val !== undefined && val !== null && val !== '') return Number(val);
      }
    }
    return null;
  };

  return {
    stateId: pickId('stateId', 'locationStateId'),
    districtId: pickId('districtId', 'locationDistrictId'),
    cityId: pickId('cityId', 'locationCityId'),
    villageId: pickId('villageId', 'locationVillageId'),
  };
};

export const applyMissingLocationDefaults = (details, defaults) => ({
  ...details,
  city: details.city || defaults.city || '',
  state: details.state || defaults.state || '',
  village: details.village || defaults.village || '',
  taluka: details.taluka || defaults.taluka || '',
});

export const fetchEmployeeStoreLocationDefaults = async ({ employeeId, authToken }) => {
  if (!employeeId || !authToken) return { ids: {} };

  const response = await fetch(`${API_BASE_URL}/employee/getById?id=${encodeURIComponent(employeeId)}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!response.ok) {
    throw new Error(`Unable to load location defaults (HTTP ${response.status})`);
  }

  const employee = await response.json();
  return {
    ...extractStoreLocationDefaults(employee),
    ids: extractLocationIds(employee),
  };
};
