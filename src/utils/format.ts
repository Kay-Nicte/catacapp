const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const MONTHS_FULL = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "14 ene 2025" — from ISO string */
export function formatDateLong(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "14 enero 2025" — from Date object, full month name */
export function formatDateFull(date: Date): string {
  return `${date.getDate()} ${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

/** "14/1/2025" */
export function formatDateShort(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

/** "08:30" */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "08:30" — from a standalone Date used only for time */
export function formatTimeDisplay(date: Date): string {
  return formatTime(date);
}

/** "DD/MM/YYYY" — padded */
export function formatDatePadded(date: Date | null): string {
  if (!date) return "";
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}
