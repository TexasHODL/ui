import { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { resolveJoinSeat } from "../hooks/playerActions/joinTable";

// resolveJoinSeat must never produce seat 0: the SNG/tournament engine seats
// a 0 literally (the "not-seated" sentinel, seats are 1-indexed) instead of
// treating it as random, so a "random seat" join landed broken (ui#440). When
// no concrete seat is requested it picks the lowest empty seat from state.

const state = (maxPlayers: number, occupiedSeats: number[]): TexasHoldemStateDTO =>
    ({
        gameOptions: { maxPlayers },
        players: occupiedSeats.map(seat => ({ seat }))
    } as unknown as TexasHoldemStateDTO);

describe("resolveJoinSeat", () => {
    it("returns an explicitly requested seat as-is", () => {
        expect(resolveJoinSeat(2, state(9, [1]))).toBe(2);
    });

    it("treats a missing seat as random — picks the lowest empty seat", () => {
        expect(resolveJoinSeat(undefined, state(2, []))).toBe(1);
        expect(resolveJoinSeat(undefined, state(2, [1]))).toBe(2);
    });

    it("treats the seat-0 sentinel as random rather than seating at 0", () => {
        expect(resolveJoinSeat(0, state(9, [1, 2]))).toBe(3);
    });

    it("skips occupied seats", () => {
        expect(resolveJoinSeat(undefined, state(9, [1, 2, 3, 5]))).toBe(4);
    });

    it("throws when the table is full instead of falling back to 0", () => {
        expect(() => resolveJoinSeat(undefined, state(2, [1, 2]))).toThrow("No available seats");
    });

    it("throws when game state has not loaded (no defaults — Commandment 7)", () => {
        expect(() => resolveJoinSeat(undefined, undefined)).toThrow("not loaded yet");
    });
});
