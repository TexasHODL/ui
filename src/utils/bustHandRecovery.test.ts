import { PlayerStatus, TexasHoldemRound, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { bustHandCandidates, selectBustHand } from "./bustHandRecovery";

const showdown = (handNumber: number): TexasHoldemStateDTO => ({
    handNumber,
    round: TexasHoldemRound.END,
    communityCards: ["AH", "KD", "7C", "2H", "9S"],
    previousActions: [{ playerId: "hero", action: "all-in" } as never],
    winners: [{ address: "winner", amount: "9000", description: "Pair of aces" } as never],
    players: [
        { address: "winner", seat: 1, status: PlayerStatus.SHOWING, holeCards: ["JH", "AH"] },
        { address: "hero", seat: 4, status: PlayerStatus.BUSTED, holeCards: ["7H", "AS"] }
    ]
} as unknown as TexasHoldemStateDTO);

it("keeps the newest indexed hands of this table and skips the live hand", () => {
    const candidates = bustHandCandidates([
        { game_id: "other", hand_number: 9, block_height: 90 },
        { game_id: "table", hand_number: 12, block_height: 120 },
        { game_id: "table", hand_number: 8, block_height: 80 },
        { game_id: "table", hand_number: 4, block_height: 40 }
    ], "table", 12);
    expect(candidates.map(hand => hand.handNumber)).toEqual([8, 4]);
});

it("selects the first history snapshot that has the player's cards and the winner's cards", () => {
    const masked = { ...showdown(9), players: showdown(9).players.map(player => ({ ...player, holeCards: ["X", "X"] })) };
    const hand = selectBustHand("hero", [null, masked, showdown(8)]);
    expect(hand?.handNumber).toBe(8);
    expect(hand?.players.find(player => player.address === "hero")?.cards).toEqual(["7H", "AS"]);
    expect(hand?.players.find(player => player.address === "winner")?.cards).toEqual(["JH", "AH"]);
    expect(hand?.board).toEqual(["AH", "KD", "7C", "2H", "9S"]);
});

it("returns null when history never shows both hands", () => {
    expect(selectBustHand("hero", [null, { ...showdown(8), players: [] } as unknown as TexasHoldemStateDTO])).toBeNull();
});
