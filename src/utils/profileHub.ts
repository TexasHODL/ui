import { hasContent } from "./guards";

/** Standalone routes. A connected wallet is redirected to the matching profile tab. */
export const MY_HANDS_PATH = "/hands";
export const WALLET_PATH = "/wallet";

/** Query key for the section open on a player profile. */
export const PROFILE_TAB_PARAM = "tab";

/** Shown on the Profile link when there is no game wallet to open. */
export const PROFILE_SETUP_TITLE = "Set up your wallet to open your profile";

export type ProfileTab = "hands" | "wallet" | "stats";

export interface PrimaryNavItem {
    label: string;
    to: string;
    /** False when the link must not be marked as the current page (Profile falls back to the wallet). */
    matchRoute: boolean;
    title?: string;
    /** Set when this item is a section of the connected player's profile. */
    section?: "profile" | "wallet";
}

export interface ProfileHubItem {
    id: ProfileTab;
    label: string;
    to: string;
    /** True for the section open under the profile tab bar. */
    current: boolean;
}

/** Path of a player's profile. The address is the b52 account, used as the route param. */
export const playerProfilePath = (address: string): string => `/players/${address}`;

/**
 * Stats keeps the profile path. Hands and Wallet stay on that page and record
 * the section in the query, so refresh, back, forward and deep links reopen it.
 */
export const profileTabPath = (address: string, tab: ProfileTab): string => {
    const path = playerProfilePath(address);
    if (tab === "stats") return path;
    return `${path}?${PROFILE_TAB_PARAM}=${tab}`;
};

/** `?tab=` on a profile. A missing or unknown value is Stats. */
export const parseProfileTab = (value: string | null | undefined): ProfileTab => {
    if (value === "hands" || value === "wallet" || value === "stats") return value;
    return "stats";
};

/**
 * Hands and Wallet exist only on your own profile. Another player's profile,
 * or a profile opened with no wallet, stays on Stats.
 */
export const visibleProfileTab = (viewer: string | null | undefined, profile: string | null | undefined, raw: string | null | undefined): ProfileTab => {
    if (!isOwnPlayerProfile(viewer, profile)) return "stats";
    return parseProfileTab(raw);
};

/** Where `/hands` and `/wallet` should send a player who already has a wallet. */
export const standaloneSectionTarget = (viewer: string | null | undefined, tab: "hands" | "wallet"): string | null => {
    if (!hasContent(viewer)) return null;
    return profileTabPath(viewer, tab);
};

/**
 * The connected game wallet. The hook derives the address asynchronously, so a
 * stored address covers the first paint. Once derivation finishes, that live
 * address wins.
 */
export const viewerAddress = (live: string | null | undefined, stored: string | null | undefined): string | null => {
    if (hasContent(live)) return live;
    if (hasContent(stored)) return stored;
    return null;
};

/** Same b52 account, ignoring bech32 case. A missing wallet is never "you". */
export const isOwnPlayerProfile = (viewer: string | null | undefined, profile: string | null | undefined): boolean => {
    if (!hasContent(viewer) || !hasContent(profile)) return false;
    return viewer.toLowerCase() === profile.toLowerCase();
};

const navPathname = (to: string): string => {
    const query = to.indexOf("?");
    if (query === -1) return to;
    return to.slice(0, query);
};

/**
 * Lobby, Profile, Wallet. Profile opens `/players/<address>`. With no wallet it
 * goes to the wallet page (the same place My Hands sends you to create one) and
 * is not shown as the current page, so Wallet keeps that highlight.
 * With a wallet, Wallet opens that profile's Wallet tab.
 */
export const primaryNavItems = (address: string | null | undefined): PrimaryNavItem[] => {
    const connected = hasContent(address);
    const profile: PrimaryNavItem = connected
        ? { label: "Profile", to: playerProfilePath(address), matchRoute: true, section: "profile" }
        : { label: "Profile", to: WALLET_PATH, matchRoute: false, title: PROFILE_SETUP_TITLE };
    const wallet: PrimaryNavItem = connected
        ? { label: "Wallet", to: profileTabPath(address, "wallet"), matchRoute: true, section: "wallet" }
        : { label: "Wallet", to: WALLET_PATH, matchRoute: true };
    return [{ label: "Lobby", to: "/", matchRoute: true }, profile, wallet];
};

/**
 * Top nav highlight. Profile and Wallet share the profile pathname, so the
 * wallet tab belongs to Wallet and the hands and stats tabs belong to Profile.
 */
export const isPrimaryNavCurrent = (item: PrimaryNavItem, pathname: string, search: string): boolean => {
    if (!item.matchRoute) return false;
    if (pathname !== navPathname(item.to)) return false;
    const tab = parseProfileTab(new URLSearchParams(search).get(PROFILE_TAB_PARAM));
    if (item.section === "wallet") return tab === "wallet";
    if (item.section === "profile") return tab !== "wallet";
    return true;
};

/**
 * Sections on a player profile. All three stay on this page. My Hands and
 * Wallet are only offered on your own profile.
 */
export const profileHubItems = (viewer: string | null | undefined, profile: string | null | undefined, active: ProfileTab): ProfileHubItem[] => {
    if (!hasContent(profile)) return [];
    const tab = isOwnPlayerProfile(viewer, profile) ? active : "stats";
    const stats: ProfileHubItem = {
        id: "stats",
        label: "Stats",
        to: profileTabPath(profile, "stats"),
        current: tab === "stats"
    };
    if (!isOwnPlayerProfile(viewer, profile)) return [stats];
    return [
        { id: "hands", label: "My Hands", to: profileTabPath(profile, "hands"), current: tab === "hands" },
        { id: "wallet", label: "Wallet", to: profileTabPath(profile, "wallet"), current: tab === "wallet" },
        stats
    ];
};
