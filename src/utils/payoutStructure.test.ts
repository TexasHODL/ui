import type { PayoutPlaceDTO } from "@block52/poker-vm-sdk";
import { payoutSharePercent, tournamentPayoutStructure } from "./payoutStructure";
import { formatFlooredPrizeDollars } from "./prizeDisplay";

/** The finished 7-entrant tournament 0x275a…: pool $11.20, 50/30/20. */
const LIVE_POOL = "11200000";
const LIVE_PAYOUTS: PayoutPlaceDTO[] = [
    { place: 1, amount: "5600000" },
    { place: 2, amount: "3360000" },
    { place: 3, amount: "2240000" }
];

describe("payoutSharePercent", () => {
    it("truncates a place to two decimals of the pool", () => {
        expect(payoutSharePercent("60000000", "100000000")).toBe(60);
        expect(payoutSharePercent("40000000", "100000000")).toBe(40);
        expect(payoutSharePercent("25200", "36000")).toBe(70);
        expect(payoutSharePercent("10800", "36000")).toBe(30);
    });

    it("is zero when the pool or the place is not a micro amount", () => {
        expect(payoutSharePercent("1", "0")).toBe(0);
        expect(payoutSharePercent("nope", "100")).toBe(0);
        expect(payoutSharePercent("100", "")).toBe(0);
    });
});

describe("tournamentPayoutStructure", () => {
    it("uses the tournament prize pool and the chain amounts", () => {
        const view = tournamentPayoutStructure({ prizePool: LIVE_POOL, payouts: LIVE_PAYOUTS });
        expect(view).toEqual({
            prizePool: LIVE_POOL,
            places: [
                { place: 1, payout: "5600000" },
                { place: 2, payout: "3360000" },
                { place: 3, payout: "2240000" }
            ]
        });
        expect(view?.places.map(p => payoutSharePercent(p.payout, view.prizePool))).toEqual([50, 30, 20]);
        expect(formatFlooredPrizeDollars(BigInt(view!.prizePool))).toBe("11.20");
        expect(view?.places.map(p => formatFlooredPrizeDollars(BigInt(p.payout)))).toEqual(["5.60", "3.36", "2.24"]);
    });

    it("keeps the whole pool when the paid places do not add up to it", () => {
        const view = tournamentPayoutStructure({
            prizePool: "10000000",
            payouts: [
                { place: 1, amount: "5000000" },
                { place: 2, amount: "3000000" }
            ]
        });
        expect(view?.prizePool).toBe("10000000");
        expect(view?.places.map(p => payoutSharePercent(p.payout, view.prizePool))).toEqual([50, 30]);
    });

    it("prices a percentage-only schedule from the prize pool", () => {
        const view = tournamentPayoutStructure({
            prizePool: LIVE_POOL,
            payouts: [
                { place: 3, percent: 20 },
                { place: 1, percent: 50 },
                { place: 2, percentage: "30%" }
            ] as unknown as PayoutPlaceDTO[]
        });
        expect(view?.places).toEqual([
            { place: 1, payout: "5600000" },
            { place: 2, payout: "3360000" },
            { place: 3, payout: "2240000" }
        ]);
        expect(view?.places.map(p => payoutSharePercent(p.payout, LIVE_POOL))).toEqual([50, 30, 20]);
    });

    it("reads basis points when the schedule adds up past 100, including a 1% place", () => {
        const view = tournamentPayoutStructure({
            prizePool: LIVE_POOL,
            payouts: [
                { place: 1, percent: 5000 },
                { place: 2, percent: 3000 },
                { place: 3, percent: 1900 },
                { place: 4, percent: 100 }
            ] as unknown as PayoutPlaceDTO[]
        });
        expect(view?.places.map(p => p.payout)).toEqual(["5600000", "3360000", "2128000", "112000"]);
        expect(view?.places.map(p => payoutSharePercent(p.payout, LIVE_POOL))).toEqual([50, 30, 19, 1]);
    });

    it("prefers a chain amount over a percentage on the same place", () => {
        const view = tournamentPayoutStructure({
            prizePool: LIVE_POOL,
            payouts: [{ place: 1, amount: "5600000", percent: 10 }] as unknown as PayoutPlaceDTO[]
        });
        expect(view?.places).toEqual([{ place: 1, payout: "5600000" }]);
    });

    it("hides the box when the pool is empty or no place is paid", () => {
        expect(tournamentPayoutStructure(undefined)).toBeNull();
        expect(tournamentPayoutStructure({ prizePool: "0", payouts: LIVE_PAYOUTS })).toBeNull();
        expect(tournamentPayoutStructure({ prizePool: LIVE_POOL, payouts: [] })).toBeNull();
        expect(tournamentPayoutStructure({ prizePool: "nope", payouts: LIVE_PAYOUTS })).toBeNull();
        expect(
            tournamentPayoutStructure({
                prizePool: LIVE_POOL,
                payouts: [{ place: 1, amount: "0" }]
            })
        ).toBeNull();
    });
});
