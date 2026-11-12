import { hasContent } from "./guards";

/** Bookmarks and in-page links keep using this route. It is no longer a top-nav item. */
export const MY_HANDS_PATH = "/hands";
export const WALLET_PATH = "/wallet";

/** Shown on the Profile link when there is no game wallet to open. */
export const PROFILE_SETUP_TITLE = "Set up your wallet to open your profile";

export interface PrimaryNavItem {
    label: string;
    to: string;
    /** False when the link must not be marked as the current page (Profile falls back to the wallet). */
    matchRoute: boolean;
    title?: string;
}

export interface ProfileHubItem {
    id: "hands" | "wallet" | "stats";
    label: string;
    to: string;
    /** Stats is the profile page itself, so it is the current section while you are here. */
    current: boolean;
}

/** Path of a player's profile. The address is the b52 account, used as the route param. */
export const playerProfilePath = (address: string): string => `/players/${address}`;

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

/**
 * Lobby, Profile, Wallet. Profile opens `/players/<address>`. With no wallet it
 * goes to the wallet page (the same place My Hands sends you to create one) and
 * is not shown as the current page, so Wallet keeps that highlight.
 */
export const primaryNavItems = (address: string | null | undefined): PrimaryNavItem[] => {
    const connected = hasContent(address);
    const profile: PrimaryNavItem = connected
        ? { label: "Profile", to: playerProfilePath(address), matchRoute: true }
        : { label: "Profile", to: WALLET_PATH, matchRoute: false, title: PROFILE_SETUP_TITLE };
    return [
        { label: "Lobby", to: "/", matchRoute: true },
        profile,
        { label: "Wallet", to: WALLET_PATH, matchRoute: true }
    ];
};

/**
 * Sections on a player profile. The page is the stats view (cards and Session
 * History), so Stats stays on this URL. My Hands and Wallet are only offered
 * on your own profile.
 */
export const profileHubItems = (viewer: string | null | undefined, profile: string | null | undefined): ProfileHubItem[] => {
    if (!hasContent(profile)) return [];
    const stats: ProfileHubItem = {
        id: "stats",
        label: "Stats",
        to: playerProfilePath(profile),
        current: true
    };
    if (!isOwnPlayerProfile(viewer, profile)) return [stats];
    return [
        { id: "hands", label: "My Hands", to: MY_HANDS_PATH, current: false },
        { id: "wallet", label: "Wallet", to: WALLET_PATH, current: false },
        stats
    ];
};
