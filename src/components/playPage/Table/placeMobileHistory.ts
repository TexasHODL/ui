/** Boxes in viewport coordinates. */
export interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export function overlapArea(a: Box, b: Box): number {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (width <= 0 || height <= 0) return 0;
    return width * height;
}

/**
 * Pick the corner just under the header that covers the least seat and chrome.
 * Equal coverage stays on the right, where the launcher has always lived.
 */
export function chooseHistoryAnchor(
    width: number,
    height: number,
    top: number,
    viewportWidth: number,
    obstacles: readonly Box[],
    inset: number
): "left" | "right" {
    const right: Box = {
        left: viewportWidth - inset - width,
        right: viewportWidth - inset,
        top,
        bottom: top + height
    };
    const left: Box = { left: inset, right: inset + width, top, bottom: top + height };
    const score = (box: Box) => obstacles.reduce((total, obstacle) => total + overlapArea(box, obstacle), 0);
    return score(left) < score(right) ? "left" : "right";
}

/** Shift the launcher down only when a few pixels clears every overlap. */
export function historyNudge(box: Box, obstacles: readonly Box[], maxNudge = 12): number {
    let needed = 0;
    for (const obstacle of obstacles) {
        if (overlapArea(box, obstacle) <= 0) continue;
        const clearance = obstacle.bottom - box.top;
        if (clearance > maxNudge) return 0;
        needed = Math.max(needed, clearance);
    }
    return needed;
}

const OBSTACLE_SELECTOR = ".player-seat, .vacant-seat, [aria-label='Open menu'], [aria-label='Color theme']";

/** Float the compact History control clear of seats, the theme toggle, and the menu. */
export function placeMobileHistory(root: HTMLElement): void {
    const history = root.querySelector<HTMLElement>(".mobile-history-trigger");
    if (!history || root.dataset.compactMobile !== "true" || root.dataset.tableOnly === "true") {
        root.removeAttribute("data-history-anchor");
        root.style.removeProperty("--history-nudge");
        return;
    }
    const rect = history.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const chromeRaw = root.style.getPropertyValue("--mobile-chrome-end");
    const chromeEnd = chromeRaw ? parseFloat(chromeRaw) : rect.top;
    const top = (Number.isFinite(chromeEnd) ? chromeEnd : rect.top) + 4;
    const onLeft = root.dataset.historyAnchor === "left";
    const inset = Math.max(0, onLeft ? rect.left : window.innerWidth - rect.right);
    const obstacles = Array.from(root.querySelectorAll<HTMLElement>(OBSTACLE_SELECTOR)).map(element => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const anchor = chooseHistoryAnchor(rect.width, rect.height, top, window.innerWidth, obstacles, inset);
    const chosen: Box =
        anchor === "left"
            ? { left: inset, right: inset + rect.width, top, bottom: top + rect.height }
            : {
                  left: window.innerWidth - inset - rect.width,
                  right: window.innerWidth - inset,
                  top,
                  bottom: top + rect.height
              };
    const nudge = historyNudge(chosen, obstacles);
    if (anchor === "left") root.dataset.historyAnchor = "left";
    else root.removeAttribute("data-history-anchor");
    const nextNudge = `${nudge}px`;
    if (root.style.getPropertyValue("--history-nudge") !== nextNudge) {
        root.style.setProperty("--history-nudge", nextNudge);
    }
}
