export const THEME_STORAGE_KEY = "texas-hodl-theme";

export type ThemeChoice = "light" | "dark";

/** The attribute is set only for light. Missing attribute is dark, including when nothing is saved. */
export function readAppliedTheme(): ThemeChoice {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeChoice): void {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        /* private mode or a blocked storage partition */
    }
    window.dispatchEvent(new Event("texas-hodl-theme"));
}
