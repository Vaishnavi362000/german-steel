import { API_BASE_URL } from '../config/api';

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const fetchMyMonthlySalesTargetSummary = async ({ date = new Date(), authToken }) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const url = `${API_BASE_URL}/sales-target/my-summary?month=${month}&year=${year}`;
  console.log(`[Sales Target API] Fetching: ${url}`);
  const response = await fetch(url,
    { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} },
  );

  if (!response.ok) {
    console.error(`[Sales Target API] Error ${response.status}`);
    throw new Error(`Unable to load monthly target (HTTP ${response.status})`);
  }

  const payload = await response.json();
  console.log(`[Sales Target API] Response:`, JSON.stringify(payload, null, 2));
  const targets = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.content) ? payload.content : []));
  const monthlyTargets = targets.filter((target) => (
    !target?.targetType || String(target.targetType).toUpperCase() === 'MONTHLY'
  ));
  const targetTons = monthlyTargets.reduce((total, target) => total + asNumber(target.targetTons), 0);
  const achievedTons = monthlyTargets.reduce((total, target) => total + asNumber(
    target.effectiveFulfilledTons ?? target.fulfilledTons ?? target.salesTons,
  ), 0);

  return {
    month,
    year,
    targets: monthlyTargets,
    targetTons,
    achievedTons,
    achievementPercent: targetTons > 0 ? (achievedTons / targetTons) * 100 : 0,
  };
};
