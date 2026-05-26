// ─── DATE UTILITIES ───────────────────────────────────────────────────────────
export const NOW = new Date();
export const TODAY_IDX = NOW.getDay() === 0 ? 6 : NOW.getDay() - 1; // Mon=0…Sun=6

/** Returns true if the given weekday index (Mon=0…Sun=6) is strictly in the future this week */
export function isFutureDay(dayIdx) {
  return dayIdx > TODAY_IDX;
}

/**
 * Return the first day-of-week (Mon=0) offset for a given month.
 * Used to know how many blank cells precede day 1 in the calendar grid.
 */
export function monthStartOffset(year, month) {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1; // convert to Mon=0
}
export const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** All days in a month */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function formatDateLocal(date) {
  if (!date) return null;

  // If already YYYY-MM-DD → return as is
  if (typeof date === "string" && date.includes("-")) {
    return date;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export const getTargetDateStr = (selectedDay) => {
  const today = new Date();

  const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const selectedIndex = dayMap[selectedDay];

  const currentIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const diff = selectedIndex - currentIndex;

  const target = new Date();
  target.setDate(today.getDate() + diff);

  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
};
