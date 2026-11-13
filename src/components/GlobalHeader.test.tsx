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
        expect(within(nav).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
        expect(within(nav).getByRole("link", { name: "Lobby" })).toHaveAttribute("href", "/");
        expect(within(nav).queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
    });

    it("keeps Profile current on the wallet tab and on My Hands", () => {
        mockAddress = ME;
        const onWallet = renderHeader(`/players/${ME}?tab=wallet`);
        expect(within(onWallet).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
        expect(within(onWallet).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
        expect(within(onWallet).getByRole("link", { name: "Profile" })).toHaveAttribute("href", `/players/${ME}`);
        cleanup();
        const onHands = renderHeader(`/players/${ME}?tab=hands`);
        expect(within(onHands).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
        expect(within(onHands).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
        cleanup();
        const onAwards = renderHeader(`/players/${ME}?tab=awards`);
        expect(within(onAwards).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
        expect(within(onAwards).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
    });

    it("does not mark Profile current on someone else's profile", () => {
        mockAddress = ME;
        const onTheirs = renderHeader(`/players/${THEM}`);
        expect(within(onTheirs).getByRole("link", { name: "Profile" })).toHaveAttribute("href", `/players/${ME}`);
        expect(within(onTheirs).getByRole("link", { name: "Profile" })).not.toHaveAttribute("aria-current");
    });

    it("sends Profile to wallet setup, and marks it current, when there is no game wallet", () => {
        const nav = renderHeader("/wallet");
        const profile = within(nav).getByRole("link", { name: "Profile" });
        expect(profile).toHaveAttribute("href", "/wallet");
        expect(profile).toHaveAttribute("title", PROFILE_SETUP_TITLE);
        expect(profile).toHaveAttribute("aria-current", "page");
        expect(within(nav).queryByRole("link", { name: "Wallet" })).not.toBeInTheDocument();
        expect(within(nav).getByRole("link", { name: "Lobby" })).not.toHaveAttribute("aria-current");
        expect(within(nav).queryByRole("link", { name: "My hands" })).not.toBeInTheDocument();
    });

    it("uses a stored address before the wallet hook has derived one", () => {
        localStorage.setItem(STORAGE_COSMOS_ADDRESS, ME);
        const nav = renderHeader("/");
        expect(within(nav).getByRole("link", { name: "Profile" })).toHaveAttribute("href", `/players/${ME}`);
        expect(within(nav).getByRole("link", { name: "Profile" })).not.toHaveAttribute("title");
    });
});

describe("More menu", () => {
    function moreMenu(): HTMLElement {
        renderHeader();
        const menu = screen.getByText("More").closest("details");
        if (!(menu instanceof HTMLElement)) throw new Error("More menu missing");
        expect(menu.querySelector("summary")).toHaveAttribute("aria-label", "More options");
        return menu;
    }

    it("drops Administration and the Tools heading, and keeps the website link under Tech notes", () => {
        const menu = within(moreMenu());

        expect(menu.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
        expect(menu.queryByText("TOOLS")).not.toBeInTheDocument();

        const website = menu.getByRole("link", { name: "Texas HODL website" });
        expect(website).toHaveAttribute("href", "https://texashodl.net/");
        expect(website).toHaveAttribute("target", "_blank");
        expect(website).toHaveAttribute("rel", "noopener noreferrer");
        expect(website.querySelector("svg")).not.toBeNull();

        const techNotes = menu.getByRole("link", { name: "Tech notes" });
        expect(techNotes).toHaveAttribute("href", "/tech-notes");
        const platform = menu.getByText("PLATFORM").closest("div");
        expect(platform).toContainElement(techNotes);
        expect(platform?.nextElementSibling).toBe(website);
        expect(website.nextElementSibling).toHaveTextContent("CONNECTED NETWORK");

        expect(menu.getByText("EXPLORE")).toBeInTheDocument();
        expect(menu.getByRole("link", { name: "Tables" })).toHaveAttribute("href", "/tables");
        expect(menu.getByRole("link", { name: "Players" })).toHaveAttribute("href", "/players");
        expect(menu.getByRole("link", { name: "Block explorer" })).toHaveAttribute("href", "/explorer");
        expect(menu.getByRole("link", { name: "Hand distribution" })).toHaveAttribute("href", "/explorer/distribution");
        expect(menu.getByRole("link", { name: "Network nodes" })).toHaveAttribute("href", "/nodes");
    });
});
