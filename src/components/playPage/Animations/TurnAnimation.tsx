import React, { useEffect, useState } from "react";
import { useNextToActInfo } from "../../../hooks/game/useNextToActInfo";
import { TurnAnimationProps } from "../../../types/index";
import "./TurnAnimation.css";

const TurnAnimation: React.FC<TurnAnimationProps & { position?: { left: string; top: string } }> = React.memo(({ index, position }) => {
    const { seat: nextToActSeat } = useNextToActInfo();
    const [isCurrentPlayersTurn, setIsCurrentPlayersTurn] = useState(false);

    useEffect(() => {
        setIsCurrentPlayersTurn(nextToActSeat === index + 1);
    }, [nextToActSeat, index]);

    if (!isCurrentPlayersTurn || !position) return null;

    return (
        <div
            className="turn-animation-container"
            style={{ left: position.left, top: position.top }}
        >
            {[0, 1, 2, 3].map(i => (
                <div key={i} className={`turn-animation-ring turn-animation-ring-${i}`} />
            ))}
        </div>
    );
});

TurnAnimation.displayName = "TurnAnimation";
export default TurnAnimation;
