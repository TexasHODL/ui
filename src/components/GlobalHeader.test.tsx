import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GlobalHeader } from "./GlobalHeader";
import { STORAGE_COSMOS_ADDRESS } from "../utils/cosmos/storage";
import { PROFILE_SETUP_TITLE } from "../utils/profileHub";
import { viteEnv } from "../utils/viteEnv";

const ME = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const THEM = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";
let mockAddress: string | null = null;
jest.mock("../hooks/wallet/useCosmosWallet", () => ({
    __esModule: true,
    useCosmosWallet: () => ({ address: mockAddress }),
    default: () => ({ address: mockAddress })
}));
jest.mock("./NetworkSelector", () => ({ NetworkSelector: () => null }));
jest.mock("./profile", () => ({ ProfileAvatarButton: () => null }));

const originalLogo = viteEnv.VITE_CLUB_LOGO;
afterEach(() => {
    mockAddress = null;
    localStorage.clear();
    if (originalLogo === undefined) delete viteEnv.VITE_CLUB_LOGO;
    else viteEnv.VITE_CLUB_LOGO = originalLogo;
});

const renderHeader = (path = "/") => {
    render(
        <MemoryRouter initialEntries={[path]}>
            <GlobalHeader />
        </MemoryRouter>
    );
    return screen.getByRole("navigation", { name: "Main navigation" });
};

function renderLogo() {
    render(
        <MemoryRouter>
            <GlobalHeader />
        </MemoryRouter>
    );
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

describe("primary navigation", () => {
    it("renames My hands to Profile and opens the connected player's profile", () => {
        mockAddress = ME;
        const nav = renderHeader(`/players/${ME}`);
        const profile = within(nav).getByRole("link", { name: "Profile" });
        expect(profile).toHaveAttribute("href", `/players/${ME}`);
        expect(profile).toHaveAttribute("aria-current", "page");
        expect(within(nav).getByRole("link", { name: "Wallet" })).toHaveAttribute("href", `/players/${ME}?tab=wallet`);
        expect(within(nav).getByRole("link", { name: "Wallet" })).not.toHaveAttribute("aria-current");
        expect(within(nav).getByRole("link", { name: "Lobby" })).toHaveAttribute("href", "/");
        expect(within(nav).queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
    });

    it("marks Wallet current on the profile wallet tab and Profile current on My Hands", () => {
        mockAddress = ME;
        const onWallet = renderHeader(`/players/${ME}?tab=wallet`);
        expect(within(onWallet).getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
        expect(within(onWallet).getByRole("link", { name: "Profile" })).not.toHaveAttribute("aria-current");
        cleanup();
        const onHands = renderHeader(`/players/${ME}?tab=hands`);
        expect(within(onHands).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
        expect(within(onHands).getByRole("link", { name: "Wallet" })).not.toHaveAttribute("aria-current");
    });

    it("does not mark Profile current on someone else's profile", () => {
        mockAddress = ME;
        const onTheirs = renderHeader(`/players/${THEM}`);
        expect(within(onTheirs).getByRole("link", { name: "Profile" })).toHaveAttribute("href", `/players/${ME}`);
        expect(within(onTheirs).getByRole("link", { name: "Profile" })).not.toHaveAttribute("aria-current");
    });

    it("keeps Wallet as the current page when Profile has no wallet to open", () => {
        const nav = renderHeader("/wallet");
        const profile = within(nav).getByRole("link", { name: "Profile" });
        expect(profile).toHaveAttribute("href", "/wallet");
        expect(profile).toHaveAttribute("title", PROFILE_SETUP_TITLE);
        expect(profile).not.toHaveAttribute("aria-current");
        expect(within(nav).getByRole("link", { name: "Wallet" })).toHaveAttribute("aria-current", "page");
        expect(within(nav).queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
    });

    it("uses a stored address before the wallet hook has derived one", () => {
        localStorage.setItem(STORAGE_COSMOS_ADDRESS, ME);
        const nav = renderHeader("/");
        expect(within(nav).getByRole("link", { name: "Profile" })).toHaveAttribute("href", `/players/${ME}`);
        expect(within(nav).getByRole("link", { name: "Profile" })).not.toHaveAttribute("title");
    });
});
