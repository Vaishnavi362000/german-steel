// Keep customer filters and customer/store forms aligned with the backend value.
export const CLIENT_TYPE_OPTIONS = [
  { label: 'Shop', value: 'shop' },
  { label: 'Site Visit', value: 'site visit' },
  { label: 'Architect', value: 'architect' },
  { label: 'Engineer', value: 'engineer' },
  { label: 'Builder', value: 'builder' },
  { label: 'Others', value: 'others' },
];

export const YEAR_OF_JOINING_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1950 + 1 },
  (_, index) => {
    const year = new Date().getFullYear() - index;
    return { label: String(year), value: year };
  },
);
