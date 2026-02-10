import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useTableAnimations } from "../../../hooks/animations/useTableAnimations";
import { useWinnerInfo } from "../../../hooks/game/useWinnerInfo";
import { winAnimationPosition } from "../../../utils/PositionArray";
import { WinAnimationProps } from "../../../types/index";
import "./WinAnimation.css";

import DollarChip from "./../../../assets/DollarChip.svg";

const WinAnimation: React.FC<WinAnimationProps> = React.memo(({ index }) => {
    const { id: _id } = useParams<{ id: string }>();
    const { tableSize } = useTableAnimations();
    const { winnerInfo } = useWinnerInfo();

    // Determine position based on table size
    const position = useMemo(() => {
        switch (tableSize) {
            case 9:
                return winAnimationPosition.nine[index];
            case 6:
                return winAnimationPosition.six[index];
            case 2:
                return winAnimationPosition.two[index];
            default:
                return undefined;
        }
    }, [tableSize, index]);

    // Only render for the winner
    const isWinner = !!winnerInfo?.some(w => w.seat === index + 1);
    if (!isWinner || !position) return null;

    return (
        <div className="win-animation-container" style={{ left: position.left, top: position.top }}>
            {/* Ripple rings */}
            {[0, 1, 2, 3].map(i => (
                <div key={`ring-${i}`} className={`win-animation-ring win-animation-ring-${i}`} />
            ))}

            {/* Placeholder bubbles (will become SVG icons) */}
            <ul className="bubbles">
                {[0, 1, 2, 3, 4].map((_, i) => (
                    <li
                        key={i}
                        className="bubble"
                        style={{
                            backgroundImage: `url(${DollarChip})`
                            // you can still override size, timing, etc. in CSS
                        }}
                    />
                ))}
            </ul>
        </div>
    );
});

WinAnimation.displayName = "WinAnimation";
export default WinAnimation;
