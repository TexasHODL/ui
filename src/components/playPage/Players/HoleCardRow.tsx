import React from "react";
import "../Card/HoleCardFan.css";
import { HOLE_CARD_ROW_HEIGHT, holeCardLayout, WinnerCardHighlight } from "../../../utils/holeCardLayout";

export interface HoleCardImage {
    key: string;
    src: string;
    alt: string;
    highlight?: WinnerCardHighlight;
    className?: string;
    onError?: () => void;
}

/**
 * A seat's hole cards: two for Hold'em, four (smaller, fanned) for Omaha
 * (ui#768). The hero's four are drawn a little larger. The row keeps the same height either way so the avatar below it
 * does not move.
 */
export const HoleCardRow: React.FC<{ cards: HoleCardImage[]; hero?: boolean }> = ({ cards, hero = false }) => {
    const { width, height, overlap } = holeCardLayout(cards.length);
    return (
        <div className="hole-card-row" data-count={cards.length} data-hero={hero ? "true" : undefined}>
            {cards.map((card, i) => (
                <span key={card.key} className="hole-card-row-slot" style={{ marginLeft: i > 0 ? -overlap : 0 }}>
                <img
                    src={card.src}
                    alt={card.alt}
                    width={width}
                    height={height}
                    style={{ marginTop: HOLE_CARD_ROW_HEIGHT - height }}
                    className={`mb-[11px]${card.className ? ` ${card.className}` : ""}${card.highlight === "lift" ? " animate-win-card" : ""}${card.highlight === "mute" ? " opacity-40" : ""}`}
                    onError={card.onError}
                />
                </span>
            ))}
        </div>
    );
};
