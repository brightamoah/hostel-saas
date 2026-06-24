export function pickFields<T extends object>(row: T, fields: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const field of fields) {
    const value: unknown = Reflect.get(row, field);
    obj[field] = value ?? null;
  }
  return obj;
}

export function sortReportData<T extends Record<string, any>>(data: T[], sortBy?: string, sortDir?: "asc" | "desc"): T[] {
  if (!sortBy) return data;
  const dir = sortDir === "asc" ? 1 : -1;

  return data.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Fast string comparison
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * dir;
    }

    const comp = aVal < bVal ? -1 : 1;
    return comp * dir;
  });
}
