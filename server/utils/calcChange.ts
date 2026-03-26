export function calcChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : curr < 0 ? -100 : 0;
  return Number.parseFloat((((curr - prev) / prev) * 100).toFixed(1));
}

export function getTimePeriod() {
  const now = new Date();

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startOfYesterday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));

  const startOfThisWeek = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - startOfToday.getDay()));
  const startOfLastWeek = new Date(new Date(startOfThisWeek).setDate(startOfThisWeek.getDate() - 7));

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    startOfToday,
    startOfYesterday,
    startOfThisWeek,
    startOfLastWeek,
    startOfThisMonth,
    startOfLastMonth,
  };
}
