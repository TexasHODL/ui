import React, { useState, useEffect } from "react";
import { useCardsForHandStrength } from "../../hooks/player/useCardsForHandStrength";
import { usePlayerSeatInfo } from "../../hooks/player/usePlayerSeatInfo";
import { getViewportMode } from "../../config/stageGeometry";

const LiveHandStrengthDisplay: React.FC = () => {
    const { currentUserSeat } = usePlayerSeatInfo();
    const handStrength = useCardsForHandStrength(currentUserSeat);
    const [viewportMode, setViewportMode] = useState(getViewportMode());

    useEffect(() => {
        const handleResize = () => setViewportMode(getViewportMode());
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        };
    }, []);

    if (!handStrength) {
        return null;
    }

    // Mobile renders in its own row above the measured stage, never over the felt.
    const isCompactMobile = viewportMode === "mobile-portrait" || viewportMode === "mobile-landscape";
    const positionStyle: React.CSSProperties = isCompactMobile
        ? { position: "relative", alignSelf: "flex-start", flexShrink: 0, margin: "4px 8px", padding: "4px 8px", maxWidth: "calc(100% - 16px)", pointerEvents: "none" }
        : { position: "fixed", bottom: "168px", right: "16px" };

    return (
        <div style={positionStyle} className="live-hand-strength bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-blue-500/20 shadow-lg z-50">
            <div className="flex flex-col items-end">
                <div className="text-white font-medium text-sm" style={isCompactMobile ? { fontSize: "12px", lineHeight: 1.3 } : undefined}>{handStrength.descr}</div>
            </div>
        </div>
    );
};

export default LiveHandStrengthDisplay;
