
import type { FinishingHand } from "../../utils/finishingHand";
import { getCardImageUrl } from "../../utils/cardImages";
import { HoleCardFan } from "../playPage/Card/HoleCardFan";
import { finishingWinnerCards, normalizeCard } from "../../utils/finishingHand";

const suits: Record<string, string> = { H: "hearts", D: "diamonds", C: "clubs", S: "spades" };
const ranks: Record<string, string> = { A: "Ace", K: "King", Q: "Queen", J: "Jack", T: "10" };
function Cards({ cards, holeCards = false, winners = new Set<string>() }: { cards: string[]; holeCards?: boolean; winners?: Set<string> }) {
    const images = cards.map((card, index) => {
        const code = normalizeCard(card);
        const rank = code.slice(0, -1);
        const highlight = winners.size > 0 && winners.has(code);
        return <img key={index} className={`finish-card-image${winners.size ? highlight ? " finish-card-winning" : " finish-card-muted" : ""}`} src={getCardImageUrl(code)}
            alt={`${ranks[rank] ?? rank} of ${suits[code.slice(-1)]}${highlight ? " — winning hand" : ""}`} width={60} height={80} />;
    });
    return holeCards
        ? <div className="finish-hole-cards"><HoleCardFan>{images}</HoleCardFan></div>
        : <div className="finish-board-cards">{images}</div>;
}

export function FinishingHandRecap({ hand, viewerAddress }: { hand: FinishingHand | null; viewerAddress?: string | null }) {
    if (!hand) return <p className="finish-recap-note">The finishing hand wasn’t captured in this session. No cards have been guessed.</p>;
    const winners = finishingWinnerCards(hand);
    const you = viewerAddress?.toLowerCase() ?? null;
    return <section className="finish-recap" aria-label="Finishing hand recap">
        <h3>Hand #{hand.handNumber} · Final snapshot</h3>
        <p className="finish-recap-note">Community cards</p>
        {hand.board.length ? <Cards cards={hand.board} winners={winners} /> : <p>No community cards dealt.</p>}
        {winners.size > 0 && <p className="finish-recap-note">Highlighted cards form the winning hand{hand.players.filter(player => player.won !== null).length > 1 ? "s" : ""}.</p>}
        <div className="finish-seats">{hand.players.map(player => {
            const isYours = !!you && player.address?.toLowerCase() === you;
            return <div className={`finish-seat${isYours ? " finish-seat-yours" : ""}`} key={player.seat}>
                <div>
                    <span>
                        <strong>{isYours ? "Your Cards" : `Seat ${player.seat}`}</strong>
                        {isYours && <span className="finish-your-seat">Seat {player.seat}</span>}
                    </span>
                    {player.won !== null && <span className="finish-winner">Won {Number(player.won).toLocaleString()} chips</span>}
                </div>
                {player.cards.length > 0 && <Cards cards={player.cards} holeCards winners={player.won !== null ? finishingWinnerCards({ ...hand, players: [player] }) : undefined} />}
                <p>{player.description}</p>
            </div>;
        })}</div>
        <p className="finish-recap-note">Only revealed cards are shown. Hidden and mucked cards stay private. This snapshot stays here while you watch.</p>
    </section>;
}
