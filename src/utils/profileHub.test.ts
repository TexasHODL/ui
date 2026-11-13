import {
    MY_HANDS_PATH,
    PROFILE_SETUP_TITLE,
    WALLET_PATH,
    isOwnPlayerProfile,
    isPrimaryNavCurrent,
    parseProfileTab,
    playerProfilePath,
    primaryNavItems,
    profileHubItems,
    profileTabPath,
    standaloneSectionTarget,
    viewerAddress,
    visibleProfileTab
} from "./profileHub";

const ME = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";
const THEM = "b521avgyh77ycn997ja45q5q8ss8y9mr424jsnxx93";

describe("viewerAddress", () => {
    it("prefers the derived wallet and otherwise uses the stored address", () => {
        expect(viewerAddress(ME, THEM)).toBe(ME);
        expect(viewerAddress(null, ME)).toBe(ME);
        expect(viewerAddress(undefined, "")).toBeNull();
        expect(viewerAddress(null, null)).toBeNull();
    });
});

describe("isOwnPlayerProfile", () => {
    it("matches the same b52 address in either case", () => {
        expect(isOwnPlayerProfile(ME, ME)).toBe(true);
        expect(isOwnPlayerProfile(ME.toUpperCase(), ME)).toBe(true);
    });

    it("is false for someone else or when either address is missing", () => {
        expect(isOwnPlayerProfile(ME, THEM)).toBe(false);
        expect(isOwnPlayerProfile(null, ME)).toBe(false);
        expect(isOwnPlayerProfile(ME, undefined)).toBe(false);
        expect(isOwnPlayerProfile("", ME)).toBe(false);
    });
});

describe("primaryNavItems", () => {
    it("opens Profile on the player's profile and leaves Wallet off the banner", () => {
        const items = primaryNavItems(ME);
        expect(items.map(item => item.label)).toEqual(["Lobby", "Profile"]);
        expect(items.map(item => item.to)).toEqual(["/", playerProfilePath(ME)]);
        expect(items.every(item => item.matchRoute)).toBe(true);
        expect(items.map(item => item.label)).not.toContain("Wallet");
        expect(items.map(item => item.to)).not.toContain(MY_HANDS_PATH);
        expect(items.map(item => item.to)).not.toContain(profileTabPath(ME, "wallet"));
    });

    it("sends Profile to the wallet setup page when there is no game wallet", () => {
        const items = primaryNavItems(null);
        const profile = items.find(item => item.label === "Profile");
        expect(items.map(item => item.label)).toEqual(["Lobby", "Profile"]);
        expect(primaryNavItems("").map(item => item.label)).toEqual(["Lobby", "Profile"]);
        expect(profile).toEqual({ label: "Profile", to: WALLET_PATH, matchRoute: true, title: PROFILE_SETUP_TITLE });
    });
});

describe("isPrimaryNavCurrent", () => {
    const items = primaryNavItems(ME);
    const profile = items.find(item => item.label === "Profile");
    const lobby = items.find(item => item.label === "Lobby");

    it("keeps Profile current on every profile tab, including Wallet", () => {
        expect(profile).toBeDefined();
        expect(lobby).toBeDefined();
        if (!profile || !lobby) return;
        expect(isPrimaryNavCurrent(profile, playerProfilePath(ME), "")).toBe(true);
        expect(isPrimaryNavCurrent(profile, playerProfilePath(ME), "?tab=hands")).toBe(true);
        expect(isPrimaryNavCurrent(profile, playerProfilePath(ME), "?tab=stats")).toBe(true);
        expect(isPrimaryNavCurrent(profile, playerProfilePath(ME), "?tab=wallet")).toBe(true);
        expect(isPrimaryNavCurrent(profile, playerProfilePath(ME), "?tab=awards")).toBe(true);
        expect(isPrimaryNavCurrent(lobby, "/", "")).toBe(true);
        expect(isPrimaryNavCurrent(lobby, playerProfilePath(ME), "")).toBe(false);
        expect(isPrimaryNavCurrent(lobby, playerProfilePath(ME), "?tab=wallet")).toBe(false);
    });

    it("marks Profile current on the wallet setup page", () => {
        const setup = primaryNavItems(null);
        const profile = setup.find(item => item.label === "Profile");
        const lobby = setup.find(item => item.label === "Lobby");
        expect(profile).toBeDefined();
        expect(lobby).toBeDefined();
        if (!profile || !lobby) return;
        expect(isPrimaryNavCurrent(profile, WALLET_PATH, "")).toBe(true);
        expect(isPrimaryNavCurrent(lobby, WALLET_PATH, "")).toBe(false);
    });
});

describe("profile tabs", () => {
    it("parses the profile sections and treats anything else as Stats", () => {
        expect(parseProfileTab("hands")).toBe("hands");
        expect(parseProfileTab("wallet")).toBe("wallet");
        expect(parseProfileTab("stats")).toBe("stats");
        expect(parseProfileTab("awards")).toBe("awards");
        expect(parseProfileTab(null)).toBe("stats");
        expect(parseProfileTab(undefined)).toBe("stats");
        expect(parseProfileTab("")).toBe("stats");
        expect(parseProfileTab("lobby")).toBe("stats");
    });

    it("keeps Stats on the profile path and records the other sections in the query", () => {
        expect(profileTabPath(ME, "stats")).toBe(playerProfilePath(ME));
        expect(profileTabPath(ME, "hands")).toBe(`${playerProfilePath(ME)}?tab=hands`);
        expect(profileTabPath(ME, "wallet")).toBe(`${playerProfilePath(ME)}?tab=wallet`);
        expect(profileTabPath(ME, "awards")).toBe(`${playerProfilePath(ME)}?tab=awards`);
    });

    it("hides hands and wallet on someone else's profile and keeps Awards", () => {
        expect(visibleProfileTab(ME, ME, "hands")).toBe("hands");
        expect(visibleProfileTab(ME.toUpperCase(), ME, "wallet")).toBe("wallet");
        expect(visibleProfileTab(ME, ME, "awards")).toBe("awards");
        expect(visibleProfileTab(ME, THEM, "wallet")).toBe("stats");
        expect(visibleProfileTab(ME, THEM, "awards")).toBe("awards");
        expect(visibleProfileTab(null, ME, "hands")).toBe("stats");
        expect(visibleProfileTab(null, ME, "awards")).toBe("awards");
        expect(visibleProfileTab(ME, ME, "nope")).toBe("stats");
    });

    it("redirects a connected wallet's standalone pages onto the profile tab", () => {
        expect(standaloneSectionTarget(ME, "hands")).toBe(profileTabPath(ME, "hands"));
        expect(standaloneSectionTarget(ME, "wallet")).toBe(profileTabPath(ME, "wallet"));
        expect(standaloneSectionTarget(ME, "awards")).toBe(profileTabPath(ME, "awards"));
        expect(standaloneSectionTarget(null, "hands")).toBeNull();
        expect(standaloneSectionTarget("", "wallet")).toBeNull();
        expect(standaloneSectionTarget(null, "awards")).toBeNull();
    });
});

const awardsItem = (address: string, current: boolean) => ({
    id: "awards" as const,
    label: "Awards",
    to: profileTabPath(address, "awards"),
    current
});

describe("profileHubItems", () => {
    it("offers My Hands, Wallet, Stats and Awards on your own profile and marks the open tab", () => {
        expect(profileHubItems(ME.toUpperCase(), ME, "stats")).toEqual([
            { id: "hands", label: "My Hands", to: profileTabPath(ME, "hands"), current: false },
            { id: "wallet", label: "Wallet", to: profileTabPath(ME, "wallet"), current: false },
            { id: "stats", label: "Stats", to: playerProfilePath(ME), current: true },
            awardsItem(ME, false)
        ]);
        expect(profileHubItems(ME, ME, "hands")).toEqual([
            { id: "hands", label: "My Hands", to: profileTabPath(ME, "hands"), current: true },
            { id: "wallet", label: "Wallet", to: profileTabPath(ME, "wallet"), current: false },
            { id: "stats", label: "Stats", to: playerProfilePath(ME), current: false },
            awardsItem(ME, false)
        ]);
        expect(profileHubItems(ME, ME, "wallet").find(item => item.id === "wallet")).toMatchObject({ current: true });
        expect(profileHubItems(ME, ME, "awards").find(item => item.id === "awards")).toMatchObject({ current: true });
    });

    it("shows Stats and Awards for another player, and keeps Awards when the url asks for it", () => {
        expect(profileHubItems(ME, THEM, "hands")).toEqual([
            { id: "stats", label: "Stats", to: playerProfilePath(THEM), current: true },
            awardsItem(THEM, false)
        ]);
        expect(profileHubItems(ME, THEM, "awards")).toEqual([
            { id: "stats", label: "Stats", to: playerProfilePath(THEM), current: false },
            awardsItem(THEM, true)
        ]);
    });

    it("keeps Awards when no wallet is connected, and nothing without a profile address", () => {
        expect(profileHubItems(null, ME, "wallet")).toEqual([
            { id: "stats", label: "Stats", to: playerProfilePath(ME), current: true },
            awardsItem(ME, false)
        ]);
        expect(profileHubItems(null, ME, "awards")).toEqual([
            { id: "stats", label: "Stats", to: playerProfilePath(ME), current: false },
            awardsItem(ME, true)
        ]);
        expect(profileHubItems(ME, undefined, "stats")).toEqual([]);
        expect(profileHubItems(ME, "", "stats")).toEqual([]);
    });
});
