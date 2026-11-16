import { tournamentTxError } from "./tournamentTxError";

describe("tournamentTxError", () => {
    it("maps insufficient funds and keeps the chain's wording as detail", () => {
        expect(tournamentTxError(new Error("insufficient funds: 1000usdc is less than 10000usdc"))).toEqual({
            message: "Not enough funds in your wallet to pay the buy-in.",
            detail: "insufficient funds: 1000usdc is less than 10000usdc"
        });
    });

    it("maps a closed or full registration, and an already-registered player", () => {
        expect(tournamentTxError("registration is closed")).toEqual({
            message: "Registration is closed.",
            detail: "registration is closed"
        });
        expect(tournamentTxError("tournament is full")).toEqual({
            message: "This tournament is full.",
            detail: "tournament is full"
        });
        expect(tournamentTxError("player is already registered")).toEqual({
            message: "You are already registered for this tournament.",
            detail: "player is already registered"
        });
    });

    it("falls back to a generic message and still shows an unrecognized chain error", () => {
        expect(tournamentTxError(new Error("rpc error: code = 5"))).toEqual({
            message: "The transaction could not be completed.",
            detail: "rpc error: code = 5"
        });
    });
});
