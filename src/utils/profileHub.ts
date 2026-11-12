import { hasContent } from "./guards";

/** Standalone routes. A connected wallet is redirected to the matching profile tab. */
export const MY_HANDS_PATH = "/hands";
export const WALLET_PATH = "/wallet";

/** Query key for the section open on a player profile. */
export const PROFILE_TAB_PARAM = "tab";

/** Shown on the Profile link when there is no game wallet to open. */
export const PROFILE_SETUP_TITLE = "Set up your wallet to open your profile";

export type ProfileTab = "hands" | "wallet" | "stats" | "awards";

export interface PrimaryNavItem {
    label: string;
    to: string;
    /** False when the link must not be marked as the current page. */
    matchRoute: boolean;
    title?: string;
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
    if (value === "hands" || value === "wallet" || value === "stats" || value === "awards") return value;
    return "stats";
};

/**
 * Hands and Wallet exist only on your own profile. Awards is the global
 * leaderboard, so it opens on any profile. Anything else on another player's
 * profile, or a profile opened with no wallet, stays on Stats.
 */
export const visibleProfileTab = (viewer: string | null | undefined, profile: string | null | undefined, raw: string | null | undefined): ProfileTab => {
    const tab = parseProfileTab(raw);
    if (tab === "awards") return "awards";
    if (!isOwnPlayerProfile(viewer, profile)) return "stats";
    return tab;
};

/** Where `/hands`, `/wallet` and `/awards` should send a player who already has a wallet. */
export const standaloneSectionTarget = (viewer: string | null | undefined, tab: "hands" | "wallet" | "awards"): string | null => {
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
 * Lobby and Profile. The wallet is a tab on the player's profile, so the banner
 * does not link it. With no game wallet, Profile opens the wallet setup page
 * (the same place My Hands sends you to create one).
 */
export const primaryNavItems = (address: string | null | undefined): PrimaryNavItem[] => {
    const connected = hasContent(address);
    const profile: PrimaryNavItem = connected
        ? { label: "Profile", to: playerProfilePath(address), matchRoute: true }
        : { label: "Profile", to: WALLET_PATH, matchRoute: true, title: PROFILE_SETUP_TITLE };
    return [{ label: "Lobby", to: "/", matchRoute: true }, profile];
};

/**
 * Top nav highlight. Every tab on your profile, including Wallet and Awards,
 * belongs to Profile. The query does not move the highlight.
 */
export const isPrimaryNavCurrent = (item: PrimaryNavItem, pathname: string, _search: string): boolean => {
    if (!item.matchRoute) return false;
    return pathname === navPathname(item.to);
};

/**
 * Sections on a player profile. All of them stay on this page. My Hands and
 * Wallet are only offered on your own profile. Awards is on every profile.
 */
export const profileHubItems = (viewer: string | null | undefined, profile: string | null | undefined, active: ProfileTab): ProfileHubItem[] => {
    if (!hasContent(profile)) return [];
    const own = isOwnPlayerProfile(viewer, profile);
    const tab = own || active === "awards" ? active : "stats";
    const stats: ProfileHubItem = {
        id: "stats",
        label: "Stats",
        to: profileTabPath(profile, "stats"),
        current: tab === "stats"
    };
    const awards: ProfileHubItem = {
        id: "awards",
        label: "Awards",
        to: profileTabPath(profile, "awards"),
        current: tab === "awards"
    };
    if (!own) return [stats, awards];
    return [
        { id: "hands", label: "My Hands", to: profileTabPath(profile, "hands"), current: tab === "hands" },
        { id: "wallet", label: "Wallet", to: profileTabPath(profile, "wallet"), current: tab === "wallet" },
        stats,
        awards
    ];
};
