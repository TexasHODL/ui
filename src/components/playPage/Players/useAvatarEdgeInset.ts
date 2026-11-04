import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

/** How far the avatar chip hangs past its pill's right edge (PlayersCommon .avatarChip right: -40px). */
export const AVATAR_OVERHANG_PX = 40;

export interface Box {
    left: number;
    right: number;
}

/**
 * How many CSS px to nudge the seat inward so its avatar chip stays inside `bound`.
 * 0 when it already fits (the usual look). `pill` is the pill's box without any nudge.
 */
export function avatarInsetPx(pill: Box, bound: Box, overhang: number, scale = 1): number {
    const s = scale > 0 ? scale : 1;
    const overflow = pill.right + overhang * s - bound.right;
    if (overflow <= 0.5) return 0;
    return Math.ceil(overflow / s) + 2;
}

/** The visible horizontal area: the viewport, narrowed by any ancestor that clips overflow on x. */
function clipBounds(el: HTMLElement): Box {
    let left = 0;
    let right = window.innerWidth || document.documentElement.clientWidth;
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== document.body) {
        const ox = window.getComputedStyle(node).overflowX;
        if (ox !== "visible") {
            const r = node.getBoundingClientRect();
            left = Math.max(left, r.left);
            right = Math.min(right, r.right);
        }
        node = node.parentElement;
    }
    return { left, right };
}

/**
 * The NFT avatar on right-edge seats was cut off by the table/viewport edge (seat on the far right of a
 * 9-seat table at ~1024px). Measures the seat's pill and returns how far to nudge the whole seat
 * inward (applied as a negative margin-left), so the pill, cards and avatar keep their usual look.
 */
export function useAvatarEdgeInset(seatRef: RefObject<HTMLElement | null>, chipSelector: string, deps: unknown[]): number {
    const [inset, setInset] = useState(0);
    const applied = useRef(0);

    const measure = useCallback(() => {
        const seat = seatRef.current;
        if (!seat) return;
        const chip = seat.querySelector<HTMLElement>(chipSelector);
        const pill = chip?.offsetParent as HTMLElement | null | undefined;
        if (!chip || !pill) return;
        const r = pill.getBoundingClientRect();
        // The table is scaled with transforms, so convert between screen and CSS px.
        const scale = pill.offsetWidth > 0 ? r.width / pill.offsetWidth : 1;
        // Undo the nudge already applied so the result is stable (no feedback loop).
        const shift = applied.current * scale;
        const next = avatarInsetPx({ left: r.left + shift, right: r.right + shift }, clipBounds(seat), AVATAR_OVERHANG_PX, scale);
        applied.current = next;
        setInset(next);
    }, [seatRef, chipSelector]);

    useLayoutEffect(() => {
        measure();
        const seat = seatRef.current;
        window.addEventListener("resize", measure);
        // Seats glide to new spots (positionTransition), so check again when that ends.
        seat?.addEventListener("transitionend", measure);
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
        ro?.observe(document.documentElement);
        return () => {
            window.removeEventListener("resize", measure);
            seat?.removeEventListener("transitionend", measure);
            ro?.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [measure, ...deps]);

    return inset;
}