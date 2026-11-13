import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "../theme/theme";

afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
});

it("labels the choice Dark and Light and defaults to dark", () => {
    render(<ThemeToggle />);
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Dark or light appearance.")).toBeInTheDocument();
    const dark = screen.getByRole("button", { name: "Dark theme" });
    const light = screen.getByRole("button", { name: "Light theme" });
    expect(dark).toHaveTextContent("Dark");
    expect(light).toHaveTextContent("Light");
    expect(dark).toHaveAttribute("title", "Dark theme");
    expect(light).toHaveAttribute("title", "Light theme");
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group", { name: "Color theme" })).toContainElement(dark);
});

it("can show only the Dark and Light control", () => {
    render(<ThemeToggle showCopy={false} />);
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
    expect(screen.queryByText("Dark or light appearance.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light theme" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Color theme" })).toBeInTheDocument();
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
