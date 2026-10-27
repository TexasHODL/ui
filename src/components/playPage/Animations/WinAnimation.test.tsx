import { act, render } from "@testing-library/react";
import WinAnimation, { WIN_PULSE_CHIP_FILES, WIN_PULSE_RING_COUNT } from "./WinAnimation";
import { setTableStyle } from "../../../theme/tableStyles";

jest.mock("../../../hooks/game/useWinnerInfo", () => ({
    useWinnerInfo: () => ({ winnerBySeat: new Map([[1, {}]]) })
}));

const particleUrls = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>(".bubbles li")).map(li => li.style.backgroundImage);

describe("win pulse particles", () => {
    afterEach(() => act(() => setTableStyle("chips", "C")));

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
        expect(particleUrls(container)[0]).toBe('url("/assets/chipstyles/E/25chip.webp")');
    });

    it("uses the live chips for the Current style, not a generic dot", () => {
        act(() => setTableStyle("chips", "current"));
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        expect(particleUrls(container)[0]).toMatch(/\/chips\/25chip\.svg/);
    });
});

describe("win pulse wave", () => {
    it("draws a steady glow and evenly staggered rings", () => {
        const { container } = render(<WinAnimation index={0} position={{ left: "10px", top: "10px" }} />);
        expect(container.querySelectorAll(".win-animation-glow")).toHaveLength(1);
        const rings = Array.from(container.querySelectorAll<HTMLElement>(".win-animation-ring"));
        expect(rings).toHaveLength(WIN_PULSE_RING_COUNT);
        rings.forEach((r, i) => expect(r.style.getPropertyValue("--win-pulse-ring-index")).toBe(String(i)));
    });
});
