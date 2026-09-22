const STORAGE_KEY = "liowms.shellNav.railExpanded";

export function readShellNavRailExpanded(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    /* private mode / disabled storage */
  }
  return false;
}

export function writeShellNavRailExpanded(expanded: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, expanded ? "true" : "false");
  } catch {
    /* ignore */
  }
}
