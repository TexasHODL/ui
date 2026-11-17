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

    const viceNights = TABLE_APPEARANCES.find(appearance => appearance.id === "vice-nights");
    if (!viceNights) throw new Error("expected vice-nights in TABLE_APPEARANCES");
    const beforeViceNights = new Date("2026-11-17T23:59:59+10:00");
    const atViceNightsStart = new Date("2026-11-18T00:00:00+10:00");
    const duringViceNights = new Date("2026-11-25T12:00:00+10:00");
    const atViceNightsEnd = new Date("2026-12-03T00:00:00+10:00");
    const afterViceNights = new Date("2026-12-03T00:00:01+10:00");

    it("lists Texas HODL and Classic as the permanent options, plus the windowed Vice Nights event", () => {
        expect(TABLE_APPEARANCES.map(appearance => ({ id: appearance.id, label: appearance.label }))).toEqual([
            { id: "modern", label: "Texas HODL" },
            { id: "classic", label: "Classic" },
            { id: "vice-nights", label: "Vice Nights (limited time)" }
        ]);
        expect(viceNights?.startsAt).toBe("2026-11-18T00:00:00+10:00");
        expect(viceNights?.endsAt).toBe("2026-12-03T00:00:00+10:00");
        expect(listAvailableAppearances(beforeViceNights).map(appearance => appearance.id)).toEqual(["modern", "classic"]);
    });

    it("shows Vice Nights inside its window and hides it before startsAt and from endsAt onwards", () => {
        expect(isAppearanceAvailable(viceNights, beforeViceNights)).toBe(false);
        expect(isAppearanceAvailable(viceNights, atViceNightsStart)).toBe(true);
        expect(isAppearanceAvailable(viceNights, duringViceNights)).toBe(true);
        expect(isAppearanceAvailable(viceNights, atViceNightsEnd)).toBe(false);
        expect(isAppearanceAvailable(viceNights, afterViceNights)).toBe(false);
        expect(listAvailableAppearances(duringViceNights).map(appearance => appearance.id)).toEqual([
            "modern",
            "classic",
            "vice-nights"
        ]);
        expect(resolveAppearanceId("vice-nights", duringViceNights)).toBe("vice-nights");
        expect(resolveAppearanceId("vice-nights", beforeViceNights)).toBe("modern");
        expect(resolveAppearanceId("vice-nights", atViceNightsEnd)).toBe("modern");
    });

    it("falls back to Texas HODL when a saved Vice Nights choice leaves its window", () => {
        localStorage.setItem(TABLE_APPEARANCE_STORAGE_KEY, "vice-nights");
        expect(readStoredAppearanceId(duringViceNights)).toBe("vice-nights");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("vice-nights");
        expect(readStoredAppearanceId(afterViceNights)).toBe("modern");
        expect(localStorage.getItem(TABLE_APPEARANCE_STORAGE_KEY)).toBe("modern");
    });

    it("hides a windowed appearance before startsAt and from endsAt onwards, and shows it inside the window", () => {
        expect(isAppearanceAvailable(EVENT, beforeWindow)).toBe(false);
        expect(isAppearanceAvailable(EVENT, atStart)).toBe(true);
        expect(isAppearanceAvailable(EVENT, duringWindow)).toBe(true);
        expect(isAppearanceAvailable(EVENT, atEnd)).toBe(false);
        expect(isAppearanceAvailable(EVENT, afterWindow)).toBe(false);
        expect(listAvailableAppearances(beforeWindow, CATALOG).map(appearance => appearance.id)).toEqual(["modern", "classic", "vice-nights"]);
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
        expect(nextAppearanceId("classic", beforeWindow, CATALOG)).toBe("vice-nights");
        expect(nextAppearanceId("vice-nights", beforeWindow, CATALOG)).toBe("modern");
        expect(nextAppearanceId("nouns", duringWindow, CATALOG)).toBe("modern");
    });
});
