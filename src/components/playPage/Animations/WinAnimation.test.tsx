import { act, render } from "@testing-library/react";
import WinAnimation, {
    WIN_PULSE_CHIP_FILES,
    WIN_SONAR_RING_COUNT,
    WIN_RIPPLE_RING_COUNT,
    WIN_RIPPLE_WOBBLE_SCALE,
    WIN_CHIPBURST_COUNT,
    WIN_CHIPBURST_SPARKLE_COUNT,
    WIN_CONFETTI_COUNT,
    burstChipFiles
} from "./WinAnimation";
import { WIN_PULSE_STYLES, WinPulseStyleContext, DEFAULT_WIN_PULSE_TUNING } from "./winPulseStyle";
import { setTableStyle } from "../../../theme/tableStyles";

// Seat 1 won $150 (cash, micro-USDC).
jest.mock("../../../hooks/game/useWinnerInfo", () => ({
    useWinnerInfo: () => ({ winnerBySeat: new Map([[1, { amount: "150000000" }]]) })
}));
jest.mock("../../../context/gameState/GameMetaContext", () => ({
    useGameMeta: () => ({ gameFormat: "cash", gameVariant: undefined, gameName: undefined })
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
            ripple: ".win-pulse-ripple-rim",
            spotlight: ".win-pulse-spotlight-beam",
            chipburst: ".win-pulse-chipburst-chip",
            neon: ".win-pulse-neon-tube",
            confetti: ".win-pulse-confetti-piece"
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

    it("leads the ripple with brand orange (pink only as a crest accent), keeping gold for the other styles", () => {
        const css = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        expect(css).toMatch(/--win-ripple-orange: 255, 151, 23;/);
        expect(css).toMatch(/--win-ripple-pink: 240, 43, 198;/);
        expect(css).toMatch(/--win-pulse-color: 255, 196, 30;/);
        const cup = css.match(/\.win-pulse-ripple-cup \{\s*--win-ripple-ring-peak[^}]*\}/)![0];
        expect(cup).toContain("--win-ripple-orange");
        expect(cup).not.toContain("--win-ripple-pink");
        const rim = css.match(/\.win-pulse-ripple-rim \{\s*border[^}]*\}/)![0];
        expect(rim).toContain("--win-ripple-orange");
        expect(rim).not.toContain("--win-pulse-color");
        expect(css).toMatch(/filter: var\(--win-ripple-wobble-filter\)/);
    });

    it("wobbles the ripple with an SVG turbulence filter, keeps highlights inside the cup and nothing above the seat", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="ripple" />);
        const filter = container.querySelector("filter#win-ripple-wobble-0")!;
        expect(filter).not.toBeNull();
        expect(filter.querySelector("feTurbulence animate")).not.toBeNull();
        expect(filter.querySelector("feDisplacementMap")!.getAttribute("scale")).toBe(String(WIN_RIPPLE_WOBBLE_SCALE));
        const root = container.querySelector<HTMLElement>(".win-animation-container")!;
        expect(root.style.getPropertyValue("--win-ripple-wobble-filter")).toBe("url(#win-ripple-wobble-0)");
        expect(container.querySelectorAll(".win-pulse-ripple-cup .win-pulse-ripple-glint")).toHaveLength(3);
        expect(container.querySelector(".win-ripple-overlay")).toBeNull();
        expect(container.children).toHaveLength(1);
    });

    it("syncs the rim flare period to ring arrivals", () => {
        const css = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        const rim = css.match(/\.win-pulse-ripple-rim \{\s*border[^}]*\}/)![0];
        expect(rim).toMatch(/animation: win-ripple-rim calc\(var\(--win-ripple-duration\) \/ var\(--win-pulse-speed\) \/ var\(--win-ripple-rings\)\)/);
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

    it("lists all nine styles", () => {
        expect(WIN_PULSE_STYLES).toEqual(["heartbeat", "sonar", "halo", "breathing", "ripple", "spotlight", "chipburst", "neon", "confetti"]);
    });

    it("draws the spotlight as a beam from above plus a pool on the seat", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="spotlight" />);
        expect(container.querySelectorAll(".win-pulse-spotlight-beam")).toHaveLength(1);
        expect(container.querySelectorAll(".win-pulse-spotlight-pool")).toHaveLength(1);
    });

    it("bursts chips picked cash-aware from the win amount in the selected chip set, with sparkles and a settle glow", () => {
        act(() => setTableStyle("chips", "A"));
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="chipburst" />);
        const chips = Array.from(container.querySelectorAll<HTMLElement>(".win-pulse-chipburst-chip"));
        expect(chips).toHaveLength(WIN_CHIPBURST_COUNT);
        const expected = burstChipFiles("150000000", false);
        chips.forEach((chip, i) => {
            expect(chip.dataset.chipFile).toBe(expected[i]);
            expect(chip.style.backgroundImage).toBe(`url("/assets/chipstyles/A/${expected[i]}")`);
        });
        expect(container.querySelectorAll(".win-pulse-chipburst-sparkle")).toHaveLength(WIN_CHIPBURST_SPARKLE_COUNT);
        expect(container.querySelectorAll(".win-pulse-chipburst-glow")).toHaveLength(1);
        act(() => setTableStyle("chips", "C"));
    });

    it("picks burst chips like the bet chips: $150 cash is a $100 and two $25s; tournament amounts are chips", () => {
        expect(new Set(burstChipFiles("150000000", false))).toEqual(new Set(["100chip.svg", "25chip.svg"]));
        expect(burstChipFiles("150", true)).toEqual(burstChipFiles("150000000", false));
        expect(burstChipFiles(undefined, false)).toHaveLength(WIN_CHIPBURST_COUNT);
        expect(burstChipFiles(undefined, false)[0]).toBe(WIN_PULSE_CHIP_FILES[0]);
    });

    it("replays the one-shot burst and confetti when the replay counter changes", () => {
        (["chipburst", "confetti"] as const).forEach(style => {
            const sel = style === "chipburst" ? ".win-pulse-chipburst-chip" : ".win-pulse-confetti-piece";
            const wrap = (replay: number) => (
                <WinPulseStyleContext.Provider value={{ style, tuning: DEFAULT_WIN_PULSE_TUNING, replay }}>
                    <WinAnimation index={0} position={pos} />
                </WinPulseStyleContext.Provider>
            );
            const { container, rerender, unmount } = render(wrap(0));
            const first = container.querySelector(sel);
            rerender(wrap(0));
            expect(container.querySelector(sel)).toBe(first);
            rerender(wrap(1));
            expect(container.querySelector(sel)).not.toBe(first);
            unmount();
        });
    });

    it("showers confetti in brand colours only", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="confetti" />);
        const pieces = Array.from(container.querySelectorAll<HTMLElement>(".win-pulse-confetti-piece"));
        expect(pieces).toHaveLength(WIN_CONFETTI_COUNT);
        const colors = new Set(pieces.map(p => p.style.getPropertyValue("--win-confetti-color")));
        expect(colors).toEqual(new Set(["var(--win-brand-pink)", "var(--win-brand-orange)", "var(--win-brand-mid)"]));
    });

    it("uses the brand colours for the new styles", () => {
        const css = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        expect(css).toMatch(/--win-brand-pink: #f02bc6;/);
        expect(css).toMatch(/--win-brand-mid: #ff4a83;/);
        expect(css).toMatch(/--win-brand-orange: #ff9717;/);
        const neon = css.match(/\.win-pulse-neon-tube,\s*\.win-pulse-neon-bloom \{[^}]*\}/)![0];
        expect(neon).toContain("--win-brand-orange");
        expect(neon).toContain("--win-brand-pink");
        expect(neon).not.toContain("--win-pulse-color");
    });

    it("respects reduced motion for every new style", () => {
        const css: string = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        const reduced = Array.from(css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)).map(m => m[1]).join("\n");
        [".win-pulse-spotlight-beam", ".win-pulse-spotlight-pool", ".win-pulse-chipburst-burst", ".win-pulse-confetti-shower", ".win-pulse-settle-glow", ".win-pulse-neon-tube"].forEach(sel =>
            expect(reduced).toContain(sel)
        );
    });

    it("draws nothing for a seat that is not a winner", () => {
        const { container } = render(<WinAnimation index={4} position={pos} />);
        expect(container.firstChild).toBeNull();
    });
});
