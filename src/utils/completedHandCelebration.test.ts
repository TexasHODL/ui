import { TexasHoldemRound } from "@block52/poker-vm-sdk";
import {
    WIN_CELEBRATION_MAX_MS,
    celebrationKey,
    decideCompletedHand,
    filterCelebratingWinners,
    handEndedAtMs,
    parseCelebrationClock,
    readCelebrationClock,
    writeCelebrationClock,
    type CelebrationClock,
    type DecideCelebrationInput
} from "./completedHandCelebration";

const NOW = 1_700_000_000_000;
const HAND = 54;
const WINNER = "0xabc";
const OTHER = "0xdef";

const seated = (entries: Array<[number, string]>) => entries.map(([seat, address]) => ({ seat, address }));

const winners = (entries: Array<[number, string]>) => entries.map(([seat, address]) => ({ seat, address }));

function decide(over: Partial<DecideCelebrationInput> = {}) {
    return decideCompletedHand({
        now: NOW,
        handNumber: HAND,
        round: TexasHoldemRound.END,
        winners: winners([[3, WINNER]]),
        seated: seated([[3, WINNER]]),
        handEndedAt: NOW,
        previous: null,
        watched: true,
        ...over
    });
}

describe("completedHandCelebration", () => {
    describe("winner still at the table", () => {
        it.each([2, 4, 6, 9])("plays the award for seat %s and clears it at the hard cap", seat => {
            const address = `0xseat${seat}`;
            const started = decide({
                winners: winners([[seat, address]]),
                seated: seated([[seat, address]])
            });
            expect(started.view.hideCompletedHand).toBe(false);
            expect(started.view.activeWinnerAddresses?.has(address)).toBe(true);
            expect(started.view.celebrateUntil).toBe(NOW + WIN_CELEBRATION_MAX_MS);

            const still = decide({
                now: NOW + WIN_CELEBRATION_MAX_MS - 1,
                winners: winners([[seat, address]]),
                seated: seated([[seat, address]]),
                previous: started.clock
            });
            expect(still.view.hideCompletedHand).toBe(false);
            expect(still.clock?.startedAt).toBe(started.clock?.startedAt);

            const done = decide({
                now: NOW + WIN_CELEBRATION_MAX_MS,
                winners: winners([[seat, address]]),
                seated: seated([[seat, address]]),
                previous: started.clock
            });
            expect(done.view.hideCompletedHand).toBe(true);
            expect(done.view.activeWinnerAddresses?.size).toBe(0);
            expect(done.view.celebrateUntil).toBeNull();
            expect(done.clock?.startedAt).toBe(NOW);
        });

        it("does not move the clock when the same end snapshot is decided again", () => {
            let clock: CelebrationClock | null = null;
            for (let i = 0; i < 5; i++) {
                const next = decide({ now: NOW + i * 10, previous: clock });
                expect(next.clock?.startedAt).toBe(NOW);
                clock = next.clock;
            }
        });
    });

    describe("identity, not the seat", () => {
        it("clears immediately when the winner leaves and does not resume if they sit back", () => {
            const started = decide();
            const left = decide({
                seated: seated([[8, OTHER]]),
                previous: started.clock
            });
            expect(left.view.hideCompletedHand).toBe(true);
            expect(left.view.activeWinnerAddresses?.size).toBe(0);
            expect(left.clock?.retired).toContain(WINNER);

            const rejoined = decide({
                now: NOW + 1000,
                seated: seated([[3, WINNER]]),
                previous: left.clock
            });
            expect(rejoined.view.hideCompletedHand).toBe(true);
            expect(rejoined.view.activeWinnerAddresses?.has(WINNER)).toBe(false);
            expect(rejoined.clock?.startedAt).toBe(NOW);
        });

        it("does not celebrate a different player who takes the winner's seat", () => {
            const started = decide();
            const replaced = decide({
                now: NOW + 500,
                seated: seated([[3, OTHER]]),
                previous: started.clock
            });
            expect(replaced.view.activeWinnerAddresses?.has(OTHER)).toBe(false);
            expect(replaced.view.activeWinnerAddresses?.has(WINNER)).toBe(false);
            expect(replaced.view.hideCompletedHand).toBe(true);
        });

        it("ignores a winner that has no address rather than binding the seat", () => {
            const result = decide({ winners: [{ seat: 3 }] });
            expect(result.view.hideCompletedHand).toBe(true);
            expect(result.view.activeWinnerAddresses?.size).toBe(0);
            expect(result.clock).toBeNull();
        });

        it("keeps a split-pot winner who is still seated when the other leaves", () => {
            const both = winners([
                [3, WINNER],
                [8, OTHER]
            ]);
            const started = decide({
                winners: both,
                seated: seated([
                    [3, WINNER],
                    [8, OTHER]
                ])
            });
            expect(started.view.activeWinnerAddresses?.size).toBe(2);

            const oneLeft = decide({
                now: NOW + 1000,
                winners: both,
                seated: seated([[8, OTHER]]),
                previous: started.clock
            });
            expect(oneLeft.view.hideCompletedHand).toBe(false);
            expect([...(oneLeft.view.activeWinnerAddresses ?? [])]).toEqual([OTHER]);
            expect(oneLeft.clock?.startedAt).toBe(NOW);

            const finished = decide({
                now: NOW + WIN_CELEBRATION_MAX_MS,
                winners: both,
                seated: seated([[8, OTHER]]),
                previous: oneLeft.clock
            });
            expect(finished.view.hideCompletedHand).toBe(true);
            expect(finished.view.activeWinnerAddresses?.size).toBe(0);
        });
    });

    describe("next hand and empty tables", () => {
        it("stops hiding the table when the next hand is dealt before the cap", () => {
            const started = decide();
            const nextHand = decide({
                now: NOW + 1000,
                handNumber: HAND + 1,
                round: TexasHoldemRound.PREFLOP,
                winners: [],
                seated: seated([
                    [3, WINNER],
                    [8, OTHER]
                ]),
                previous: started.clock
            });
            expect(nextHand.view).toMatchObject({ hideCompletedHand: false, activeWinnerAddresses: null, celebrateUntil: null });
            expect(nextHand.clock).toBeNull();
        });

        it("hides a completed pot on an empty end snapshot with no winners", () => {
            const empty = decide({ winners: [], seated: [] });
            expect(empty.view.hideCompletedHand).toBe(true);
            expect(empty.view.activeWinnerAddresses?.size).toBe(0);
        });

        it("leaves a live betting round alone", () => {
            const live = decide({
                round: TexasHoldemRound.FLOP,
                winners: [],
                seated: seated([
                    [3, WINNER],
                    [8, OTHER]
                ])
            });
            expect(live.view.hideCompletedHand).toBe(false);
            expect(live.view.activeWinnerAddresses).toBeNull();
        });

        it("keeps the pot through a showdown award and does not restart the clock when end arrives", () => {
            const showdown = decide({ round: TexasHoldemRound.SHOWDOWN, handEndedAt: NOW - 12_000 });
            expect(showdown.view.hideCompletedHand).toBe(false);
            expect(showdown.clock?.startedAt).toBe(NOW);

            const end = decide({
                now: NOW + 2000,
                previous: showdown.clock,
                handEndedAt: NOW - 12_000
            });
            expect(end.view.hideCompletedHand).toBe(false);
            expect(end.clock?.startedAt).toBe(NOW);
            expect(end.view.celebrateUntil).toBe(NOW + WIN_CELEBRATION_MAX_MS);
        });
    });

    describe("cold load versus a client that watched the hand", () => {
        it("does not replay an end snapshot that is already older than the cap", () => {
            const stale = decide({
                watched: false,
                previous: null,
                handEndedAt: NOW - WIN_CELEBRATION_MAX_MS - 1
            });
            expect(stale.view.hideCompletedHand).toBe(true);
            expect(stale.view.celebrateUntil).toBeNull();
            expect(stale.clock?.startedAt).toBe(NOW - WIN_CELEBRATION_MAX_MS - 1);
        });

        it("continues a fresh end snapshot from the hand-end time instead of granting a new five seconds", () => {
            const fresh = decide({
                watched: false,
                previous: null,
                handEndedAt: NOW - 2000
            });
            expect(fresh.view.hideCompletedHand).toBe(false);
            expect(fresh.clock?.startedAt).toBe(NOW - 2000);
            expect(fresh.view.celebrateUntil).toBe(NOW - 2000 + WIN_CELEBRATION_MAX_MS);
        });

        it("starts the animation at now for a client that watched the run-out, even if the chain timestamp is old", () => {
            const watched = decide({
                watched: true,
                previous: null,
                handEndedAt: NOW - 12_000
            });
            expect(watched.clock?.startedAt).toBe(NOW);
            expect(watched.view.hideCompletedHand).toBe(false);
        });

        it("keeps a stored clock instead of restarting it", () => {
            const stored: CelebrationClock = {
                key: celebrationKey(HAND, [WINNER]),
                startedAt: NOW - 4000,
                retired: []
            };
            const restored = decide({ watched: false, previous: stored, handEndedAt: NOW });
            expect(restored.clock?.startedAt).toBe(NOW - 4000);
            expect(restored.view.celebrateUntil).toBe(NOW - 4000 + WIN_CELEBRATION_MAX_MS);

            const expired: CelebrationClock = { ...stored, startedAt: NOW - 9000, retired: [WINNER] };
            const stillRetired = decide({
                watched: false,
                previous: expired,
                handEndedAt: NOW
            });
            expect(stillRetired.view.hideCompletedHand).toBe(true);
            expect(stillRetired.clock?.retired).toContain(WINNER);
        });
    });

    describe("filtering and storage", () => {
        it("filters winner visuals by address and passes a live hand through", () => {
            const rows = [
                { address: "0xAbC", seat: 3 },
                { address: OTHER, seat: 8 }
            ];
            expect(filterCelebratingWinners(rows, new Set([WINNER]))).toEqual([rows[0]]);
            expect(filterCelebratingWinners(rows, new Set())).toBeNull();
            expect(filterCelebratingWinners(rows, null)).toBe(rows);
            expect(filterCelebratingWinners([], new Set([WINNER]))).toBeNull();
        });

        it("reads the newest action timestamp in seconds or milliseconds", () => {
            expect(handEndedAtMs(null)).toBeNull();
            expect(handEndedAtMs([])).toBeNull();
            expect(handEndedAtMs([{ timestamp: 1_700_000_000 }, { timestamp: 1_700_000_010 }])).toBe(1_700_000_010_000);
            expect(handEndedAtMs([{ timestamp: NOW - 50 }, { timestamp: NOW }])).toBe(NOW);
        });

        it("round-trips a clock through storage and rejects a broken record", () => {
            const storage = new Map<string, string>();
            const memory = {
                getItem: (key: string) => storage.get(key) ?? null,
                setItem: (key: string, value: string) => {
                    storage.set(key, value);
                }
            };
            const clock: CelebrationClock = { key: celebrationKey(HAND, [WINNER, OTHER]), startedAt: NOW, retired: [WINNER] };
            writeCelebrationClock(memory, "table-1", clock);
            expect(readCelebrationClock(memory, "table-1")).toEqual(clock);
            expect(readCelebrationClock(memory, "table-2")).toBeNull();
            expect(parseCelebrationClock(null)).toBeNull();
            expect(parseCelebrationClock({ key: "", startedAt: NOW, retired: [] })).toBeNull();
            expect(parseCelebrationClock({ key: "54|0xa", startedAt: NOW, retired: [1] })).toBeNull();
        });
    });
});
