import fs from "fs";
import path from "path";
import {
    CHIP_STYLE_IDS,
    CHIP_STYLE_LABELS,
    DEALER_STYLE_LABELS,
    DECK_IDS,
    DECK_LABELS,
    DEFAULT_TABLE_STYLES,
    STYLE_IDS,
    TABLE_STYLE_STORAGE_KEYS,
    chipStyleUrl,
    dealerStyleUrl,
    deckCardUrl,
    getTableStyles,
    readTableStyles,
    resetTableStylesForTests,
    setTableStyle,
    subscribeTableStyles
} from "./tableStyles";
import { decomposeAmount } from "../utils/chipBreakdown";
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
        expect(DEFAULT_TABLE_STYLES).toEqual({ deck: "block52", chips: "C", dealer: "C" });
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
        expect(getTableStyles()).toEqual({ deck: "M", chips: "current", dealer: "D" });
        resetTableStylesForTests();
        expect(getTableStyles()).toEqual({ deck: "M", chips: "current", dealer: "D" });
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
