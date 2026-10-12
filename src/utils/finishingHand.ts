import { Deck, PokerSolver, PlayerStatus, TexasHoldemStateDTO } from "@block52/poker-vm-sdk";
import { describeShownHand } from "./showdownSummary";

export interface FinishingHand {
    handNumber: number;
    board: string[];
    players: { seat: number; cards: string[]; description: string; won: string | null; winningCards?: string[] }[];
}

export const normalizeCard = (card: string) => card.toUpperCase().replace(/^10/, "T");
/** Prefer the engine's winning combination; older snapshots can use revealed cards only. */
export function finishingWinnerCards(hand: FinishingHand): Set<string> {
    return new Set(hand.players.filter(player => player.won !== null).flatMap(player => {
        if (player.winningCards !== undefined) return player.winningCards.map(normalizeCard);
        if (player.cards.length !== 2 || hand.board.length !== 5) return [];
        try {
            return PokerSolver.evaluatePartialHand([...player.cards, ...hand.board].map(card => Deck.fromString(normalizeCard(card))))
                .bestHand.map(card => normalizeCard(card.mnemonic || card.toString()));
        } catch { return []; }
    }));
}

const validCards = (cards: string[] = []) => cards.filter(card => /^(?:[2-9TJQKA]|10)[CDHS]$/i.test(card));

/** Only public showdown cards are retained. Never infer masked/mucked cards. */
export function captureFinishingHand(state: TexasHoldemStateDTO): FinishingHand {
    const board = validCards(state.communityCards);
    return {
        handNumber: state.handNumber,
        board,
        players: state.players.map(player => {
            const winner = state.winners.find(w => w.address.toLowerCase() === player.address.toLowerCase());
            const revealed = player.status === PlayerStatus.SHOWING || player.status === PlayerStatus.ALL_IN;
            const cards = revealed ? validCards(player.holeCards) : [];
            return {
                seat: player.seat,
                cards,
                description: winner?.description || (cards.length === 2 ? describeShownHand(cards, board)?.description : null) || "Cards not shown",
                won: winner ? winner.amount : null,
                // Retain only already-visible cards, never hidden winner hole cards.
                ...(winner?.cards?.length ? { winningCards: validCards(winner.cards).map(normalizeCard)
                    .filter(card => [...board, ...cards].map(normalizeCard).includes(card)) } : {})
            };
        })
    };
}

// In-memory only: scoped by table and wallet, with no private cards or disk persistence.
const snapshots = new Map<string, FinishingHand>();
const listeners = new Set<() => void>();
const key = (table: string, player: string) => `${table}:${player.toLowerCase()}`;
export const getFinishingHand = (table: string, player: string) => snapshots.get(key(table, player)) ?? null;
export const subscribeFinishingHand = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};
export function saveFinishingHand(table: string, player: string, hand: FinishingHand) {
    const id = key(table, player);
    const previous = snapshots.get(id);
    // Later hands must never replace a busted player's own finishing hand.
    if (previous && (previous.handNumber !== hand.handNumber || JSON.stringify(previous) === JSON.stringify(hand))) return;
    snapshots.set(id, hand);
    if (snapshots.size > 90) snapshots.delete(snapshots.keys().next().value!);
    listeners.forEach(listener => listener());
}
