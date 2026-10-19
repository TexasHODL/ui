import { readFileSync } from "fs";

/**
 * The advanced custom-params modal is upstream Block52 code. These forms must
 * not offer it, and must not keep a hidden path that still writes those params.
 */
describe("create table advanced options entry", () => {
    const pages = ["src/pages/Dashboard.tsx", "src/pages/TableAdminPage.tsx"];

    it("removes the button and the panel from both create-table forms", () => {
        for (const page of pages) {
            const source = readFileSync(page, "utf8");
            expect(source).not.toContain("Advanced Options");
            expect(source).not.toContain("AdvancedSngParamsModal");
            expect(source).not.toContain("applyAdvanced");
            expect(source).not.toContain("handleApplyAdvancedParams");
            expect(source).not.toContain("customBlinds");
            expect(source).not.toContain("showAdvanced");
        }
    });

    it("keeps the upstream custom-params parser and modal", () => {
        expect(readFileSync("src/utils/sngAdvancedParams.ts", "utf8")).toContain("export function parseAdvancedSngParams");
        expect(readFileSync("src/components/modals/AdvancedSngParamsModal.tsx", "utf8")).toContain("Advanced Options (Custom Params)");
    });
});
