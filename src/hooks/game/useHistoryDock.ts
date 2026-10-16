import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

const HISTORY_CHROME_GAP = 8;
const HISTORY_CHROME = ".table-action-bar, [data-testid='sng-payout-structure'], .live-hand-strength";

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
        const measure = () => {
            const stageEl = stageRef.current;
            const feltEl = tableRef.current;
            if (!stageEl || !feltEl) return;
            const stage = stageEl.getBoundingClientRect();
            const felt = feltEl.getBoundingClientRect();
            const logWidth = 240;
            const top = stage.top + 8;
            const logLeft = stage.right - 16 - logWidth;
            const logRight = stage.right - 16;
            let chromeTop = Number.POSITIVE_INFINITY;
            stageEl.closest(".table-container")?.querySelectorAll(HISTORY_CHROME).forEach(el => {
                const box = el.getBoundingClientRect();
                if (box.height < 1 || box.width < 1) return;
                if (box.right <= logLeft || box.left >= logRight) return;
                if (box.top <= top) return;
                chromeTop = Math.min(chromeTop, box.top);
            });
            let availableHeight = Math.max(36, Math.min(window.innerHeight, stage.top + height) - top - 16);
            if (Number.isFinite(chromeTop)) {
                availableHeight = Math.max(36, Math.min(availableHeight, chromeTop - HISTORY_CHROME_GAP - top));
            }
            // Include the outer rail AND seat/card bounds, not just the felt edge.
            let limit = felt.right + 30 * zoom >= logLeft ? felt.top - 30 * zoom - top - 8 : availableHeight;
            stageEl.querySelectorAll(".player-seat, .vacant-seat").forEach(seat => {
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
        };
        measure();
        const root = stageRef.current.closest(".table-container");
        const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        const watch = () => {
            root?.querySelectorAll(HISTORY_CHROME).forEach(el => observer?.observe(el));
        };
        watch();
        const mutation = root ? new MutationObserver(() => { watch(); measure(); }) : null;
        mutation?.observe(root as HTMLElement, { childList: true, subtree: true });
        window.addEventListener("resize", measure);
        return () => {
            observer?.disconnect();
            mutation?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [stageRef, tableRef, width, height, zoom, tableOnly, compact]);
    return style;
};
