import { BLIND_LEVELS_AHEAD, buildBlindLadder, formatBlindCountdown, formatLevelStartsIn } from "./blindStructure";
import type { BlindLevelInfo } from "../hooks/game/useBlindLevel";

const makeInfo = (overrides: Partial<BlindLevelInfo> = {}): BlindLevelInfo => ({
    level: 0,
    smallBlind: 50,
    bigBlind: 100,
    nextSmallBlind: 100,
    nextBigBlind: 200,
    currentBlindsFormatted: "50/100",
    nextBlindsFormatted: "100/200",
    secondsRemaining: 120,
    levelDurationSeconds: 300,
    isActive: true,
    hasTimer: true,
    ...overrides
});

describe("buildBlindLadder — a doubling table (no blind structure)", () => {
    it("lists every level from the starting blinds to a dozen levels ahead", () => {
        const { rows, hasFullSchedule, summary, hasAnte } = buildBlindLadder(makeInfo());

        expect(hasFullSchedule).toBe(true);
        expect(summary).toBe("Starts 50/100 · doubles every 5 min");
        expect(hasAnte).toBe(false);
        expect(rows).toHaveLength(1 + BLIND_LEVELS_AHEAD);
        expect(rows.map(r => r.level)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
        expect(rows.slice(0, 4).map(r => r.blindsFormatted)).toEqual(["50/100", "100/200", "200/400", "400/800"]);
        expect(rows[10].blindsFormatted).toBe("51,200/102,400");
    });

    it("recovers the starting blinds mid-game and marks past / current / next", () => {
        // Live SNG, hand 25: level 6 (0-based 5) at 800/1,600, started at 25/50, 3-min levels.
        const { rows, summary } = buildBlindLadder(
            makeInfo({ level: 5, smallBlind: 800, bigBlind: 1600, nextSmallBlind: 1600, nextBigBlind: 3200, levelDurationSeconds: 180 })
        );

        expect(summary).toBe("Starts 25/50 · doubles every 3 min");
        expect(rows).toHaveLength(6 + BLIND_LEVELS_AHEAD);
        expect(rows.slice(0, 5).every(r => r.isPast)).toBe(true);
        expect(rows[5]).toMatchObject({ level: 6, blindsFormatted: "800/1,600", isCurrent: true, isPast: false });
        expect(rows[6]).toMatchObject({ level: 7, blindsFormatted: "1,600/3,200", isNext: true });
        expect(rows.filter(r => r.isCurrent)).toHaveLength(1);
    });

    it("times each upcoming level from the current countdown", () => {
        const { rows } = buildBlindLadder(makeInfo({ secondsRemaining: 120, levelDurationSeconds: 300 }));
        expect(rows[0].startsInSeconds).toBeUndefined(); // current
        expect(rows[1].startsInSeconds).toBe(120); // next: when this level ends
        expect(rows[4].startsInSeconds).toBe(120 + 3 * 300); // 4 levels from now
        expect(rows[10].startsInSeconds).toBe(120 + 9 * 300); // 10 levels from now
    });

    it("treats overtime as the next level starting next hand", () => {
        const { rows } = buildBlindLadder(makeInfo({ secondsRemaining: -15, levelDurationSeconds: 300 }));
        expect(rows[1].startsInSeconds).toBe(0);
        expect(rows[2].startsInSeconds).toBe(300);
    });

    it("leaves start times undefined without a level timer", () => {
        const { rows } = buildBlindLadder(makeInfo({ hasTimer: false }));
        expect(rows.every(r => r.startsInSeconds === undefined)).toBe(true);
    });
});

describe("buildBlindLadder — a table with a blind structure (ui#860)", () => {
    it("expands a preset exactly as the engine plays it, antes included", () => {
        // Turbo: 25/50 doubling, 5-min levels, 10% big-blind ante from level 5.
        const { rows, summary, hasAnte } = buildBlindLadder(
            makeInfo({ blindStructure: { preset: "turbo" }, level: 0, smallBlind: 25, bigBlind: 50, nextSmallBlind: 50, nextBigBlind: 100 })
        );

        expect(summary).toBe("Starts 25/50 · doubles every 5 min · ante from level 5");
        expect(hasAnte).toBe(true);
        expect(rows[3]).toMatchObject({ level: 4, blindsFormatted: "200/400", ante: 0 });
        expect(rows[4]).toMatchObject({ level: 5, blindsFormatted: "400/800", ante: 80 });
    });

    it("follows a percentage curve (Deep Stack), which the doubling rule would get wrong", () => {
        const { rows, summary } = buildBlindLadder(
            makeInfo({ blindStructure: { preset: "deep_stack" }, level: 2, smallBlind: 75, bigBlind: 150, nextSmallBlind: 100, nextBigBlind: 200, levelDurationSeconds: 900 })
        );

        expect(summary).toBe("Starts 25/50 · ×1.5 per level every 15 min · ante from level 7");
        expect(rows.slice(0, 6).map(r => r.blindsFormatted)).toEqual(["25/50", "50/100", "75/150", "100/200", "150/300", "225/450"]);
        expect(rows[2].isCurrent).toBe(true);
        expect(rows[6].ante).toBe(81);
    });

    it("adds up each level's own length for a custom table", () => {
        const { rows, summary } = buildBlindLadder(
            makeInfo({
                blindStructure: {
                    progression: "table",
                    levels: [
                        { level: 0, smallBlind: "10", bigBlind: "20", ante: "0", durationMinutes: 4, isBreak: false },
                        { level: 1, smallBlind: "15", bigBlind: "30", ante: "0", durationMinutes: 6, isBreak: false },
                        { level: 2, smallBlind: "25", bigBlind: "50", ante: "5", durationMinutes: 8, isBreak: false }
                    ]
                },
                level: 0,
                smallBlind: 10,
                bigBlind: 20,
                nextSmallBlind: 15,
                nextBigBlind: 30,
                secondsRemaining: 60,
                levelDurationSeconds: 240
            })
        );

        expect(summary).toBe("Starts 10/20 · custom levels");
        expect(rows.slice(0, 3).map(r => r.blindsFormatted)).toEqual(["10/20", "15/30", "25/50"]);
        expect(rows.slice(0, 3).map(r => r.minutes)).toEqual([4, 6, 8]);
        expect(rows[1].startsInSeconds).toBe(60); // when level 1 ends
        expect(rows[2].startsInSeconds).toBe(60 + 6 * 60); // + level 2's 6 min
        expect(rows[3].startsInSeconds).toBe(60 + 6 * 60 + 8 * 60); // + level 3's 8 min
    });
});

describe("buildBlindLadder — falls back to what the backend states", () => {
    it("shows only the current level when there is no next big blind and no level index", () => {
        const { rows, hasFullSchedule } = buildBlindLadder(makeInfo({ level: undefined, nextSmallBlind: 0, nextBigBlind: 0 }));
        expect(hasFullSchedule).toBe(false);
        expect(rows).toHaveLength(1);
        expect(rows[0].isCurrent).toBe(true);
    });

    it("shows current + next when a structure-less table doesn't double", () => {
        const { rows, hasFullSchedule, summary } = buildBlindLadder(makeInfo({ nextSmallBlind: 75, nextBigBlind: 150 }));
        expect(hasFullSchedule).toBe(false);
        expect(summary).toBeUndefined();
        expect(rows.map(r => r.blindsFormatted)).toEqual(["50/100", "75/150"]);
        expect(rows[1]).toMatchObject({ level: 2, isNext: true, startsInSeconds: 120 });
    });

    it("shows current + next without level numbers when the backend gives no level index", () => {
        const { rows, hasFullSchedule } = buildBlindLadder(makeInfo({ level: undefined }));
        expect(hasFullSchedule).toBe(false);
        expect(rows).toHaveLength(2);
        expect(rows[0].level).toBeUndefined();
        expect(rows[1].level).toBeUndefined();
    });

    it("formats large chip counts with thousands separators", () => {
        const { rows } = buildBlindLadder(makeInfo({ smallBlind: 5000, bigBlind: 10000, nextSmallBlind: 10000, nextBigBlind: 20000 }));
        expect(rows[0].blindsFormatted).toBe("5,000/10,000");
    });

    it("leaves minutes undefined when the level duration is unknown", () => {
        const { rows } = buildBlindLadder(makeInfo({ level: undefined, levelDurationSeconds: 0 }));
        expect(rows[0].minutes).toBeUndefined();
    });
});

describe("formatLevelStartsIn", () => {
    it("shows minutes under an hour, rounded up", () => {
        expect(formatLevelStartsIn(61)).toBe("2m");
        expect(formatLevelStartsIn(720)).toBe("12m");
        expect(formatLevelStartsIn(0)).toBe("1m");
    });

    it("shows hours and zero-padded minutes from an hour up", () => {
        expect(formatLevelStartsIn(3600)).toBe("1h 00m");
        expect(formatLevelStartsIn(3900)).toBe("1h 05m");
    });
});

describe("formatBlindCountdown", () => {
    it("formats seconds as m:ss with a zero-padded seconds field", () => {
        expect(formatBlindCountdown(125)).toBe("2:05");
        expect(formatBlindCountdown(60)).toBe("1:00");
        expect(formatBlindCountdown(9)).toBe("0:09");
    });

    it("shows overtime with a leading minus", () => {
        expect(formatBlindCountdown(-10)).toBe("-0:10");
    });
});
