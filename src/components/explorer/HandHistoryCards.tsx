import { getCardImageUrl } from "../../utils/cardImages";
import type { HistorySeatCards } from "../../utils/handHistoryCards";
import { hasElements } from "../../utils/guards";

/** Hole cards the history page is allowed to show. The viewer's seat uses the bust-modal label. */
export function HandHistoryCards({ seats }: { seats: HistorySeatCards[] }) {
    if (!hasElements(seats)) return null;
    return (
        <div className="mt-2 flex flex-col gap-1">
            {seats.map(seat => (
                <div key={seat.seat} className="flex items-center gap-2 flex-wrap" aria-label={seat.yours ? "Your Cards" : `Seat ${seat.seat}`}>
                    <span className="text-xs text-gray-400">
                        {seat.yours ? "Your Cards" : `Seat ${seat.seat}`}
                        {seat.yours && <span className="ml-1">Seat {seat.seat}</span>}
                    </span>
                    <span className="flex gap-1">
                        {seat.cards.map((card, index) => (
                            <img key={index} src={getCardImageUrl(card.toUpperCase())} alt={card.toUpperCase()} className="w-6 sm:w-7 rounded-sm" />
                        ))}
                    </span>
                </div>
            ))}
        </div>
    );
}
