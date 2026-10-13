import { GENERATED_TABLE_NAMES, GENERATED_TABLE_NAME_LIST_SIZE, displayTableName, generateTableName } from "./generatedTableName";

const NAME_RE = /^[A-Z][a-z]*(?:'[a-z]+)? [A-Z][a-z]*(?:'[a-z]+)?$/;

const SAMPLE_IDS = [
    "",
    "a",
    "7bdb18",
    "0x7bdb18",
    "0x031d57314cc4ba07a0ae7edaa0c8c9ff3507dc81b8af99ac8cfe5ba9f5f9aea9",
    "0x04f1842c05bd9ef5c8339e2ac4b0d36131d4b9e791f425bd175b0ec1eddbb097",
    "friday-degens",
    "table-7bdb18"
];

const EXAMPLES = [
    "Satoshi's Flush",
    "Bitcoin Bluff",
    "Whale Raise",
    "Block Bluff",
    "Ledger Limp",
    "Hodl Em",
    "Crypto Cooler",
    "Wallet Rekt",
    "Token Tilt",
    "Moon River",
    "Satoshi Shove",
    "Diamond Hands",
    "Moon Flush",
    "Rug Pull",
    "Pocket Rockets",
    "Bluff Ridge",
    "Lambo Lounge",
    "Full Send",
    "Degen Den",
    "Paper Hands",
    "Bull Run",
    "Royal Flush",
    "All In"
];

describe("generated table names", () => {
    it("keeps one list of 200 unique two-word names", () => {
        expect(GENERATED_TABLE_NAMES).toHaveLength(GENERATED_TABLE_NAME_LIST_SIZE);
        expect(new Set(GENERATED_TABLE_NAMES).size).toBe(GENERATED_TABLE_NAME_LIST_SIZE);
        for (const name of GENERATED_TABLE_NAMES) {
            expect(name).toMatch(NAME_RE);
            expect(name.split(" ")).toHaveLength(2);
            expect(name).not.toContain("-");
        }
    });

    it("includes the hand-written examples", () => {
        for (const name of EXAMPLES) {
            expect(GENERATED_TABLE_NAMES).toContain(name);
        }
    });
});

describe("generateTableName", () => {
    it("is deterministic for the full table id", () => {
        for (const tableId of SAMPLE_IDS) {
            expect(generateTableName(tableId)).toBe(generateTableName(tableId));
        }
        const again = SAMPLE_IDS.map(generateTableName);
        expect(SAMPLE_IDS.map(generateTableName)).toEqual(again);
    });

    it("uses the full id, so a shared suffix can still differ", () => {
        const suffix = "7bdb18";
        const first = "0xaaa111" + suffix;
        const second = "0xbbb222" + suffix;
        expect(first.slice(-6)).toBe(second.slice(-6));
        expect(generateTableName(first)).not.toBe(generateTableName(second));
        expect(generateTableName(first)).not.toBe(generateTableName(suffix));
    });

    it("picks one curated name", () => {
        const ids = [...SAMPLE_IDS, ...Array.from({ length: 40 }, (_, i) => `table-${i}`)];
        const seen = new Set<string>();
        for (const tableId of ids) {
            const name = generateTableName(tableId);
            expect(GENERATED_TABLE_NAMES).toContain(name);
            expect(name).toMatch(NAME_RE);
            expect(name).not.toBe("Table " + tableId.slice(-6));
            seen.add(name);
        }
        expect(seen.size).toBeGreaterThan(1);
    });
});

describe("displayTableName", () => {
    const tableId = "0x031d57314cc4ba07a0ae7edaa0c8c9ff3507dc81b8af99ac8cfe5ba9f5f9aea9";

    it("shows a custom name and ignores the table id", () => {
        expect(displayTableName("friday-degens", tableId)).toBe("friday-degens");
        expect(displayTableName("friday-degens", "other-id")).toBe("friday-degens");
        expect(displayTableName("  friday-degens  ", tableId)).toBe("friday-degens");
        expect(displayTableName("Friday game", tableId)).toBe("Friday game");
    });

    it("generates a name when the custom name is missing or blank", () => {
        const generated = generateTableName(tableId);
        expect(displayTableName(undefined, tableId)).toBe(generated);
        expect(displayTableName(null, tableId)).toBe(generated);
        expect(displayTableName("", tableId)).toBe(generated);
        expect(displayTableName("   ", tableId)).toBe(generated);
        expect(displayTableName("\t\n", tableId)).toBe(generated);
    });
});
