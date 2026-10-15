import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/** Bound the log to existing spare space; never resize or reposition the table. */
export const useHistoryDock = (
    stageRef: RefObject<HTMLDivElement | null>,
    tableRef: RefObject<HTMLDivElement | null>,
    width: number,
    height: number,
    zoom: number,
    tableOnly: boolean,
    compact: boolean
) => {
    const [style, setStyle] = useState<CSSProperties>({});
    useLayoutEffect(() => {
        if (compact || !stageRef.current || !tableRef.current) return;
        const stage = stageRef.current.getBoundingClientRect();
        const felt = tableRef.current.getBoundingClientRect();
        const logWidth = 240;
        const top = stage.top + 8;
        const logLeft = stage.right - 16 - logWidth;
        const availableHeight = Math.max(36, Math.min(window.innerHeight, stage.top + height) - top - 16);
        // Include the outer rail AND seat/card bounds, not just the felt edge.
        let limit = felt.right + 30 * zoom >= logLeft ? felt.top - 30 * zoom - top - 8 : availableHeight;
        stageRef.current.querySelectorAll(".player-seat, .vacant-seat").forEach(seat => {
            const bounds = seat.getBoundingClientRect();
            if (bounds.right + 40 * zoom >= logLeft && bounds.bottom > top) {
                limit = Math.min(limit, bounds.top - 40 * zoom - top - 8);
            }
        });
        limit = Math.max(36, limit);
        const logHeight = Math.floor(Math.min(availableHeight, limit));
        setStyle(previous => {
            const values = previous as Record<string, string>;
            if (values["--history-top"] === `${top}px` && values["--history-height"] === `${logHeight}px`) return previous;
            return { "--history-top": `${top}px`, "--history-height": `${logHeight}px` } as CSSProperties;
        });
    }, [stageRef, tableRef, width, height, zoom, tableOnly, compact]);
    return style;
};
