/**
 * Player-selectable table art: card deck, chip style and dealer button style.
 * Chosen in the in-game Settings panel and saved per browser in localStorage,
 * like the light/dark theme. Changes apply live to every mounted table via
 * useTableStyles (useSyncExternalStore), on desktop and mobile alike.
 */
import { DECK_FILES, CHIP_STYLE_FILES, DEALER_STYLE_FILES } from "../utils/tableStyleAssets";

/**
 * "block52" is the original Block52 card art (src/assets/cards, via
 * getCardImageUrl): no files of its own under assets/decks.
 */
export const DECK_IDS = ["block52", "C", "D", "H", "J", "K", "M", "N", "O", "P"] as const;
export type DeckId = (typeof DECK_IDS)[number];
export const DECK_LABELS: Record<DeckId, string> = {
    block52: "Block52 Classic",
    C: "Minimal Modern",
    D: "Brand Night",
    H: "HODL Watermark",
    J: "Bright Plum",
    K: "Spectrum Pastel",
    M: "Classic Courts",
    N: "HODL Courts",
    O: "Web3 Holo",
    P: "Tech Grid"
};

/**
 * Dealer button styles. A–D are the SVG sets under assets/dealerstyles;
 * E is the photoreal marble dealer (block52/cards ui#776 / #778), bundled as webp.
 * Clean minimal (C) stays the default — marble is opt-in only.
 */
export const STYLE_IDS = ["current", "A", "B", "C", "D", "E"] as const;
export type StyleId = (typeof STYLE_IDS)[number];
/** Alias kept for callers that want the dealer list by name. */
export const DEALER_STYLE_IDS = STYLE_IDS;

/**
 * Chip styles: A–D match the SVG sets under assets/chipstyles; E is the
 * photoreal marble set from block52/cards (ui#776 / #777), bundled as webp.
 * Crypto coin (C) stays the default — marble is opt-in only.
 */
export const CHIP_STYLE_IDS = ["current", "A", "B", "C", "D", "E"] as const;
export type ChipStyleId = (typeof CHIP_STYLE_IDS)[number];

export const CHIP_STYLE_LABELS: Record<ChipStyleId, string> = {
    current: "Current",
    A: "Classic casino",
    B: "Flat brand",
    C: "Crypto coin",
    D: "Layered 3D",
    E: "Marble"
};
export const DEALER_STYLE_LABELS: Record<StyleId, string> = {
    current: "Current",
    A: "Classic acrylic",
    B: "Brand ring",
    C: "Clean minimal",
    D: "Gold coin",
    E: "Marble"
};

export interface TableStyles {
    deck: DeckId;
    chips: ChipStyleId;
    dealer: StyleId;
}

export const DEFAULT_TABLE_STYLES: TableStyles = { deck: "block52", chips: "C", dealer: "C" };

export const TABLE_STYLE_STORAGE_KEYS = {
    deck: "texas-hodl-card-deck",
    chips: "texas-hodl-chip-style",
    dealer: "texas-hodl-dealer-style"
} as const;

export const isDeckId = (value: unknown): value is DeckId => (DECK_IDS as readonly unknown[]).includes(value);
export const isStyleId = (value: unknown): value is StyleId => (STYLE_IDS as readonly unknown[]).includes(value);
export const isChipStyleId = (value: unknown): value is ChipStyleId => (CHIP_STYLE_IDS as readonly unknown[]).includes(value);

/** "../assets/decks/O/AS.svg" -> { O: { AS: url } }. */
export const indexDeckUrls = (files: Record<string, string>): Record<string, Record<string, string>> => {
    const out: Record<string, Record<string, string>> = {};
    for (const [file, url] of Object.entries(files)) {
        const m = file.match(/decks\/([A-Z])\/([2-9TJQKA][SHDC])\.svg$/);
        if (m) (out[m[1]] ??= {})[m[2]] = url;
    }
    return out;
};

/** "../assets/chipstyles/C/25chip.svg" -> { C: { "25chip.svg": url } }; E uses .webp. */
export const indexChipStyleUrls = (files: Record<string, string>): Record<string, Record<string, string>> => {
    const out: Record<string, Record<string, string>> = {};
    for (const [file, url] of Object.entries(files)) {
        const m = file.match(/chipstyles\/([A-E])\/([A-Za-z0-9]+\.(?:svg|webp))$/);
        if (m) (out[m[1]] ??= {})[m[2]] = url;
    }
    return out;
};

/** "../assets/dealerstyles/C.svg" -> { C: url }; E is dealerstyles/E.webp. */
export const indexDealerStyleUrls = (files: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [file, url] of Object.entries(files)) {
        const m = file.match(/dealerstyles\/([A-E])\.(?:svg|webp)$/);
        if (m) out[m[1]] = url;
    }
    return out;
};

const DECK_URLS = indexDeckUrls(DECK_FILES);
const CHIP_STYLE_URLS = indexChipStyleUrls(CHIP_STYLE_FILES);
const DEALER_STYLE_URLS = indexDealerStyleUrls(DEALER_STYLE_FILES);

/** Face URL for a card code in a deck, or null when the deck has no such face. */
/** Block52 Classic returns null, so callers use the original bundled faces. */
export const deckCardUrl = (deck: DeckId, code: string): string | null => DECK_URLS[deck]?.[code] ?? null;
/**
 * Styled chip URL for a live chip file name ("25chip.svg"), or null for Current / unknown.
 * Marble (E) ships as .webp with the same base names, so "25chip.svg" resolves to
 * "25chip.webp" in that style.
 */
export const chipStyleUrl = (style: ChipStyleId, file: string): string | null => {
    if (style === "current") return null;
    const urls = CHIP_STYLE_URLS[style];
    if (!urls) return null;
    return urls[file] ?? urls[file.replace(/\.svg$/, ".webp")] ?? null;
};
/**
 * Chip set a tournament or Sit & Go table uses when the player picked Current.
 * The live CDN chips print "$" on every denomination, so they only suit cash
 * tables; tournament chips are plain numbers, so fall back to the default set.
 */
export const TOURNAMENT_CHIP_STYLE: ChipStyleId = DEFAULT_TABLE_STYLES.chips;

/** The chip style to draw with: Current swaps to a number-chip set on tournament / Sit & Go tables. */
export const chipStyleForFormat = (style: ChipStyleId, isTournament: boolean): ChipStyleId =>
    isTournament && style === "current" ? TOURNAMENT_CHIP_STYLE : style;

/** Styled dealer button URL, or null for Current. */
export const dealerStyleUrl = (style: StyleId): string | null => (style === "current" ? null : DEALER_STYLE_URLS[style] ?? null);

const read = <T>(key: string, valid: (v: unknown) => v is T, fallback: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return valid(saved) ? saved : fallback;
    } catch {
        return fallback;
    }
};

export function readTableStyles(): TableStyles {
    return {
        deck: read(TABLE_STYLE_STORAGE_KEYS.deck, isDeckId, DEFAULT_TABLE_STYLES.deck),
        chips: read(TABLE_STYLE_STORAGE_KEYS.chips, isChipStyleId, DEFAULT_TABLE_STYLES.chips),
        dealer: read(TABLE_STYLE_STORAGE_KEYS.dealer, isStyleId, DEFAULT_TABLE_STYLES.dealer)
    };
}

const listeners = new Set<() => void>();
let snapshot: TableStyles | null = null;

/** Current choice; the same object until something changes (useSyncExternalStore-safe). */
export function getTableStyles(): TableStyles {
    return (snapshot ??= readTableStyles());
}

export function setTableStyle<K extends keyof TableStyles>(key: K, value: TableStyles[K]): void {
    try {
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS[key], value);
    } catch {
        /* private mode or a blocked storage partition */
    }
    snapshot = { ...getTableStyles(), [key]: value };
    listeners.forEach(listener => listener());
}

export function subscribeTableStyles(listener: () => void): () => void {
    listeners.add(listener);
    // Another tab changed a choice.
    const onStorage = (event: StorageEvent) => {
        if (event.key && (Object.values(TABLE_STYLE_STORAGE_KEYS) as string[]).includes(event.key)) {
            snapshot = readTableStyles();
            listener();
        }
    };
    window.addEventListener("storage", onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
}

/** Test hook: forget the cached snapshot so the next read uses localStorage. */
export function resetTableStylesForTests(): void {
    snapshot = null;
}
