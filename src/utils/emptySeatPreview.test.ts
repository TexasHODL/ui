import { emptySeatVariantFromSearch, parseEmptySeatVariant } from "./emptySeatPreview";

describe("parseEmptySeatVariant", () => {
    it("accepts the four mockups and nothing else", () => {
        expect(parseEmptySeatVariant("a")).toBe("a");
        expect(parseEmptySeatVariant("B")).toBe("b");
        expect(parseEmptySeatVariant(" c ")).toBe("c");
        expect(parseEmptySeatVariant("d")).toBe("d");
        expect(parseEmptySeatVariant("e")).toBeNull();
        expect(parseEmptySeatVariant("")).toBeNull();
        expect(parseEmptySeatVariant(null)).toBeNull();
        expect(parseEmptySeatVariant(undefined)).toBeNull();
    });

    it("reads the query and ignores a missing one", () => {
        expect(emptySeatVariantFromSearch("?emptySeat=d&seats=9")).toBe("d");
        expect(emptySeatVariantFromSearch("")).toBeNull();
        expect(emptySeatVariantFromSearch("?format=tournament")).toBeNull();
    });
});
