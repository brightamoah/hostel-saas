export function getAcademicYears(count: number = 2): string[] {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 1;
  return Array.from({ length: count }, (_, i) => {
    const year = startYear + i;
    return `${year}/${year + 1}`;
  });
}
