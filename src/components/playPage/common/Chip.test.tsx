import { act, render } from "@testing-library/react";
import Chip from "./Chip";
import { setTableStyle } from "../../../theme/tableStyles";

/** Chip file names the pile draws, in render order. */
const chipFiles = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("img")).map(img => (img.getAttribute("src") ?? "").split("/").pop());

const chipSrcs = (container: HTMLElement) => Array.from(container.querySelectorAll("img")).map(img => img.getAttribute("src") ?? "");

describe("Chip: cash vs tournament vs Sit & Go chip art", () => {
    afterEach(() => act(() => setTableStyle("chips", "C")));

    it("cash tables keep the live $ chips on the Current style", () => {
        act(() => setTableStyle("chips", "current"));
        // $1.50 in USDC micro-units: a $1 chip and a 50c chip
        const { container } = render(<Chip amount="1500000" isTournament={false} />);
        expect(chipFiles(container)).toEqual(["1chip.svg", "50cent.svg"]);
        chipSrcs(container).forEach(src => expect(src).toMatch(/\/chips\//));
    });

    it.each([
        ["tournament", true],
        ["sit & go", true]
    ])("%s tables draw number chips, never the Current $ chips", (_label, isTournament) => {
        act(() => setTableStyle("chips", "current"));
        const { container } = render(<Chip amount="2460" isTournament={isTournament} />);
        // 2,460 chips = 2 x 1000, 4 x 100, 2 x 25, 2 x 5
        expect(chipFiles(container)).toEqual([
            "1000chip.svg", "1000chip.svg",
            "100chip.svg", "100chip.svg", "100chip.svg", "100chip.svg",
            "25chip.svg", "25chip.svg",
            "5chip.svg", "5chip.svg"
        ]);
        chipSrcs(container).forEach(src => expect(src).toMatch(/^\/assets\/chipstyles\/C\//));
    });

    it("tournament tables follow a chosen chip style", () => {
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<Chip amount="1300" isTournament />);
        expect(chipSrcs(container)).toEqual(["/assets/chipstyles/A/1000chip.svg", "/assets/chipstyles/A/100chip.svg", "/assets/chipstyles/A/100chip.svg", "/assets/chipstyles/A/100chip.svg"]);
    });

    it("tournament amounts never use cent chips", () => {
        const { container } = render(<Chip amount="0" isTournament />);
        expect(chipFiles(container)).toEqual(["1chip.svg"]);
    });
});
