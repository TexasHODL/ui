import React, { useEffect, useState } from "react";
import { useTableAnimations } from "../../../hooks/animations/useTableAnimations";
import { useNextToActInfo } from "../../../hooks/game/useNextToActInfo";
import { useTableLayout } from "../../../hooks/game/useTableLayout";
import { TurnAnimationProps } from "../../../types/index";
import "./TurnAnimation.css";

const TurnAnimation: React.FC<TurnAnimationProps> = React.memo(({ index }) => {
    const { tableSize } = useTableAnimations();
    const { seat: nextToActSeat } = useNextToActInfo();
    const [isCurrentPlayersTurn, setIsCurrentPlayersTurn] = useState(false);
    
    // Use the table layout hook to get proper positions for 4 or 9 players only
    const tableLayout = useTableLayout(tableSize as 4 | 9 || 9);
    
    // Get position directly without memoization to ensure updates are reflected
    const positions = tableLayout.positions.turnAnimations;
    const position = positions?.[index];

    // Check if it's the current player's turn with useEffect
    useEffect(() => {
        const isTurn = nextToActSeat === index + 1;
        setIsCurrentPlayersTurn(isTurn);
    }, [nextToActSeat, index, position]);

    // Don't render anything if it's not this player's turn or position isn't available
    if (!isCurrentPlayersTurn || !position) {
        return null;
    }

    return (
        <div 
            className="turn-animation-container"
            style={{
                left: position.left,
                top: position.top,
            }}
        >
            {[0, 1, 2, 3].map(i => (
                <div
                    key={i}
                    className={`turn-animation-ring turn-animation-ring-${i}`}
                />
            ))}
        </div>
    );
});

// Add display name for debugging
TurnAnimation.displayName = "TurnAnimation";

export default TurnAnimation;