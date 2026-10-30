import React, { useState, useEffect } from "react";
import { useCardsForHandStrength } from "../../hooks/player/useCardsForHandStrength";
import { usePlayerSeatInfo } from "../../hooks/player/usePlayerSeatInfo";
import { getViewportMode } from "../../config/stageGeometry";
import { HAND_STRENGTH_DESKTOP_BOTTOM } from "./desktopActionBar";

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

    // Both phone orientations overlay the chip under the header. A portrait
    // row above the stage was a 34px gap the felt now uses. The chip stays
    // off to the left and does not take clicks.
    const isPortrait = viewportMode === "mobile-portrait";
    const isLandscape = viewportMode === "mobile-landscape";
    const isCompactMobile = isPortrait || isLandscape;
    const positionStyle: React.CSSProperties = isLandscape
        ? { position: "fixed", top: "calc(var(--mobile-chrome-end, 48px) + 4px)", left: "max(8px, env(safe-area-inset-left, 0px))", margin: 0, padding: "4px 8px", maxWidth: "calc(100% - 16px)", pointerEvents: "none", zIndex: 30 }
        : isPortrait
          ? { position: "fixed", top: "calc(var(--mobile-chrome-end, 68px) + 4px)", left: "max(8px, env(safe-area-inset-left, 0px))", margin: 0, padding: "4px 8px", maxWidth: "40%", pointerEvents: "none", zIndex: 30 }
          : { position: "fixed", bottom: HAND_STRENGTH_DESKTOP_BOTTOM, right: "16px" };

    return (
        <div style={positionStyle} className="live-hand-strength bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-blue-500/20 shadow-lg z-50 m-0">
            <div className="flex flex-col items-end">
                <div className="text-white type-body-hand text-sm" style={isCompactMobile ? { fontSize: "12px", lineHeight: 1.3 } : undefined}>{handStrength.descr}</div>
            </div>
        </div>
    );
};

export default LiveHandStrengthDisplay;
