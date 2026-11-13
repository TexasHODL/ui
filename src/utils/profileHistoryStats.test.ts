import type { GamePrizeMeta } from "./transactionUtils";
import type { SessionPrizeRow } from "./playerPrizeClaims";
import { ALL_SESSION_GAMES, sessionLabelsByGameId } from "./sessionGameDisplay";
import {
    formatHistoryAmount,
    formatHistoryBlocks,
    handsForHistory,
    historyMoneyUnit,
    historyMoneyUnits,
    profileHistoryStats,
    sessionSpansForHistory,
    type HistoryHandAmount,
    type HistorySessionSpan
} from "./profileHistoryStats";

const cash = (overrides: Partial<GamePrizeMeta> = {}): GamePrizeMeta => ({
    format: "cash",
    variant: "texas-holdem",
    bettingLimit: "no-limit",
    smallBlind: "10000",
    bigBlind: "20000",
    ...overrides
});

const sitAndGo = (overrides: Partial<GamePrizeMeta> = {}): GamePrizeMeta => ({
    format: "sit-and-go",
    variant: "texas-holdem",
    bettingLimit: "no-limit",
    minBuyIn: "2000000",
    maxBuyIn: "2000000",
    ...overrides
});

const tournament = (overrides: Partial<GamePrizeMeta> = {}): GamePrizeMeta => ({
    format: "tournament",
    variant: "texas-holdem",
    bettingLimit: "no-limit",
    minBuyIn: "2000000",
    maxBuyIn: "2000000",
    ...overrides
});

const metas: Record<string, GamePrizeMeta> = {
    cashA: cash(),
    cashB: cash(),
    sng: sitAndGo(),
    tourn: tournament()
};

const labels = sessionLabelsByGameId(metas);
const units = historyMoneyUnits(metas);

const span = (gameId: string, joinBlock: number, leaveBlock?: number): HistorySessionSpan => ({ gameId, joinBlock, leaveBlock });

const hand = (gameId: string, wonAmount: number, contributed?: number): HistoryHandAmount =>
    hasValue(contributed) ? { gameId, wonAmount, contributed } : { gameId, wonAmount };

function hasValue(value: number | undefined): value is number {
    return value !== undefined;
}

const sessions: HistorySessionSpan[] = [
    span("cashA", 1_000_000, 1_000_400),
    span("cashB", 1_010_000, 1_010_900),
    span("sng", 1_020_000, 1_020_220),
    span("tourn", 1_030_000, 1_031_520),
    span("cashA", 1_050_000)
];

const hands: HistoryHandAmount[] = [
    hand("cashA", 4_200_000),
    hand("cashB", 18_400_000),
    hand("cashA", 0),
    hand("sng", 1_500),
    hand("sng", 4_200),
    hand("tourn", 8_600),
    hand("tourn", 24_600)
];

describe("historyMoneyUnit", () => {
    it("keeps cash in USDC and Sit & Go or tournament stacks in chips", () => {
        expect(historyMoneyUnit("cash")).toBe("usd");
        expect(historyMoneyUnit("sit-and-go")).toBe("chips");
        expect(historyMoneyUnit("tournament")).toBe("chips");
        expect(historyMoneyUnit(undefined)).toBeUndefined();
        expect(historyMoneyUnit("mixed")).toBeUndefined();
    });
});

describe("profileHistoryStats", () => {
    it("takes the longest closed session in the selected variant", () => {
        const all = profileHistoryStats(sessions, hands, labels, units, ALL_SESSION_GAMES);
        expect(all.longestSessionBlocks).toBe(1_520);

        const cashStats = profileHistoryStats(sessions, hands, labels, units, "Cash Game · Texas Hold'em");
        expect(cashStats.longestSessionBlocks).toBe(900);

        const sngStats = profileHistoryStats(sessions, hands, labels, units, "Sit & Go · Texas Hold'em");
        expect(sngStats.longestSessionBlocks).toBe(220);

        const tournStats = profileHistoryStats(sessions, hands, labels, units, "Tournament · Texas Hold'em");
        expect(tournStats.longestSessionBlocks).toBe(1_520);
    });

    it("does not treat an open seat, a same-block leave, or a backwards leave as a length of 0", () => {
        const openOnly = profileHistoryStats([span("cashA", 10)], [], labels, units, ALL_SESSION_GAMES);
        expect(openOnly.longestSessionBlocks).toBeUndefined();

        const zero = profileHistoryStats([span("cashA", 10, 10), span("cashA", 20, 19)], [], labels, units, ALL_SESSION_GAMES);
        expect(zero.longestSessionBlocks).toBeUndefined();

        const withReal = profileHistoryStats([span("cashA", 10, 10), span("cashA", 20, 25)], [], labels, units, "Cash Game · Texas Hold'em");
        expect(withReal.longestSessionBlocks).toBe(5);
    });

    it("uses the largest pot awarded in that variant's unit", () => {
        const cashStats = profileHistoryStats(sessions, hands, labels, units, "Cash Game · Texas Hold'em");
        expect(cashStats.biggestPotWon).toBe(18_400_000);
        expect(cashStats.potUnit).toBe("usd");

        const sngStats = profileHistoryStats(sessions, hands, labels, units, "Sit & Go · Texas Hold'em");
        expect(sngStats.biggestPotWon).toBe(4_200);
        expect(sngStats.potUnit).toBe("chips");

        const tournStats = profileHistoryStats(sessions, hands, labels, units, "Tournament · Texas Hold'em");
        expect(tournStats.biggestPotWon).toBe(24_600);
        expect(tournStats.potUnit).toBe("chips");
    });

    it("does not report a pot of 0 when the player never won a hand in the variant", () => {
        const stats = profileHistoryStats(sessions, [hand("cashA", 0)], labels, units, "Cash Game · Texas Hold'em");
        expect(stats.biggestPotWon).toBeUndefined();
        expect(stats.potUnit).toBeUndefined();
    });

    it("refuses one pot figure when All mixes cash dollars with tournament chips", () => {
        const stats = profileHistoryStats(sessions, hands, labels, units, ALL_SESSION_GAMES);
        expect(stats.biggestPotWon).toBeUndefined();
        expect(stats.potUnit).toBeUndefined();
        expect(stats.longestSessionBlocks).toBe(1_520);
    });

    it("refuses a pot when a winning hand has no table format", () => {
        const unlabeled = sessionLabelsByGameId({ ...metas, mystery: {} });
        const mixed = historyMoneyUnits({ ...metas, mystery: {} });
        const stats = profileHistoryStats(sessions, [...hands, hand("mystery", 9_000_000)], unlabeled, mixed, ALL_SESSION_GAMES);
        expect(stats.biggestPotWon).toBeUndefined();
    });

    it("keeps a variant's pot when the unlabeled hand is not in that variant", () => {
        const unlabeled = sessionLabelsByGameId({ ...metas, mystery: {} });
        const stats = profileHistoryStats(
            sessions,
            [...hands, hand("mystery", 9_000_000)],
            unlabeled,
            historyMoneyUnits({ ...metas, mystery: {} }),
            "Cash Game · Texas Hold'em"
        );
        expect(stats.biggestPotWon).toBe(18_400_000);
        expect(stats.potUnit).toBe("usd");
    });

    it("computes hand profit only from hands that record what the player put in", () => {
        const measured: HistoryHandAmount[] = [hand("cashA", 5_000_000, 1_000_000), hand("cashB", 2_000_000, 2_500_000), hand("cashA", 8_000_000)];
        const stats = profileHistoryStats(sessions, measured, labels, units, "Cash Game · Texas Hold'em");
        expect(stats.biggestHandProfit).toBe(4_000_000);
        expect(stats.profitUnit).toBe("usd");
        expect(stats.biggestPotWon).toBe(8_000_000);
    });

    it("leaves hand profit unknown when the hand list has no contribution", () => {
        const stats = profileHistoryStats(sessions, hands, labels, units, "Tournament · Texas Hold'em");
        expect(stats.biggestHandProfit).toBeUndefined();
        expect(stats.profitUnit).toBeUndefined();
        expect(stats.biggestPotWon).toBe(24_600);
    });

    it("picks the largest profit even when every measured hand lost money", () => {
        const measured = [hand("tourn", 1_000, 4_000), hand("tourn", 2_000, 2_500)];
        const stats = profileHistoryStats(sessions, measured, labels, units, "Tournament · Texas Hold'em");
        expect(stats.biggestHandProfit).toBe(-500);
        expect(stats.profitUnit).toBe("chips");
    });

    it("does not mix a cash profit with a chip profit", () => {
        const measured = [hand("cashA", 5_000_000, 1_000_000), hand("tourn", 3_000, 1_000)];
        const stats = profileHistoryStats(sessions, measured, labels, units, ALL_SESSION_GAMES);
        expect(stats.biggestHandProfit).toBeUndefined();
    });
});

describe("sessionSpansForHistory", () => {
    const player = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";

    it("keeps a leave block the session row already has", () => {
        const row: SessionPrizeRow = { gameId: "cashA", joinBlock: 10, leaveBlock: 40, buyIn: 1, cashOut: 2, isPrize: false };
        expect(sessionSpansForHistory([row], metas, player, {})).toEqual([{ gameId: "cashA", joinBlock: 10, leaveBlock: 40 }]);
    });

    it("uses the chain elimination block for a bust the table would show", () => {
        const row: SessionPrizeRow = { gameId: "tourn", joinBlock: 100, buyIn: 10_000, isPrize: false };
        const busted: GamePrizeMeta = {
            ...tournament(),
            handNumber: 3,
            results: [{ place: 2, playerId: player, payout: "0" }],
            payouts: [{ place: 1, amount: "27000" }],
            players: [{ address: player, stack: "0", status: "busted" }]
        };
        const [spanRow] = sessionSpansForHistory([row], { tourn: busted }, player, { tourn: 250 });
        expect(spanRow.leaveBlock).toBe(250);
        expect(
            profileHistoryStats([spanRow], [], sessionLabelsByGameId({ tourn: busted }), historyMoneyUnits({ tourn: busted }), ALL_SESSION_GAMES)
                .longestSessionBlocks
        ).toBe(150);
    });

    it("does not invent a leave block for a seat that is still open", () => {
        const row: SessionPrizeRow = { gameId: "cashA", joinBlock: 10, buyIn: 1, isPrize: false };
        expect(sessionSpansForHistory([row], metas, player, {})[0].leaveBlock).toBeUndefined();
    });
});

describe("handsForHistory", () => {
    it("keeps the awarded amount and does not invent a contribution", () => {
        expect(
            handsForHistory([
                {
                    game_id: "cashA",
                    hand_number: 1,
                    seat: 1,
                    status: "showing",
                    won_amount: 18_400_000,
                    block_height: 1,
                    community_cards: [],
                    winner_count: 1
                }
            ])
        ).toEqual([{ gameId: "cashA", wonAmount: 18_400_000 }]);
    });
});

describe("formatHistoryAmount", () => {
    it("formats cash as the other profile money cards do, and chips as chips", () => {
        expect(formatHistoryAmount(18_400_000, "usd", false)).toBe("18.40");
        expect(formatHistoryAmount(24_600, "chips", false)).toBe(`${(24_600).toLocaleString()} chips`);
        expect(formatHistoryAmount(24_600, "chips", false)).not.toBe("0.02");
    });

    it("shows an em dash for an unknown figure and an ellipsis while the hands are loading", () => {
        expect(formatHistoryAmount(undefined, "usd", false)).toBe("—");
        expect(formatHistoryAmount(18_400_000, undefined, false)).toBe("—");
        expect(formatHistoryAmount(0, "usd", false)).toBe("0.00");
        expect(formatHistoryAmount(18_400_000, "usd", true)).toBe("…");
    });

    it("shows an em dash for an unmeasured session and the block count otherwise", () => {
        expect(formatHistoryBlocks(undefined, false)).toBe("—");
        expect(formatHistoryBlocks(1_520, false)).toBe((1_520).toLocaleString());
        expect(formatHistoryBlocks(1_520, true)).toBe("…");
    });
});
