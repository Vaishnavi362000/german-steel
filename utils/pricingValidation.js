export const localPricingDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isValidPricingAmount = (value) =>
  /^\d+(\.\d{1,2})?$/.test(String(value).trim()) &&
  Number.isFinite(Number(value)) && Number(value) > 0;

export const hasPricingBrand = (entries, name) =>
  entries.some((entry) => entry?.brandName?.trim().toLowerCase() === name.trim().toLowerCase());
