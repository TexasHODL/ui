import fs from "fs";
import path from "path";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
import { SEAT_OPACITY } from "@block52/poker-ui-core/utils/seatOpacity";

/**
 * #273 moved seatOpacity.ts (and chip color class names) into packages/core.
 * Tailwind only emits a utility if it sees the class string in `content`.
 * After that move, .opacity-60 was missing from the CSS and folded seats
 * no longer dimmed, even though getSeatOpacityClass still returned the class.
 */
describe("Tailwind content includes packages/core utilities", () => {
    const configPath = path.join(__dirname, "../../tailwind.config.js");
    // Require is how the CLI loads this CJS config.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(configPath) as { content: string[] };

    it("scans @block52/poker-ui-core source for class names", () => {
        expect(config.content).toEqual(expect.arrayContaining(["./src/**/*.{js,ts,jsx,tsx}", "./packages/core/src/**/*.{js,ts,jsx,tsx}"]));
    });

    it("emits the folded-seat opacity utility from SEAT_OPACITY", async () => {
        const input = fs.readFileSync(path.join(__dirname, "../../src/index.css"), "utf8");
        const result = await postcss([tailwindcss(config)]).process(input, { from: undefined });
        // Tailwind may emit "opacity: 0.6" or "opacity: .6" with various spacing.
        expect(result.css).toMatch(/\.opacity-60\s*\{[^}]*opacity:\s*0?\.6/);
        expect(result.css).toMatch(new RegExp(`\\.${SEAT_OPACITY.FOLDED}\\s*\\{`));
        expect(result.css).toMatch(new RegExp(`\\.${SEAT_OPACITY.LOST}\\s*\\{`));
        expect(result.css).toMatch(new RegExp(`\\.${SEAT_OPACITY.IDLE}\\s*\\{`));
    }, 20000);
});
