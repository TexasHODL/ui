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
    expect(renderLogo()).toHaveAttribute("src", "/texas-hodl-logo.png");
});

it("preserves a configured logo until it fails, then loads the bundled asset", () => {
    viteEnv.VITE_CLUB_LOGO = "https://example.com/old-logo.png";
    const logo = renderLogo();
    expect(logo).toHaveAttribute("src", "https://example.com/old-logo.png");
    fireEvent.error(logo);
    expect(logo).toHaveAttribute("src", "/texas-hodl-logo.png");
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
