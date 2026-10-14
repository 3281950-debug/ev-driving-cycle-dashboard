const STORAGE_KEY = 'obd-react-panel:theme';

/** Persist the chosen panel/theme id across reloads. */
export function loadSavedThemeId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function savePanelThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore storage failures */
  }
}