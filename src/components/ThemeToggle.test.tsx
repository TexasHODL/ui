import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "../theme/theme";

afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
});

it("shows icon buttons and defaults to dark", () => {
    render(<ThemeToggle />);
    const light = screen.getByRole("button", { name: "Light theme" });
    const dark = screen.getByRole("button", { name: "Dark theme" });
    expect(light).toHaveAttribute("title", "Light theme");
    expect(dark).toHaveAttribute("title", "Dark theme");
    expect(light).toHaveAttribute("aria-pressed", "false");
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(light).not.toHaveTextContent(/light/i);
    expect(dark).not.toHaveTextContent(/dark/i);
});

it("switches to light and back, and remembers the choice", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "Light theme" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
});
