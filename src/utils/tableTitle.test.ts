import { displayTableName } from "./generatedTableName";
import { tableHeading, tableTitle } from "./tableTitle";

const TOURNAMENT = "0xface4d5c131b7d806a87883d234dd1929a296c5e01b904e293d24dbe2eada97e";
const REBALANCED = "0x7375abcd131b7d806a87883d234dd1929a296c5e01b904e293d24dbe2eada97e";

describe("tableTitle", () => {
    it("shows the short tournament id and table number for a tournament table", () => {
        expect(tableTitle(`${TOURNAMENT}-t1`)).toBe("Table face/1");
        expect(tableTitle(`${TOURNAMENT}-t12`)).toBe("Table face/12");
    });

    it("lowercases the short id", () => {
        expect(tableTitle("0xAE78AAAA-t3")).toBe("Table ae78/3");
    });

    it("prefers the table's own name", () => {
        expect(tableTitle(`${TOURNAMENT}-t1`, "Friday Turbo")).toBe("Friday Turbo");
    });

    it("keeps the last five characters of any other table id", () => {
        expect(tableTitle("0xabcdef0123456789")).toBe("Table 56789");
    });

    it("does not mistake a lookalike id for a tournament table", () => {
        expect(tableTitle("0xnothex-t1")).toBe("Table ex-t1");
        expect(tableTitle("0xabc-t")).toBe("Table abc-t");
    });

    it("renders an empty title while the id is not known", () => {
        expect(tableTitle(undefined)).toBe("Table ");
        expect(tableTitle("")).toBe("Table ");
    });
});

describe("tableHeading", () => {
    it("shows the tournament name and table number for a directed table", () => {
        expect(tableHeading(`${TOURNAMENT}-t1`, undefined, "Blind War")).toBe("Blind War · Table 1");
        expect(tableHeading(`${TOURNAMENT}-t12`, undefined, "Blind War")).toBe("Blind War · Table 12");
    });

    it("uses the tournament name for a rebalanced table that has no name of its own", () => {
        expect(tableHeading(`${REBALANCED}-t3`)).not.toBe("Table 7375/3");
        expect(tableHeading(`${REBALANCED}-t3`, undefined, "Blind War")).toBe("Blind War · Table 3");
        expect(tableHeading(`${REBALANCED}-t3`)).toBe(`${displayTableName(undefined, REBALANCED)} · Table 3`);
    });

    it("falls back to the table's own name, then the name generated from the tournament id", () => {
        expect(tableHeading(`${TOURNAMENT}-t1`, "Friday Turbo")).toBe("Friday Turbo · Table 1");
        expect(tableHeading(`${TOURNAMENT}-t1`)).toBe(`${displayTableName(undefined, TOURNAMENT)} · Table 1`);
    });

    it("prefers the tournament record's name over the table's own name", () => {
        expect(tableHeading(`${TOURNAMENT}-t2`, "Table leftover", "Blind War")).toBe("Blind War · Table 2");
    });

    it("keeps the generated name for any other table", () => {
        expect(tableHeading("0xabcdef0123456789")).toBe(displayTableName(undefined, "0xabcdef0123456789"));
        expect(tableHeading(undefined)).toBe(displayTableName(undefined, ""));
    });
});
