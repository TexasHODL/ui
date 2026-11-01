import React, { useState, useEffect, useLayoutEffect } from "react";
import { useCardsForHandStrength } from "../../hooks/player/useCardsForHandStrength";
import { usePlayerSeatInfo } from "../../hooks/player/usePlayerSeatInfo";
import { getViewportMode } from "../../config/stageGeometry";
import { HAND_STRENGTH_DESKTOP_BOTTOM } from "./desktopActionBar";

/** Gap between the hand-strength chip and the Fold button / bottom dock below it. */
export const HAND_STRENGTH_DOCK_GAP = 6;

/**
 * Portrait phones: the chip sits just above the Fold button, left-aligned with
 * it, or just above the bottom action area when no Fold button is showing.
 */
export function portraitHandStrengthAnchor(doc: Document = document): { bottom: number; left: number } | null {
    const fold = Array.from(doc.querySelectorAll<HTMLElement>(".mobile-action-slot button, .poker-action-dock button")).find(b => /^\s*fold\b/i.test(b.textContent ?? "") && b.getBoundingClientRect().width > 0);
    const target = fold ?? doc.querySelector<HTMLElement>("[data-testid='mobile-action-slot'], .mobile-action-slot");
    const rect = target?.getBoundingClientRect();
    if (!rect || rect.height === 0) return null;
    return { bottom: Math.round(window.innerHeight - rect.top + HAND_STRENGTH_DOCK_GAP), left: fold ? Math.round(rect.left) : 8 };
}

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

    const isPortraitMode = viewportMode === "mobile-portrait";

    const [anchor, setAnchor] = useState<{ bottom: number; left: number } | null>(null);

    useLayoutEffect(() => {

        if (!isPortraitMode || !handStrength) return;

        let frame = 0;

        const update = () => {

            cancelAnimationFrame(frame);

            frame = requestAnimationFrame(() => {

                const next = portraitHandStrengthAnchor();

                setAnchor(prev => (prev?.bottom === next?.bottom && prev?.left === next?.left ? prev : next));

            });

        };

        update();

        const observer = new MutationObserver(update);

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

        window.addEventListener("resize", update);

        return () => {

            cancelAnimationFrame(frame);

            observer.disconnect();

            window.removeEventListener("resize", update);

        };

    }, [isPortraitMode, handStrength]);


    if (!handStrength) {
        return null;
    }

    // Landscape phones overlay the chip under the header. Portrait phones
    // sit it just above Fold (or the bottom dock). It does not take clicks.
    const isPortrait = viewportMode === "mobile-portrait";
    const isLandscape = viewportMode === "mobile-landscape";
    const isCompactMobile = isPortrait || isLandscape;
    const positionStyle: React.CSSProperties = isLandscape
        ? { position: "fixed", top: "calc(var(--mobile-chrome-end, 48px) + 4px)", left: "max(8px, env(safe-area-inset-left, 0px))", margin: 0, padding: "4px 8px", maxWidth: "calc(100% - 16px)", pointerEvents: "none", zIndex: 30 }
        : isPortrait
          ? { position: "fixed", bottom: `${anchor?.bottom ?? 170}px`, left: `max(${anchor?.left ?? 8}px, env(safe-area-inset-left, 0px))`, margin: 0, padding: "4px 8px", maxWidth: "40%", pointerEvents: "none", zIndex: 30 }
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
