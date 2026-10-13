import {
    TABLE_NAME_ADJECTIVES,
    TABLE_NAME_NOUNS,
    TABLE_NAME_TERMS,
    GENERATED_TABLE_NAME_LIST_SIZE,
    displayTableName,
    generateTableName
} from "./generatedTableName";

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+){1,2}$/;

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

function assertWordList(words: readonly string[]): void {
    expect(words).toHaveLength(GENERATED_TABLE_NAME_LIST_SIZE);
    expect(new Set(words).size).toBe(GENERATED_TABLE_NAME_LIST_SIZE);
    for (const word of words) {
        expect(word).toMatch(/^[a-z0-9]+$/);
    }
}

describe("generated table name lists", () => {
    it("keeps each list at 200 unique lowercase tokens", () => {
        assertWordList(TABLE_NAME_ADJECTIVES);
        assertWordList(TABLE_NAME_NOUNS);
        assertWordList(TABLE_NAME_TERMS);
    });

    it("does not repeat a word across lists", () => {
        const all = [...TABLE_NAME_ADJECTIVES, ...TABLE_NAME_NOUNS, ...TABLE_NAME_TERMS];
        expect(new Set(all).size).toBe(all.length);
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

    it("emits a lowercase hyphenated name of two or three list words", () => {
        const lengths = new Set<number>();
        const ids = [...SAMPLE_IDS, ...Array.from({ length: 40 }, (_, i) => `table-${i}`)];
        for (const tableId of ids) {
            const name = generateTableName(tableId);
            expect(name).toMatch(NAME_RE);
            expect(name).not.toBe("Table " + tableId.slice(-6));
            const parts = name.split("-");
            expect([2, 3]).toContain(parts.length);
            expect(TABLE_NAME_ADJECTIVES).toContain(parts[0]);
            expect(TABLE_NAME_NOUNS).toContain(parts[1]);
            if (parts.length === 3) {
                expect(TABLE_NAME_TERMS).toContain(parts[2]);
            }
            lengths.add(parts.length);
        }
        expect(lengths).toEqual(new Set([2, 3]));
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
