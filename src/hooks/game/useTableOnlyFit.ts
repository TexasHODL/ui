import { useLayoutEffect, useState, type RefObject } from "react";

/** Screen box: left, top, right, bottom (px). */
export type Box = { left: number; top: number; right: number; bottom: number };
export type TableOnlyFit = { scale: number; dx: number; dy: number };

export const IDENTITY_FIT: TableOnlyFit = { scale: 1, dx: 0, dy: 0 };
/** Breathing room between the table content and the screen edge or dock. */
export const FIT_MARGIN = 4;
const FEED_HEADER = 40;

/** Everything a seat draws: seat, cards, badge, action banner and its chip stack. */
export const FIT_CONTENT = ".player-seat, .vacant-seat, .player-cards, .hole-card-fan-slot, .chip-position, .seat-banner-shell, .player-badge-position";
/** Overlays that float over the stage in table-only view and must not cover a seat. */
export const FIT_OVERLAYS = ".restore-table-banner, .mobile-history-trigger, .live-hand-strength, .action-log-overlay.action-log-open";

/** Overlap with a small gap, so a seat never touches a pill. */
const GAP = 4;
const overlaps = (a: Box, b: Box) => a.left < b.right + GAP && b.left - GAP < a.right && a.top < b.bottom + GAP && b.top - GAP < a.bottom;

const place = (box: Box, fit: TableOnlyFit, origin: { x: number; y: number }): Box => ({
    left: origin.x + box.left * fit.scale + fit.dx,
    top: origin.y + box.top * fit.scale + fit.dy,
    right: origin.x + box.right * fit.scale + fit.dx,
    bottom: origin.y + box.bottom * fit.scale + fit.dy
});

/** Slack positions tried at each scale: centred first, then toward each edge. */
const SLIDES = [0.5, 0.35, 0.65, 0.2, 0.8, 0, 1];
const SCALE_STEP = 0.99;
const MIN_SCALE_RATIO = 0.4;

/**
 * Fit the unscaled table content (boxes relative to the stage origin, as laid
 * out by the geometry engine) as LARGE as possible inside the target area,
 * scaling up as well as down. Overlays (corner pills) only cost space when a
 * real seat, badge or chip box would intersect one: the largest scale wins at
 * which some position (centred first, then slid toward an edge) is clear.
 */
/** Optional centring: put the anchor (the felt oval) centre on `centre`. */
export interface FitCentre { anchor: Box; x: number; y: number }

export function computeTableOnlyFit(content: Box[], overlays: Box[], target: Box, origin = { x: 0, y: 0 }, centre?: FitCentre): TableOnlyFit {
    if (content.length === 0) return IDENTITY_FIT;
    const union = content.reduce((u, b) => ({
        left: Math.min(u.left, b.left), top: Math.min(u.top, b.top), right: Math.max(u.right, b.right), bottom: Math.max(u.bottom, b.bottom)
    }));
    const width = union.right - union.left;
    const height = union.bottom - union.top;
    const areaW = target.right - target.left;
    const areaH = target.bottom - target.top;
    if (width <= 0 || height <= 0 || areaW <= 0 || areaH <= 0) return IDENTITY_FIT;
    const largest = Math.min(areaW / width, areaH / height);
    const at = (scale: number, fx: number, fy: number): TableOnlyFit => ({
        scale,
        dx: target.left + (areaW - width * scale) * fx - origin.x - union.left * scale,
        dy: target.top + (areaH - height * scale) * fy - origin.y - union.top * scale
    });
    const clear = (fit: TableOnlyFit) => !content.some(box => {
        const placed = place(box, fit, origin);
        return overlays.some(overlay => overlaps(placed, overlay));
    });
    if (centre) {
        // Centred placement: the anchor centre lands on (x, y) in screen space.
        const ax = (centre.anchor.left + centre.anchor.right) / 2;
        const ay = (centre.anchor.top + centre.anchor.bottom) / 2;
        const room = (space: number, extent: number) => (extent > 0 ? space / extent : Infinity);
        // Horizontal centring is strict; vertically the oval sits as close to
        // the band centre as the scale allows, so centring never costs size.
        const fitsCentred = Math.min(room(centre.x - target.left, ax - union.left), room(target.right - centre.x, union.right - ax), areaH / height);
        for (let scale = fitsCentred; scale >= fitsCentred * CENTRED_MIN_RATIO; scale *= SCALE_STEP) {
            const dx = centre.x - origin.x - ax * scale;
            const dyMin = target.top - origin.y - union.top * scale;
            const dyMax = target.bottom - origin.y - union.bottom * scale;
            const ideal = Math.min(dyMax, Math.max(dyMin, centre.y - origin.y - ay * scale));
            const tries = [ideal, ...SLIDES.map(f => dyMin + (dyMax - dyMin) * f).sort((u, v) => Math.abs(u - ideal) - Math.abs(v - ideal))];
            for (const dy of tries) {
                const fit = { scale, dx, dy };
                if (clear(fit)) return fit;
            }
        }
    }
    for (let scale = largest; scale >= largest * MIN_SCALE_RATIO; scale *= SCALE_STEP) {
        for (const fy of SLIDES) {
            for (const fx of SLIDES) {
                const fit = at(scale, fx, fy);
                if (clear(fit)) return fit;
            }
        }
    }
    return at(largest * MIN_SCALE_RATIO, 0.5, 0.5);
}

/** Centred placements may shrink this far before sliding is allowed. */
const CENTRED_MIN_RATIO = 0.9;

export const fitTransform = (fit: TableOnlyFit, base: string) =>
    fit.scale === 1 && fit.dx === 0 && fit.dy === 0 ? base : `translate(${fit.dx.toFixed(1)}px, ${fit.dy.toFixed(1)}px) scale(${fit.scale.toFixed(4)}) ${base}`;

const toBox = (rect: DOMRect): Box => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
const visible = (rect: DOMRect) => rect.width > 1 && rect.height > 1;

/**
 * Table-only (full screen) view: scale and slide the whole table, seats, badges
 * and chips included, so it fits the stage beside the dock and clear of the
 * floating overlays (History, Show controls, hand strength), with nothing clipped.
 * Off outside table-only view.
 */
const SHOW_GAP = 6;

function clearShowAnchor(root: HTMLElement): void {
    root.removeAttribute("data-show-above-fold");
    root.style.removeProperty("--table-only-show-bottom");
    root.style.removeProperty("--table-only-show-left");
}

/** Portrait phones: the action dock spans the bottom edge, so Show controls
 *  sits just above the Fold button, left-aligned with it. */
function anchorShowControls(root: HTMLElement): void {
    const portrait = root.getAttribute("data-compact-mobile") === "true" && window.innerHeight > window.innerWidth;
    const fold = portrait
        ? Array.from(root.querySelectorAll<HTMLElement>(".mobile-action-slot button, .poker-action-dock button")).find(b => /^\s*fold\b/i.test(b.textContent ?? ""))
        : undefined;
    const rect = fold?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
        clearShowAnchor(root);
        return;
    }
    root.setAttribute("data-show-above-fold", "true");
    root.style.setProperty("--table-only-show-bottom", `${Math.round(window.innerHeight - rect.top + SHOW_GAP)}px`);
    root.style.setProperty("--table-only-show-left", `${Math.round(rect.left)}px`);
}

export function useTableOnlyFit(
    active: boolean,
    stageRef: RefObject<HTMLDivElement | null>,
    wrapperRef: RefObject<HTMLDivElement | null>,
    feltRef: RefObject<HTMLDivElement | null>,
    baseTransform: string,
    zoom: number
): TableOnlyFit {
    const [fit, setFit] = useState<TableOnlyFit>(IDENTITY_FIT);
    useLayoutEffect(() => {
        if (!active) {
            const root = stageRef.current?.closest(".table-container");
            if (root instanceof HTMLElement) clearShowAnchor(root);
            if (root instanceof HTMLElement) root.style.removeProperty("--table-only-stage-inset-right");
            setFit(previous => (previous === IDENTITY_FIT ? previous : IDENTITY_FIT));
            return;
        }
        let frame = 0;
        let applied = IDENTITY_FIT;
        const measure = () => {
            const stageEl = stageRef.current;
            const wrapper = wrapperRef.current;
            if (!stageEl || !wrapper) return;
            const stage = stageEl.getBoundingClientRect();
            const origin = { x: stage.left, y: stage.top };
            // Undo the fit currently applied, giving the engine's own layout.
            const unfit = (rect: DOMRect): Box => ({
                left: (rect.left - origin.x - applied.dx) / applied.scale,
                top: (rect.top - origin.y - applied.dy) / applied.scale,
                right: (rect.right - origin.x - applied.dx) / applied.scale,
                bottom: (rect.bottom - origin.y - applied.dy) / applied.scale
            });
            const content: Box[] = [];
            const banners: Box[] = [];
            wrapper.querySelectorAll(FIT_CONTENT).forEach(el => {
                const rect = el.getBoundingClientRect();
                if (!visible(rect)) return;
                if (el.matches(".seat-banner-shell")) banners.push(unfit(rect));
                else content.push(unfit(rect));
            });
            // Portrait banners slide themselves inward to stay on screen (Badge),
            // so only their height counts; their width is clipped to the seats.
            const portraitPhone = window.innerHeight > window.innerWidth && stageEl.closest(".table-container")?.getAttribute("data-compact-mobile") === "true";
            const seatsLeft = Math.min(...content.map(b => b.left));
            const seatsRight = Math.max(...content.map(b => b.right));
            banners.forEach(b => content.push(portraitPhone && content.length ? { ...b, left: Math.max(b.left, seatsLeft), right: Math.min(b.right, seatsRight) } : b));
            const felt = feltRef.current?.getBoundingClientRect();
            if (felt && visible(felt)) {
                const box = unfit(felt);
                const rail = 0 * zoom;
                content.push({ left: box.left - rail, top: box.top - rail, right: box.right + rail, bottom: box.bottom + rail });
            }
            const root = stageEl.closest(".table-container");
            // Space right of the stage (the landscape action column): History sits left of it.
            if (root instanceof HTMLElement) root.style.setProperty("--table-only-stage-inset-right", `${Math.max(0, Math.round(window.innerWidth - stage.right))}px`);
            if (root instanceof HTMLElement) anchorShowControls(root);
            const overlays: Box[] = [];
            root?.querySelectorAll(FIT_OVERLAYS).forEach(el => {
                const rect = el.getBoundingClientRect();
                if (!visible(rect)) return;
                // The desktop History feed sizes its height around the seats
                // (useHistoryDock), so only its header strip is reserved here;
                // using its full height would feed back into that sizing.
                const box = toBox(rect);
                if (el.matches(".action-log-overlay")) box.bottom = Math.min(box.bottom, box.top + FEED_HEADER);
                overlays.push(box);
            });
            // The desktop action bar is fixed over the stage bottom.
            let bottom = Math.min(stage.bottom, window.innerHeight);
            const bar = root?.querySelector(".table-action-bar")?.getBoundingClientRect();
            if (bar && visible(bar) && bar.top < bottom) bottom = bar.top;
            // Portrait phones are width-bound: hug the side edges more tightly.
            const side = window.innerHeight > window.innerWidth && root?.getAttribute("data-compact-mobile") === "true" ? 2 : FIT_MARGIN;
            const target: Box = {
                left: Math.max(stage.left, 0) + side,
                top: Math.max(stage.top, 0) + FIT_MARGIN,
                right: Math.min(stage.right, window.innerWidth) - side,
                bottom: bottom - FIT_MARGIN
            };
            // Centre the oval: horizontally on the full stage width (the portrait
            // slider may overlap a seat, as in the normal view), vertically in the
            // band between the top pills and the bottom edge of the target.
            let centre: FitCentre | undefined;
            if (felt && visible(felt)) {
                const bandTop = overlays.reduce((top, o) => (o.top < target.top + 60 && o.bottom < target.top + 80 ? Math.max(top, o.bottom + 4) : top), target.top);
                const stageMid = (Math.max(stage.left, 0) + Math.min(stage.right, window.innerWidth)) / 2;
                centre = { anchor: unfit(felt), x: stageMid, y: (bandTop + target.bottom) / 2 };
            }
            const next = computeTableOnlyFit(content, overlays, target, origin, centre);
            const same = Math.abs(next.scale - applied.scale) < 0.002 && Math.abs(next.dx - applied.dx) < 0.5 && Math.abs(next.dy - applied.dy) < 0.5;
            if (same) return;
            applied = next;
            setFit(next);
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        measure();
        const stageEl = stageRef.current;
        const root = stageEl?.closest(".table-container");
        const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
        if (stageEl) resize?.observe(stageEl);
        root?.querySelectorAll(FIT_OVERLAYS + ", .table-action-bar").forEach(el => resize?.observe(el));
        // Seats, banners and the bar mount/unmount with the hand.
        const mutation = typeof MutationObserver === "undefined" || !root ? null : new MutationObserver(schedule);
        mutation?.observe(root as HTMLElement, { childList: true, subtree: true });
        window.addEventListener("resize", schedule);
        return () => {
            cancelAnimationFrame(frame);
            resize?.disconnect();
            mutation?.disconnect();
            window.removeEventListener("resize", schedule);
        };
    }, [active, stageRef, wrapperRef, feltRef, baseTransform, zoom]);
    return active ? fit : IDENTITY_FIT;
}
