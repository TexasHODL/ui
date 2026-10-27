import { winPulseSeats } from "./winPulse";

const seated = (entries: Array<[number, string]>) => new Map(entries.map(([seat, address]) => [seat, { address }]));

describe("winPulseSeats", () => {
    it("pulses a winner who is still seated", () => {
        expect([...winPulseSeats([{ seat: 3, address: "0xA" }], seated([[3, "0xa"]]))]).toEqual([3]);
    });

    it("clears the pulse once the winner leaves and the seat is empty", () => {
        expect(winPulseSeats([{ seat: 3, address: "0xA" }], seated([[1, "0xb"]])).size).toBe(0);
    });

    it("does not pulse a different player who took the winner's seat", () => {
        expect(winPulseSeats([{ seat: 3, address: "0xA" }], seated([[3, "0xc"]])).size).toBe(0);
    });

    it("handles no winners (new hand)", () => {
        expect(winPulseSeats(null, seated([[3, "0xa"]])).size).toBe(0);
        expect(winPulseSeats([], seated([[3, "0xa"]])).size).toBe(0);
    });
});