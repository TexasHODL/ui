import { THEME_STORAGE_KEY, applyTheme, readAppliedTheme } from "./theme";

afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
});

it("stays dark when nothing has been saved", () => {
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readAppliedTheme()).toBe("dark");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});

it("persists light and dark without reading the operating system", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(readAppliedTheme()).toBe("light");

    applyTheme("dark");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readAppliedTheme()).toBe("dark");
});
