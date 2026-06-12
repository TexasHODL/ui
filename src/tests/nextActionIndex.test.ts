import { TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { nextActionIndex } from "../hooks/playerActions/transportAction";

// nextActionIndex must reproduce the engine's getActionIndex():
//   index === actionCount + previousActions.length + 1
// A join is rejected with "Invalid action index" otherwise. The original
// implementation read a seated player's legalActions[0].index, which a
// Sit-and-Go waiting to fill does NOT carry (SEATED players have no legal
// actions yet) — so every join after the first sent a stale 1 (ui#440).

// Minimal state factory — only the fields nextActionIndex reads.
const state = (partial: Partial<TexasHoldemStateDTO>): TexasHoldemStateDTO =>
    ({ actionCount: 0, previousActions: [], players: [], ...partial } as TexasHoldemStateDTO);

// previousActions entries: only `index` matters here.
const action = (index: number) => ({ index } as TexasHoldemStateDTO["previousActions"][number]);

describe("nextActionIndex", () => {
    it("returns 1 for a fresh/empty table (actionCount 0, no actions)", () => {
        expect(nextActionIndex(state({ actionCount: 0, previousActions: [] }))).toBe(1);
    });

    it("returns 1 when no game state has loaded yet", () => {
        expect(nextActionIndex(undefined)).toBe(1);
    });

    it("advances per prior join on a Sit-and-Go waiting to fill (seated players carry no legalActions)", () => {
        // One player has joined: previousActions=[join@1], seated player has no
        // legalActions. The next joiner must send index 2, not the stale 1.
        const afterOneJoin = state({
            actionCount: 0,
            previousActions: [action(1)],
            players: [{ seat: 1, legalActions: [] } as unknown as TexasHoldemStateDTO["players"][number]]
        });
        expect(nextActionIndex(afterOneJoin)).toBe(2);

        // Two players joined -> next index 3.
        const afterTwoJoins = state({
            actionCount: 0,
            previousActions: [action(1), action(2)]
        });
        expect(nextActionIndex(afterTwoJoins)).toBe(3);
    });

    it("uses the last action's index + 1 during a running hand", () => {
        const running = state({
            actionCount: 0,
            previousActions: [action(1), action(2), action(3), action(4)]
        });
        expect(nextActionIndex(running)).toBe(5);
    });

    it("honours a non-zero actionCount when there are no recorded actions", () => {
        expect(nextActionIndex(state({ actionCount: 7, previousActions: [] }))).toBe(8);
    });
});
