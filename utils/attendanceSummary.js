export function isPaidLeaveDate(dateKey, records = []) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (new Date(year, month - 1, day).getDay() === 0) return true;
  return records.some((record) => {
    const status = String(record.dayType || '').trim().toLowerCase();
    return String(record.date).split('T')[0] === dateKey &&
      (status === 'paid' || status.startsWith('paid leave'));
  });
}

// Match the web calendar: Sundays are Paid Leave, not additional worked days.
export function summarizeAttendanceDays(records, year, month, today = new Date()) {
  const summary = { totalDays: 0, fullDays: 0, halfDays: 0, paidLeaveDays: 0, absentDays: 0 };
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const byDate = new Map(records.map((row) => [String(row.date).split('T')[0], row]));
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    if (date > cutoff) break;
    summary.totalDays += 1;
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = String(byDate.get(key)?.dayType || '').trim().toLowerCase();
    if (date.getDay() === 0 || status.startsWith('paid leave') || status === 'paid') summary.paidLeaveDays += 1;
    else if (status === 'full day') summary.fullDays += 1;
    else if (status === 'half day') summary.halfDays += 1;
    else if (status !== 'activity') summary.absentDays += 1;
  }
  return summary;
}
