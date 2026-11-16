import {
    DEFAULT_TABLE_APPEARANCE_ID,
    TABLE_APPEARANCE_STORAGE_KEY,
    TABLE_APPEARANCES,
    isAppearanceAvailable,
    listAvailableAppearances,
    nextAppearanceId,
    readStoredAppearanceId,
    resetTableAppearanceForTests,
    resolveAppearanceId,
    writeStoredAppearanceId,
    type TableAppearance
} from "./tableAppearances";

const EVENT: TableAppearance = {
    id: "holiday",
    label: "Holiday",
    startsAt: "2026-12-01T00:00:00.000Z",
    endsAt: "2027-01-05T00:00:00.000Z"
};

const CATALOG: readonly TableAppearance[] = [...TABLE_APPEARANCES, EVENT];

const beforeWindow = new Date("2026-11-30T23:59:59.000Z");
const atStart = new Date("2026-12-01T00:00:00.000Z");
const duringWindow = new Date("2026-12-15T12:00:00.000Z");
const atEnd = new Date("2027-01-05T00:00:00.000Z");
const afterWindow = new Date("2027-01-05T00:00:01.000Z");

describe("table appearances registry", () => {
    beforeEach(() => {
        localStorage.clear();
        resetTableAppearanceForTests();
    });

    it("lists Texas HODL and Classic as the permanent options", () => {
        expect(TABLE_APPEARANCES.map(appearance => ({ id: appearance.id, label: appearance.label }))).toEqual([
            { id: "modern", label: "Texas HODL" },
            { id: "classic", label: "Classic" }
        ]);
        expect(listAvailableAppearances().map(appearance => appearance.id)).toEqual(["modern", "classic"]);
    });

    it("hides a windowed appearance before startsAt and from endsAt onwards, and shows it inside the window", () => {
        expect(isAppearanceAvailable(EVENT, beforeWindow)).toBe(false);
        expect(isAppearanceAvailable(EVENT, atStart)).toBe(true);
        expect(isAppearanceAvailable(EVENT, duringWindow)).toBe(true);
        expect(isAppearanceAvailable(EVENT, atEnd)).toBe(false);
        expect(isAppearanceAvailable(EVENT, afterWindow)).toBe(false);
        expect(listAvailableAppearances(beforeWindow, CATALOG).map(appearance => appearance.id)).toEqual(["modern", "classic"]);
        expect(listAvailableAppearances(duringWindow, CATALOG).map(appearance => appearance.id)).toEqual([
            "modern",
            "classic",
            "holiday"
        ]);
        expect(listAvailableAppearances(atEnd, CATALOG).map(appearance => appearance.id)).toEqual(["modern", "classic"]);
    });

    it("falls back to Texas HODL for unknown, retired and out-of-window ids", () => {
        expect(resolveAppearanceId(undefined)).toBe(DEFAULT_TABLE_APPEARANCE_ID);
        expect(resolveAppearanceId("")).toBe("modern");
        expect(resolveAppearanceId("nouns")).toBe("modern");
        expect(resolveAppearanceId("classic")).toBe("classic");
        expect(resolveAppearanceId("holiday", duringWindow, CATALOG)).toBe("holiday");
        expect(resolveAppearanceId("holiday", beforeWindow, CATALOG)).toBe("modern");
        expect(resolveAppearanceId("holiday", atEnd, CATALOG)).toBe("modern");
    });

    it("keeps a saved Classic choice and rewrites a saved Nouns choice to the default", () => {
        localStorage.setItem(TABLE_APPEARANCE_STORAGE_KEY, "classic");
        expect(readStoredAppearanceId()).toBe("classic");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("classic");

        localStorage.setItem(TABLE_APPEARANCE_STORAGE_KEY, "nouns");
        expect(readStoredAppearanceId()).toBe("modern");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("modern");
    });

    it("falls back when a saved event appearance leaves its window", () => {
        localStorage.setItem(TABLE_APPEARANCE_STORAGE_KEY, "holiday");
        expect(readStoredAppearanceId(duringWindow, undefined, CATALOG)).toBe("holiday");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("holiday");
        expect(readStoredAppearanceId(afterWindow, undefined, CATALOG)).toBe("modern");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("modern");
    });

    it("uses the env fallback only when nothing is stored, and rejects a retired env value", () => {
        expect(readStoredAppearanceId(new Date(), "classic")).toBe("classic");
        expect(readStoredAppearanceId(new Date(), "nouns")).toBe("modern");
        localStorage.setItem(TABLE_APPEARANCE_STORAGE_KEY, "classic");
        expect(readStoredAppearanceId(new Date(), "modern")).toBe("classic");
    });

    it("persists a valid choice and refuses to persist an unavailable one", () => {
        expect(writeStoredAppearanceId("classic")).toBe("classic");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("classic");
        expect(writeStoredAppearanceId("nouns")).toBe("modern");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("modern");
    });

    it("cycles through currently available appearances and skips ones outside their window", () => {
        expect(nextAppearanceId("modern", duringWindow, CATALOG)).toBe("classic");
        expect(nextAppearanceId("classic", duringWindow, CATALOG)).toBe("holiday");
        expect(nextAppearanceId("holiday", duringWindow, CATALOG)).toBe("modern");
        expect(nextAppearanceId("classic", beforeWindow, CATALOG)).toBe("modern");
        expect(nextAppearanceId("nouns", duringWindow, CATALOG)).toBe("modern");
    });
});
