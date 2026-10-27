import { act, render } from "@testing-library/react";
import WinAnimation, { WIN_PULSE_CHIP_FILES, WIN_PULSE_CASH_CHIP_FILES, pickCashPulseChips } from "./WinAnimation";
import { setTableStyle } from "../../../theme/tableStyles";

jest.mock("../../../hooks/game/useWinnerInfo", () => ({
    useWinnerInfo: () => ({ winnerBySeat: new Map([[1, {}]]) })
}));

let mockGameFormat: string | undefined = "sit-and-go";
jest.mock("../../../context/GameStateContext", () => ({
    useGameStateContext: () => ({ gameFormat: mockGameFormat })
}));

const particleUrls = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>(".bubbles li")).map(li => li.style.backgroundImage);

describe("win pulse particles", () => {
    afterEach(() => {
        act(() => setTableStyle("chips", "C"));
        mockGameFormat = "sit-and-go";
    });

    it("draws one chip per particle in the selected chip style", () => {
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        const urls = particleUrls(container);
        expect(urls).toHaveLength(WIN_PULSE_CHIP_FILES.length);
        urls.forEach((url, i) => expect(url).toBe(`url("/assets/chipstyles/A/${WIN_PULSE_CHIP_FILES[i]}")`));
    });

    it("swaps to the new chip set as soon as the setting changes", () => {
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        act(() => setTableStyle("chips", "E"));
        // Sit & Go: Marble swaps to its number chips (no $).
        expect(particleUrls(container)[0]).toBe('url("/assets/chipstyles/E/numbers/25chip.webp")');
    });

    it("floats Marble number chips on tournament and Sit & Go tables, Marble $ chips on cash", () => {
        act(() => setTableStyle("chips", "E"));
        for (const format of ["sit-and-go", "tournament"]) {
            mockGameFormat = format;
            const { container, unmount } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
            particleUrls(container).forEach(url => expect(url).toMatch(/^url\("\/assets\/chipstyles\/E\/numbers\/\d+chip\.webp"\)$/));
            unmount();
        }
        mockGameFormat = "cash";
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        particleUrls(container).forEach(url => expect(url).not.toContain("/numbers/"));
    });

    it("uses the live chips for the Current style, not a generic dot", () => {
        mockGameFormat = "cash";
        act(() => setTableStyle("chips", "current"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        expect(particleUrls(container)[0]).toMatch(/\/chips\/\d+(cent|chip)\.svg/);
    });

    it("keeps the fixed tournament chips on tournaments", () => {
        mockGameFormat = "tournament";
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        expect(particleUrls(container)).toEqual(WIN_PULSE_CHIP_FILES.map(f => `url("/assets/chipstyles/A/${f}")`));
    });

    it.each(["tournament", "sit-and-go"])("draws number chips, not the Current $ chips, on %s tables", format => {
        mockGameFormat = format;
        act(() => setTableStyle("chips", "current"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        expect(particleUrls(container)).toEqual(WIN_PULSE_CHIP_FILES.map(f => `url("/assets/chipstyles/C/${f}")`));
    });

    it("keeps the live $/c chips for the Current style on cash tables", () => {
        mockGameFormat = "cash";
        act(() => setTableStyle("chips", "current"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        particleUrls(container).forEach(url => expect(url).toMatch(/\/chips\/\d+(cent|chip)\.svg/));
    });

    it("uses $/c chips from the cash denomination set on cash tables", () => {
        mockGameFormat = "cash";
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        const files = Array.from(container.querySelectorAll<HTMLElement>(".bubbles li")).map(li => li.dataset.chipFile);
        expect(files).toHaveLength(WIN_PULSE_CHIP_FILES.length);
        files.forEach(f => expect(WIN_PULSE_CASH_CHIP_FILES).toContain(f));
        particleUrls(container).forEach((url, i) => expect(url).toBe(`url("/assets/chipstyles/A/${files[i]}")`));
    });
});

describe("cash pulse chip mix", () => {
    it("is the cent chips plus $1 and $5", () => {
        expect(WIN_PULSE_CASH_CHIP_FILES).toEqual(["5chip.svg", "1chip.svg", "50cent.svg", "25cent.svg", "10cent.svg", "5cent.svg", "1cent.svg"]);
    });

    it("picks a random mix from the cash set", () => {
        const seq = [0, 0.99, 0.3, 0.5, 0.15];
        let n = 0;
        expect(pickCashPulseChips(5, () => seq[n++])).toEqual(["5chip.svg", "1cent.svg", "50cent.svg", "25cent.svg", "1chip.svg"]);
    });
});