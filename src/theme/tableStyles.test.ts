import fs from "fs";
import path from "path";
import {
    CARD_BACKS,
    CHIP_STYLE_IDS,
    CHIP_STYLE_LABELS,
    DEALER_STYLE_LABELS,
    DECK_IDS,
    DECK_LABELS,
    DEFAULT_CARD_BACK_ID,
    DEFAULT_TABLE_STYLES,
    STYLE_IDS,
    TABLE_STYLE_STORAGE_KEYS,
    TOURNAMENT_CHIP_STYLE,
    isCardBackAvailable,
    listAvailableCardBacks,
    resolveCardBackId,
    chipStyleForFormat,
    chipStyleUrl,
    dealerStyleUrl,
    deckCardUrl,
    getTableStyles,
    readTableStyles,
    resetTableStylesForTests,
    setTableStyle,
    subscribeTableStyles
} from "./tableStyles";
import { decomposeAmount } from "@block52/poker-ui-core/utils/chipBreakdown";
import { getCardImageUrl } from "../utils/cardImages";

const getCardFaceUrl = (deck: Parameters<typeof deckCardUrl>[0], code: string) => deckCardUrl(deck, code) ?? getCardImageUrl(code);

const ASSETS = path.join(__dirname, "..", "assets");
const CARD_CODES = "23456789TJQKA".split("").flatMap(rank => "SHDC".split("").map(suit => rank + suit));

beforeEach(() => {
    localStorage.clear();
    resetTableStylesForTests();
});

describe("table style choices", () => {
    it("offers Block52 Classic first plus the nine selected decks, by name with no letter prefix", () => {
        expect(DECK_IDS).toEqual(["block52", "C", "D", "H", "J", "K", "M", "N", "O", "P"]);
        expect(DECK_IDS.map(id => DECK_LABELS[id])).toEqual([
            "Block52 Classic", "Minimal Modern", "Brand Night", "HODL Watermark", "Bright Plum", "Spectrum Pastel",
            "Classic Courts", "HODL Courts", "Web3 Holo", "Tech Grid"
        ]);
        expect(CHIP_STYLE_IDS.map(id => CHIP_STYLE_LABELS[id])).toEqual([
            "Current", "Classic casino", "Flat brand", "Crypto coin", "Layered 3D", "Marble"
        ]);
        expect(STYLE_IDS.map(id => DEALER_STYLE_LABELS[id])).toEqual(["Current", "Classic acrylic", "Brand ring", "Clean minimal", "Gold coin", "Marble"]);
    });

    it("defaults to Block52 Classic cards, Crypto coin chips and the Clean minimal dealer button", () => {
        expect(DEFAULT_TABLE_STYLES).toEqual({ deck: "block52", chips: "C", dealer: "C", cardBack: "default" });
        expect(readTableStyles()).toEqual(DEFAULT_TABLE_STYLES);
    });

    it("persists each choice in localStorage and notifies subscribers", () => {
        const listener = jest.fn();
        const unsubscribe = subscribeTableStyles(listener);
        setTableStyle("deck", "M");
        setTableStyle("chips", "current");
        setTableStyle("dealer", "D");
        expect(listener).toHaveBeenCalledTimes(3);
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.deck)).toBe("M");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.chips)).toBe("current");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.dealer)).toBe("D");
        expect(getTableStyles()).toEqual({ deck: "M", chips: "current", dealer: "D", cardBack: "default" });
        resetTableStylesForTests();
        expect(getTableStyles()).toEqual({ deck: "M", chips: "current", dealer: "D", cardBack: "default" });
        unsubscribe();
    });

    it("ignores saved values that are not offered (e.g. a dev-only deck)", () => {
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.deck, "A");
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.chips, "Z");
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.dealer, "");
        expect(readTableStyles()).toEqual(DEFAULT_TABLE_STYLES);
    });

    it("picks up a choice made in another tab", () => {
        const listener = jest.fn();
        const unsubscribe = subscribeTableStyles(listener);
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.deck, "P");
        window.dispatchEvent(new StorageEvent("storage", { key: TABLE_STYLE_STORAGE_KEYS.deck }));
        expect(listener).toHaveBeenCalled();
        expect(getTableStyles().deck).toBe("P");
        unsubscribe();
    });

    it("keeps a saved deck choice; only players with no saved choice get Block52 Classic", () => {
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.deck, "O");
        expect(readTableStyles().deck).toBe("O");
        localStorage.removeItem(TABLE_STYLE_STORAGE_KEYS.deck);
        expect(readTableStyles().deck).toBe("block52");
    });

    it("draws Block52 Classic with the original bundled card faces", () => {
        for (const code of CARD_CODES) expect(deckCardUrl("block52", code)).toBeNull();
        expect(getCardFaceUrl("block52", "AS")).toBe(getCardImageUrl("AS"));
        expect(getCardFaceUrl("O", "AS")).toBe("/assets/decks/O/AS.svg");
    });

    it("keeps the stable snapshot between reads (useSyncExternalStore)", () => {
        expect(getTableStyles()).toBe(getTableStyles());
    });
});

describe("bundled style art", () => {
    it("ships only the offered decks", () => {
        expect(fs.readdirSync(path.join(ASSETS, "decks")).sort()).toEqual(DECK_IDS.filter(id => id !== "block52").sort());
    });

    it.each(DECK_IDS.filter(id => id !== "block52"))("deck %s maps all 52 faces to a valid SVG file", deck => {
        for (const code of CARD_CODES) {
            expect(deckCardUrl(deck, code)).toBe(`/assets/decks/${deck}/${code}.svg`);
            const svg = fs.readFileSync(path.join(ASSETS, "decks", deck, `${code}.svg`), "utf8");
            const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
            expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
            expect(doc.documentElement.nodeName).toBe("svg");
            // An xlink:href with no xlink namespace declared breaks the whole image (deck M bug).
            if (svg.includes("xlink:")) expect(svg).toContain("xmlns:xlink=\"http://www.w3.org/1999/xlink\"");
        }
        expect(deckCardUrl(deck, "??")).toBeNull();
    });

    it("has a styled image for every live chip file, in every chip style", () => {
        const files = new Set<string>();
        for (const amount of [0.01, 0.06, 0.37, 1.66, 7.77, 38.5, 263, 1888, 27777, 388888, 6666666]) {
            decomposeAmount(amount).forEach(stack => files.add(stack.file));
        }
        expect(files.size).toBeGreaterThan(5);
        for (const style of CHIP_STYLE_IDS) {
            for (const file of files) {
                if (style === "current") expect(chipStyleUrl(style, file)).toBeNull();
                else if (style === "E") {
                    // Marble ships as photoreal webp (block52/cards marble set).
                    expect(chipStyleUrl(style, file)).toBe(`/assets/chipstyles/E/${file.replace(/\.svg$/, ".webp")}`);
                } else expect(chipStyleUrl(style, file)).toBe(`/assets/chipstyles/${style}/${file}`);
            }
        }
    });

    it("uses Marble number chips (no $) on tournament / Sit & Go tables, $ chips on cash", () => {
        const files = new Set<string>();
        for (const amount of [1, 7, 38, 263, 1888, 27777, 388888, 6666666]) {
            decomposeAmount(amount, true).forEach(stack => files.add(stack.file));
        }
        for (const file of files) {
            const webp = file.replace(/\.svg$/, ".webp");
            expect(chipStyleUrl("E", file, true)).toBe(`/assets/chipstyles/E/numbers/${webp}`);
            expect(fs.existsSync(path.join(ASSETS, "chipstyles", "E", "numbers", webp))).toBe(true);
            expect(chipStyleUrl("E", file, false)).toBe(`/assets/chipstyles/E/${webp}`);
            // Sets with plain-number art keep their normal files on tournament tables.
            expect(chipStyleUrl("C", file, true)).toBe(`/assets/chipstyles/C/${file}`);
        }
        // Current on a tournament table still swaps to a number set, never the CDN $ chips.
        expect(chipStyleForFormat("current", true)).not.toBe("current");
    });

    it("has a dealer button for every non-current style", () => {
        expect(dealerStyleUrl("current")).toBeNull();
        for (const style of ["A", "B", "C", "D"] as const) {
            expect(dealerStyleUrl(style)).toBe(`/assets/dealerstyles/${style}.svg`);
            const svg = fs.readFileSync(path.join(ASSETS, "dealerstyles", `${style}.svg`), "utf8");
            // Same viewBox as CustomDealer.svg, so the button CSS sizes it identically.
            expect(svg).toContain("viewBox=\"0 0 171 215.249992\"");
        }
        // Marble (E) is a photoreal webp that object-fits the same CSS box.
        expect(dealerStyleUrl("E")).toBe("/assets/dealerstyles/E.webp");
        expect(fs.existsSync(path.join(ASSETS, "dealerstyles", "E.webp"))).toBe(true);
    });
});

describe("chipStyleForFormat", () => {
    it("keeps Current on cash tables (the live $ chips)", () => {
        expect(chipStyleForFormat("current", false)).toBe("current");
    });

    it("swaps Current for a number-chip set on tournament / Sit & Go tables", () => {
        expect(chipStyleForFormat("current", true)).toBe(TOURNAMENT_CHIP_STYLE);
        expect(TOURNAMENT_CHIP_STYLE).not.toBe("current");
    });

    it("leaves a chosen style alone for every format", () => {
        for (const style of CHIP_STYLE_IDS.filter(s => s !== "current")) {
            expect(chipStyleForFormat(style, true)).toBe(style);
            expect(chipStyleForFormat(style, false)).toBe(style);
        }
    });
});

describe("event card backs", () => {
    const viceNights = CARD_BACKS.find(back => back.id === "vice-nights");
    if (!viceNights) throw new Error("expected vice-nights in CARD_BACKS");
    const beforeWindow = new Date("2026-11-17T23:59:59+10:00");
    const atStart = new Date("2026-11-18T00:00:00+10:00");
    const duringWindow = new Date("2026-11-25T12:00:00+10:00");
    const atEnd = new Date("2026-12-03T00:00:00+10:00");
    const afterWindow = new Date("2026-12-03T00:00:01+10:00");

    beforeEach(() => {
        localStorage.clear();
        resetTableStylesForTests();
    });

    it("registers Vice Nights as a windowed card back and hides it outside the window", () => {
        expect(viceNights).toMatchObject({
            id: "vice-nights",
            label: "Vice Nights (limited time)",
            startsAt: "2026-11-18T00:00:00+10:00",
            endsAt: "2026-12-03T00:00:00+10:00"
        });
        expect(isCardBackAvailable(viceNights, beforeWindow)).toBe(false);
        expect(isCardBackAvailable(viceNights, atStart)).toBe(true);
        expect(isCardBackAvailable(viceNights, duringWindow)).toBe(true);
        expect(isCardBackAvailable(viceNights, atEnd)).toBe(false);
        expect(isCardBackAvailable(viceNights, afterWindow)).toBe(false);
        expect(listAvailableCardBacks(beforeWindow).map(back => back.id)).toEqual(["default"]);
        expect(listAvailableCardBacks(duringWindow).map(back => back.id)).toEqual(["default", "vice-nights"]);
        expect(resolveCardBackId("vice-nights", duringWindow)).toBe("vice-nights");
        expect(resolveCardBackId("vice-nights", beforeWindow)).toBe(DEFAULT_CARD_BACK_ID);
        expect(resolveCardBackId("vice-nights", atEnd)).toBe(DEFAULT_CARD_BACK_ID);
    });

    it("falls back to the default card back when a saved event back leaves its window", () => {
        localStorage.setItem(TABLE_STYLE_STORAGE_KEYS.cardBack, "vice-nights");
        expect(readTableStyles(duringWindow).cardBack).toBe("vice-nights");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.cardBack)).toBe("vice-nights");
        resetTableStylesForTests();
        expect(readTableStyles(afterWindow).cardBack).toBe("default");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.cardBack)).toBe("default");
    });

    it("refuses to persist Vice Nights outside its window", () => {
        setTableStyle("cardBack", "vice-nights", beforeWindow);
        expect(getTableStyles().cardBack).toBe("default");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.cardBack)).toBe("default");
        setTableStyle("cardBack", "vice-nights", duringWindow);
        expect(getTableStyles().cardBack).toBe("vice-nights");
        expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.cardBack)).toBe("vice-nights");
    });
});
