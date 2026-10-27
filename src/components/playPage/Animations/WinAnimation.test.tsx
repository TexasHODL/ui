import { act, render } from "@testing-library/react";
import WinAnimation, {
    WIN_PULSE_CHIP_FILES,
    WIN_RIPPLE_RING_COUNT,
    WIN_RIPPLE_WOBBLE_SCALE,
    WIN_CHIPBURST_COUNT,
    WIN_CHIPBURST_SPARKLE_COUNT,
    WIN_CONFETTI_COUNT,
    WIN_FIREWORK_BURSTS,
    WIN_FIREWORK_SPARKS,
    WIN_GLITTER_COUNT,
    WIN_POTSTREAM_SPARKLES,
    burstChipFiles,
    measurePotVector
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

    it("defaults to the breathing border", () => {
        const { container } = render(<WinAnimation index={0} position={pos} />);
        expect(styleOf(container)).toBe("breathing");
        expect(container.querySelectorAll(".win-pulse-breathing-border")).toHaveLength(1);
    });

    it("draws distinct layers for every style, keeping the chip particles", () => {
        const layer: Record<string, string> = {
            breathing: ".win-pulse-breathing-border",
            ripple: ".win-pulse-ripple-rim",
            chipburst: ".win-pulse-chipburst-chip",
            neon: ".win-pulse-neon-tube",
            confetti: ".win-pulse-confetti-piece",
            fireworks: ".win-pulse-fireworks-spark",
            glitter: ".win-pulse-glitter-mote",
            cardfan: ".win-pulse-cardfan-glow",
            aura: ".win-pulse-aura-ring",
            potstream: ".win-pulse-potstream-beam"
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
        const value = { style: "ripple" as const, tuning: { ...DEFAULT_WIN_PULSE_TUNING, speed: 2 } };
        const { container, rerender } = render(
            <WinPulseStyleContext.Provider value={value}><WinAnimation index={0} position={pos} /></WinPulseStyleContext.Provider>
        );
        expect(styleOf(container)).toBe("ripple");
        expect(container.querySelector<HTMLElement>(".win-animation-container")!.style.getPropertyValue("--win-pulse-speed")).toBe("2");
        rerender(
            <WinPulseStyleContext.Provider value={value}><WinAnimation index={0} position={pos} winPulseStyle="neon" /></WinPulseStyleContext.Provider>
        );
        expect(styleOf(container)).toBe("neon");
    });

    it("lists all ten styles, the original five first", () => {
        expect(WIN_PULSE_STYLES).toEqual([
            "breathing", "ripple", "chipburst", "neon", "confetti",
            "fireworks", "glitter", "cardfan", "aura", "potstream"
        ]);
    });

    it("pops staggered firework bursts of brand-coloured sparks, then a settle glow", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="fireworks" />);
        const bursts = Array.from(container.querySelectorAll<HTMLElement>(".win-pulse-fireworks-burst"));
        expect(bursts).toHaveLength(WIN_FIREWORK_BURSTS);
        expect(new Set(bursts.map(b => b.style.getPropertyValue("--win-fw-delay"))).size).toBe(WIN_FIREWORK_BURSTS);
        expect(container.querySelectorAll(".win-pulse-fireworks-spark")).toHaveLength(WIN_FIREWORK_BURSTS * WIN_FIREWORK_SPARKS);
        const colors = new Set(Array.from(container.querySelectorAll<HTMLElement>(".win-pulse-fireworks-spark")).map(s => s.style.getPropertyValue("--win-fw-color")));
        expect(colors).toEqual(new Set(["var(--win-brand-orange)", "var(--win-brand-pink)", "var(--win-brand-mid)"]));
        expect(container.querySelectorAll(".win-pulse-fireworks-glow")).toHaveLength(1);
    });

    it("swirls glitter motes on orbits round the seat", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="glitter" />);
        expect(container.querySelectorAll(".win-pulse-glitter-orbit .win-pulse-glitter-mote")).toHaveLength(WIN_GLITTER_COUNT);
        expect(container.querySelectorAll(".win-pulse-glitter-star").length).toBeGreaterThan(0);
        expect(container.querySelectorAll(".win-pulse-glitter-reverse").length).toBeGreaterThan(0);
    });

    it("cardfan only adds a glow plus a replay-parity class; the card motion is CSS on the sibling seat's fan slots", () => {
        const wrap = (replay: number) => (
            <WinPulseStyleContext.Provider value={{ style: "cardfan", tuning: DEFAULT_WIN_PULSE_TUNING, replay }}>
                <WinAnimation index={0} position={pos} />
            </WinPulseStyleContext.Provider>
        );
        const { container, rerender } = render(wrap(0));
        const root = () => container.querySelector<HTMLElement>(".win-animation-container")!;
        expect(root()).toHaveClass("win-pulse-cardfan", "win-pulse-replay-0");
        expect(container.querySelectorAll(".win-pulse-cardfan-glow")).toHaveLength(1);
        rerender(wrap(1));
        expect(root()).toHaveClass("win-pulse-replay-1");
        const css: string = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        // Transforms only, on the slots (never the images, which carry the win-card lift).
        expect(css).toMatch(/\.win-pulse-cardfan ~ \* \.hole-card-fan-slot \{/);
        expect(css).toMatch(/\.win-pulse-cardfan\.win-pulse-replay-1 ~ \* \.hole-card-fan-slot \{ animation-name: win-cardfan-left-1; \}/);
        const fan = css.match(/@keyframes win-cardfan-left-0 \{[\s\S]*?\n\}/)![0];
        expect(fan).not.toMatch(/width|height|margin|left:|top:/);
    });

    it("draws the aura as a flowing band plus drifting orange, pink and purple blobs", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="aura" />);
        expect(container.querySelectorAll(".win-pulse-aura-sky .win-pulse-aura-ring")).toHaveLength(1);
        expect(container.querySelectorAll(".win-pulse-aura-blob")).toHaveLength(3);
        const css: string = require("fs").readFileSync(require("path").join(__dirname, "WinAnimation.css"), "utf8");
        expect(css).toMatch(/--win-brand-purple-rgb: /);
    });

    it("streams light and sparkles towards the seat, falling back to straight up without layout", () => {
        const { container } = render(<WinAnimation index={0} position={pos} winPulseStyle="potstream" />);
        const path = container.querySelector<HTMLElement>(".win-pulse-potstream-path")!;
        expect(path.dataset.measured).toBe("1");
        expect(path.style.getPropertyValue("--win-stream-dy")).toBe("-160px");
        expect(path.style.getPropertyValue("--win-stream-len")).toBe("160px");
        expect(path.style.getPropertyValue("--win-stream-angle")).toBe("90deg");
        expect(container.querySelectorAll(".win-pulse-potstream-sparkle")).toHaveLength(WIN_POTSTREAM_SPARKLES);
        expect(container.querySelectorAll(".win-pulse-potstream-glow")).toHaveLength(1);
    });

    it("measures the pot vector in unscaled seat px", () => {
        const table = document.createElement("div");
        const seat = document.createElement("div");
        const pot = document.createElement("div");
        pot.className = "pot-pill";
        table.append(seat, pot);
        document.body.append(table);
        const rect = (x: number, y: number, w: number, h: number) => ({ left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, x, y, toJSON: () => ({}) }) as DOMRect;
        Object.defineProperty(seat, "offsetWidth", { value: 240 });
        seat.getBoundingClientRect = () => rect(100, 400, 120, 65); // table drawn at 0.5x
        pot.getBoundingClientRect = () => rect(300, 200, 40, 20);
        expect(measurePotVector(seat)).toEqual({ dx: 320, dy: -445 });
        table.remove();
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
        const sels = {
            chipburst: ".win-pulse-chipburst-chip",
            confetti: ".win-pulse-confetti-piece",
            fireworks: ".win-pulse-fireworks-spark",
            potstream: ".win-pulse-potstream-beam"
        } as const;
        (Object.keys(sels) as (keyof typeof sels)[]).forEach(style => {
            const sel = sels[style];
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
        [
            ".win-pulse-chipburst-burst", ".win-pulse-confetti-shower", ".win-pulse-settle-glow", ".win-pulse-neon-tube",
            ".win-pulse-fireworks-sky", ".win-pulse-potstream-path", ".win-pulse-cardfan ~ * .hole-card-fan-slot",
            ".win-pulse-glitter-orbit", ".win-pulse-glitter-mote", ".win-pulse-aura-ring", ".win-pulse-aura-blob"
        ].forEach(sel =>
            expect(reduced).toContain(sel)
        );
    });

    it("draws nothing for a seat that is not a winner", () => {
        const { container } = render(<WinAnimation index={4} position={pos} />);
        expect(container.firstChild).toBeNull();
    });
});
