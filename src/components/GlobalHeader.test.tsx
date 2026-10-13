import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GlobalHeader } from "./GlobalHeader";
import { viteEnv } from "../utils/viteEnv";

jest.mock("./NetworkSelector", () => ({ NetworkSelector: () => null }));
jest.mock("./profile", () => ({ ProfileAvatarButton: () => null }));

const originalLogo = viteEnv.VITE_CLUB_LOGO;
afterEach(() => {
    if (originalLogo === undefined) delete viteEnv.VITE_CLUB_LOGO;
    else viteEnv.VITE_CLUB_LOGO = originalLogo;
});

function renderLogo() {
    render(<MemoryRouter><GlobalHeader /></MemoryRouter>);
    return within(screen.getByRole("link", { name: "Texas HODL lobby" })).getByRole("presentation");
}

it("uses the bundled Texas HODL logo when no custom logo is configured", () => {
    delete viteEnv.VITE_CLUB_LOGO;
    expect(renderLogo()).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
});

it("uses the sharp mark in light mode when the bundled logo is showing", () => {
    delete viteEnv.VITE_CLUB_LOGO;
    document.documentElement.setAttribute("data-theme", "light");
    try {
        expect(renderLogo()).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
        expect(screen.getByRole("button", { name: "Light theme" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
    } finally {
        document.documentElement.removeAttribute("data-theme");
    }
});

it("uses the approved SVG even when an old deployment logo is configured", () => {
    viteEnv.VITE_CLUB_LOGO = "https://example.com/old-logo.png";
    const logo = renderLogo();
    expect(logo).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
    fireEvent.error(logo);
    expect(logo).toHaveAttribute("src", "/texas-hodl-logo-sharp.svg");
    expect(screen.getByRole("link", { name: /^Lobby$/ })).toHaveAttribute("href", "/");
});

it("does not repeatedly request the fallback if it also fails", () => {
    delete viteEnv.VITE_CLUB_LOGO;
    const logo = renderLogo();
    const setSource = jest.spyOn(HTMLImageElement.prototype, "src", "set");
    try {
        fireEvent.error(logo);
        fireEvent.error(logo);
        expect(setSource).not.toHaveBeenCalled();
    } finally {
        setSource.mockRestore();
    }
});
