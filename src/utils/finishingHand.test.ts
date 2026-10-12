import { PlayerStatus, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { captureFinishingHand, finishingWinnerCards, getFinishingHand, saveFinishingHand } from "./finishingHand";

const state = {
    handNumber: 12, communityCards: ["AH", "KD", "7C", "2H", "9S"],
    winners: [{ address: "winner", amount: "600", description: "Three of a kind" }],
    players: [
        { seat: 1, address: "winner", status: PlayerStatus.SHOWING, holeCards: ["AS", "AD"] },
        { seat: 2, address: "loser", status: PlayerStatus.ALL_IN, holeCards: ["KS", "KC"] },
        { seat: 3, address: "folded", status: PlayerStatus.FOLDED, holeCards: ["QS", "QC"] },
        { seat: 4, address: "hidden", status: PlayerStatus.SHOWING, holeCards: ["X", "X"] }
    ]
} as unknown as TexasHoldemStateDTO;

it("copies the board and revealed hands without leaking folded or masked cards", () => {
    const snapshot = captureFinishingHand(state);
    expect(snapshot.board).toEqual(state.communityCards);
    expect(snapshot.players[0]).toMatchObject({ cards: ["AS", "AD"], won: "600" });
    expect(snapshot.players[1].description).not.toBe("Cards not shown");
    expect(snapshot.players[2].cards).toEqual([]);
    expect(snapshot.players[3].cards).toEqual([]);
    expect(snapshot.board).not.toBe(state.communityCards);
});

it("keeps a player's finishing hand when subsequent hands play, scoped by table and player", () => {
    const snapshot = captureFinishingHand(state);
    saveFinishingHand("table-a", "LOSER", snapshot);
    saveFinishingHand("table-a", "loser", { ...snapshot, handNumber: 13 });
    expect(getFinishingHand("table-a", "loser")?.handNumber).toBe(12);
    expect(getFinishingHand("table-b", "loser")).toBeNull();
    expect(getFinishingHand("table-a", "other")).toBeNull();
});

it("retains the engine's winning combination without leaking hidden hole cards", () => {
    const snapshot = captureFinishingHand({ ...state,
        winners: [{ address: "hidden", amount: "600", cards: ["AH", "KD", "7C", "AS", "AD"] }]
    } as unknown as TexasHoldemStateDTO);
    expect(snapshot.players[3].cards).toEqual([]);
    expect(snapshot.players[3].winningCards).toEqual(["AH", "KD", "7C"]);
    expect([...finishingWinnerCards(snapshot)]).toEqual(["AH", "KD", "7C"]);
});

it("highlights the screenshot's winning pair and kickers, not unused community cards", () => {
    const cards = finishingWinnerCards({ handNumber: 25, board: ["4D", "AH", "2H", "6H", "3C"],
        players: [{ seat: 2, cards: ["7H", "3S"], description: "Pair of 3s", won: "9000" }] });
    expect(cards).toEqual(new Set(["3C", "3S", "AH", "7H", "6H"]));
    expect(cards.has("4D")).toBe(false);
    expect(cards.has("2H")).toBe(false);
});
