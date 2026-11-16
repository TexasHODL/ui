/**
 * Table appearances (Settings → "Table appearance"): the felt colour,
 * outer rail, room background and centre-logo treatment. Card decks, chip
 * styles and the dealer button are a separate choice in tableStyles.ts.
 *
 * To add a limited-time event appearance:
 *   1. Add an entry to TABLE_APPEARANCES with id, label, and optional
 *      startsAt / endsAt (ISO 8601; start inclusive, end exclusive).
 *      Omit both dates for a permanent option.
 *   2. Add CSS under .table-container[data-table-theme="<id>"] in
 *      src/components/playPage/Table.css (felt, rail, logo, typography).
 *      Light-mode overrides go in src/theme/light.css.
 *   3. Only if the theme needs a custom logo or background layer, branch
 *      on the id in Table.tsx / TableBoard.tsx.
 * Outside the window the option is hidden from the dropdown, and anyone
 * who had it selected (or the retired "nouns" appearance) falls back to
 * Texas HODL (modern). The player's choice is stored in localStorage
 * under TABLE_APPEARANCE_STORAGE_KEY.
 */

export const DEFAULT_TABLE_APPEARANCE_ID = "modern";

export const TABLE_APPEARANCE_STORAGE_KEY = "texas-hodl-table-appearance";

export interface TableAppearance {
    id: string;
    label: string;
    /** Inclusive start of the availability window (ISO 8601). */
    startsAt?: string;
    /** Exclusive end of the availability window (ISO 8601). */
    endsAt?: string;
}

/**
 * Permanent and event appearances. Event themes are added here and
 * removed (or left with a past endsAt) when the occasion is over.
 *
 * Example (do not ship until the artwork is ready):
 * { id: "holiday-2026", label: "Holiday", startsAt: "2026-12-01T00:00:00+10:00", endsAt: "2027-01-05T00:00:00+10:00" }
 */
export const TABLE_APPEARANCES: readonly TableAppearance[] = [
    { id: "modern", label: "Texas HODL" },
    { id: "classic", label: "Classic" }
];

/** Registry ids are plain strings so event themes can be added without a type change. */
export type TableAppearanceId = string;
/** @deprecated Use TableAppearanceId. Kept as the name existing call sites already import. */
export type TableStyleOption = TableAppearanceId;
/** @deprecated Use TableAppearanceId. */
export type TableTheme = TableAppearanceId;

const isUsableDate = (value: string): number | null => {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
};

/** True when `now` is inside the appearance's optional window. The default appearance is always available. */
export function isAppearanceAvailable(appearance: TableAppearance, now: Date = new Date()): boolean {
    if (appearance.id === DEFAULT_TABLE_APPEARANCE_ID) return true;
    if (appearance.startsAt) {
        const start = isUsableDate(appearance.startsAt);
        if (start != null && now.getTime() < start) return false;
    }
    if (appearance.endsAt) {
        const end = isUsableDate(appearance.endsAt);
        if (end != null && now.getTime() >= end) return false;
    }
    return true;
}

export function listAvailableAppearances(
    now: Date = new Date(),
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearance[] {
    return appearances.filter(appearance => isAppearanceAvailable(appearance, now));
}

export function getAppearance(
    id: string | null | undefined,
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearance | undefined {
    if (id == null || id === "") return undefined;
    return appearances.find(appearance => appearance.id === id);
}

/**
 * Returns `id` when it is a known, currently available appearance;
 * otherwise Texas HODL (modern). Unknown ids (including retired "nouns")
 * and expired event themes all fall back here.
 */
export function resolveAppearanceId(
    id: string | null | undefined,
    now: Date = new Date(),
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearanceId {
    const found = getAppearance(id, appearances);
    if (found && isAppearanceAvailable(found, now)) return found.id;
    return DEFAULT_TABLE_APPEARANCE_ID;
}

function safeGet(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeSet(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Quota or private-mode failures should not break the in-memory choice.
    }
}

/**
 * The saved appearance, or `fallbackId` (typically VITE_TABLE_STYLE) when
 * nothing is stored. Invalid, retired and out-of-window values are rewritten
 * to the default so the next load is already clean.
 */
export function readStoredAppearanceId(
    now: Date = new Date(),
    fallbackId?: string | null,
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearanceId {
    const saved = safeGet(TABLE_APPEARANCE_STORAGE_KEY);
    if (saved != null && saved !== "") {
        const resolved = resolveAppearanceId(saved, now, appearances);
        if (resolved !== saved) safeSet(TABLE_APPEARANCE_STORAGE_KEY, resolved);
        return resolved;
    }
    return resolveAppearanceId(fallbackId ?? DEFAULT_TABLE_APPEARANCE_ID, now, appearances);
}

export function writeStoredAppearanceId(
    id: string,
    now: Date = new Date(),
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearanceId {
    const resolved = resolveAppearanceId(id, now, appearances);
    safeSet(TABLE_APPEARANCE_STORAGE_KEY, resolved);
    return resolved;
}

/** Next available appearance after `current`, wrapping to the first. Used by the (optional) cycle control. */
export function nextAppearanceId(
    current: string,
    now: Date = new Date(),
    appearances: readonly TableAppearance[] = TABLE_APPEARANCES
): TableAppearanceId {
    const available = listAvailableAppearances(now, appearances);
    if (available.length === 0) return DEFAULT_TABLE_APPEARANCE_ID;
    const index = available.findIndex(appearance => appearance.id === current);
    const next = index < 0 ? 0 : (index + 1) % available.length;
    return available[next].id;
}

/** Test hook: drop any saved appearance. */
export function resetTableAppearanceForTests(): void {
    try {
        localStorage.removeItem(TABLE_APPEARANCE_STORAGE_KEY);
    } catch {
        // jsdom always has localStorage; ignore anyway.
    }
}
