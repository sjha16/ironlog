// ─── LOCALSTORAGE HELPERS ─────────────────────────────────────────────────────
export const STORAGE_KEY = "ironlog_data_v1";

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch (e) {
    console.warn("Failed to load saved IronLog data from localStorage", e);
    return null;
  }
}

export function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save IronLog data to localStorage", e);
  }
}
