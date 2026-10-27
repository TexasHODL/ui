import { act, render } from "@testing-library/react";
import WinAnimation, { WIN_PULSE_CHIP_FILES, WIN_SONAR_RING_COUNT, WIN_RIPPLE_RING_COUNT } from "./WinAnimation";
import { WIN_PULSE_STYLES, WinPulseStyleContext, DEFAULT_WIN_PULSE_TUNING } from "./winPulseStyle";
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

describe("win pulse styles", () => {
    const pos = { left: "10px", top: "10px" };
    const styleOf = (container: HTMLElement) => container.querySelector<HTMLElement>(".win-animation-container")?.dataset.winPulseStyle;

    it("defaults to the heartbeat border", () => {
        const { container } = render(<WinAnimation index={0} position={pos} />);
        expect(styleOf(container)).toBe("heartbeat");
        expect(container.querySelectorAll(".win-pulse-heartbeat-border")).toHaveLength(1);
    });

    it("draws distinct layers for every style, keeping the chip particles", () => {
        const layer: Record<string, string> = {
            heartbeat: ".win-pulse-heartbeat-border",
            sonar: ".win-pulse-sonar-ring",
            halo: ".win-pulse-halo-comet",
            breathing: ".win-pulse-breathing-border",
            ripple: ".win-pulse-ripple-rim"
        };
        WIN_PULSE_STYLES.forEach(style => {
            const { container, unmount } = render(<WinAnimation index={0} position={pos} winPulseStyle={style} />);
            expect(container.querySelector(".win-animation-container")).toHaveClass(`win-pulse-${style}`);
            WIN_PULSE_STYLES.filter(other => other !== style).forEach(other => expect(container.querySelector(layer[other])).toBeNull());
            expect(container.querySelector(layer[style])).not.toBeNull();
            expect(container.querySelectorAll(".bubbles li")).toHaveLength(WIN_PULSE_CHIP_FILES.length);
            unmount();
        });
    });

    it("staggers the sonar rings evenly", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="sonar" />);
        const rings = Array.from(container.querySelectorAll<HTMLElement>(".win-pulse-sonar-ring"));
        expect(rings).toHaveLength(WIN_SONAR_RING_COUNT);
        rings.forEach((r, i) => expect(r.style.getPropertyValue("--win-sonar-index")).toBe(String(i)));
    });

    it("draws the ripple as a filled cup with evenly staggered rings inside and a glowing rim", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="ripple" />);
        const cup = container.querySelector(".win-pulse-ripple-cup")!;
        expect(cup).not.toBeNull();
        const rings = Array.from(cup.querySelectorAll<HTMLElement>(".win-pulse-ripple-ring"));
        expect(rings).toHaveLength(WIN_RIPPLE_RING_COUNT);
        rings.forEach((r, i) => expect(r.style.getPropertyValue("--win-ripple-index")).toBe(String(i)));
        expect(container.querySelectorAll(".win-pulse-ripple-rim")).toHaveLength(1);
        expect(container.querySelectorAll(".bubbles li")).toHaveLength(WIN_PULSE_CHIP_FILES.length);
    });

    it("takes style and tuning from context, and the prop wins", () => {
        const value = { style: "halo" as const, tuning: { ...DEFAULT_WIN_PULSE_TUNING, speed: 2 } };
        const { container, rerender } = render(
            <WinPulseStyleContext.Provider value={value}><WinAnimation index={0} position={pos} /></WinPulseStyleContext.Provider>
        );
        expect(styleOf(container)).toBe("halo");
        expect(container.querySelector<HTMLElement>(".win-animation-container")!.style.getPropertyValue("--win-pulse-speed")).toBe("2");
        rerender(
            <WinPulseStyleContext.Provider value={value}><WinAnimation index={0} position={pos} winPulseStyle="sonar" /></WinPulseStyleContext.Provider>
        );
        expect(styleOf(container)).toBe("sonar");
    });

    it("draws nothing for a seat that is not a winner", () => {
        const { container } = render(<WinAnimation index={4} position={pos} />);
        expect(container.firstChild).toBeNull();
    });
});
