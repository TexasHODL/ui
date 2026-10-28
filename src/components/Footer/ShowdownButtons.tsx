import React from "react";
import { ActionButton } from "./ActionButton";
import type { ShowdownButtonsProps } from "./types";

export const ShowdownButtons: React.FC<ShowdownButtonsProps> = ({ canMuck, canShow, loading, onMuck, onShow, stacked = false, leftHand = false }) => {
    // Landscape reuses the action column (same width and slot height as FOLD/CHECK/CALL).
    const btnClass = stacked ? "showdown-btn mobile-slot-btn" : "showdown-btn px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base";
    return (
        <div
            className={
                stacked ? `mobile-bet mobile-bet-landscape mobile-showdown-stack${leftHand ? " hand-left" : ""}` : "flex justify-center gap-2 mb-2 lg:mb-3"
            }
            data-testid="showdown-buttons"
        >
            {canMuck && (
                <ActionButton action="muck" label="MUCK CARDS" loading={loading === "muck"} onClick={onMuck} variant="secondary" className={btnClass} />
            )}
            {canShow && <ActionButton action="show" label="SHOW CARDS" loading={loading === "show"} onClick={onShow} variant="success" className={btnClass} />}
        </div>
    );
};
