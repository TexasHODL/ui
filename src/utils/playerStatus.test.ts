import { PlayerStatus } from "@block52/poker-vm-sdk";
import { hasFoldedOrMucked, shouldWarnOnLeave } from "./playerStatus";

describe("shouldWarnOnLeave", () => {
    it("warns for active and all-in players only while a hand is running", () => {
        for (const status of [PlayerStatus.ACTIVE, PlayerStatus.ALL_IN]) {
            expect(shouldWarnOnLeave(true, status)).toBe(true);
            expect(shouldWarnOnLeave(false, status)).toBe(false);
        }
    });

    it("does not warn for sat-out, waiting, folded, or missing players", () => {
        for (const status of [PlayerStatus.SITTING_OUT, PlayerStatus.SEATED, PlayerStatus.SITTING_IN,
            PlayerStatus.WAITING_FOR_BIG_BLIND, PlayerStatus.FOLDED, PlayerStatus.MUCKED,
            PlayerStatus.BUSTED, PlayerStatus.SHOWING, null, undefined]) {
            expect(shouldWarnOnLeave(true, status)).toBe(false);
        }
    });
});

describe("hasFoldedOrMucked", () => {
    it("treats a mucked seat exactly like a folded one (engine v1.0.18, poker-vm#2586)", () => {
        expect(hasFoldedOrMucked(PlayerStatus.FOLDED)).toBe(true);
        expect(hasFoldedOrMucked(PlayerStatus.MUCKED)).toBe(true);
        expect(hasFoldedOrMucked("mucked")).toBe(true);
    });

    it("is false for every in-hand and idle status, and for a missing one", () => {
        for (const status of [PlayerStatus.ACTIVE, PlayerStatus.ALL_IN, PlayerStatus.SHOWING, PlayerStatus.SITTING_OUT, PlayerStatus.BUSTED, PlayerStatus.SEATED]) {
            expect(hasFoldedOrMucked(status)).toBe(false);
        }
        expect(hasFoldedOrMucked(undefined)).toBe(false);
        expect(hasFoldedOrMucked(null)).toBe(false);
    });
});
