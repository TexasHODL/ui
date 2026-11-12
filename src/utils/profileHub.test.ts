import {
    MY_HANDS_PATH,
    PROFILE_SETUP_TITLE,
    WALLET_PATH,
    isOwnPlayerProfile,
    playerProfilePath,
    primaryNavItems,
    profileHubItems,
    viewerAddress
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
    it("labels Profile and opens the connected player's profile, leaving Wallet on /wallet", () => {
        const items = primaryNavItems(ME);
        expect(items.map(item => item.label)).toEqual(["Lobby", "Profile", "Wallet"]);
        expect(items.map(item => item.to)).toEqual(["/", playerProfilePath(ME), WALLET_PATH]);
        expect(items.every(item => item.matchRoute)).toBe(true);
        expect(items.map(item => item.to)).not.toContain(MY_HANDS_PATH);
    });

    it("sends Profile to the wallet setup page without treating it as the current page", () => {
        const profile = primaryNavItems(null).find(item => item.label === "Profile");
        const wallet = primaryNavItems("").find(item => item.label === "Wallet");
        expect(profile).toEqual({ label: "Profile", to: WALLET_PATH, matchRoute: false, title: PROFILE_SETUP_TITLE });
        expect(wallet).toMatchObject({ to: WALLET_PATH, matchRoute: true });
    });
});

describe("profileHubItems", () => {
    it("offers My Hands, Wallet and Stats on your own profile, with Stats as this page", () => {
        expect(profileHubItems(ME.toUpperCase(), ME)).toEqual([
            { id: "hands", label: "My Hands", to: MY_HANDS_PATH, current: false },
            { id: "wallet", label: "Wallet", to: WALLET_PATH, current: false },
            { id: "stats", label: "Stats", to: playerProfilePath(ME), current: true }
        ]);
    });

    it("shows only Stats for another player", () => {
        expect(profileHubItems(ME, THEM)).toEqual([{ id: "stats", label: "Stats", to: playerProfilePath(THEM), current: true }]);
    });

    it("shows only Stats when no wallet is connected, and nothing without a profile address", () => {
        expect(profileHubItems(null, ME)).toEqual([{ id: "stats", label: "Stats", to: playerProfilePath(ME), current: true }]);
        expect(profileHubItems(ME, undefined)).toEqual([]);
        expect(profileHubItems(ME, "")).toEqual([]);
    });
});
