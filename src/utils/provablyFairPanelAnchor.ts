/** Where the provably-fair panel sits, in viewport pixels. */
export interface PanelAnchor {
    top: number;
    right: number;
}

/**
 * Place the panel below the table banner and the shield, with its right edge
 * on the button. A shield flush with the screen, or too far left for the
 * panel's width, keeps an 8px inset so the panel stays on screen.
 */
export function provablyFairPanelAnchor(
    buttonRight: number,
    buttonBottom: number,
    bannerBottom: number,
    viewportWidth: number,
    panelWidth: number,
    gap = 8
): PanelAnchor {
    const top = Math.max(buttonBottom, bannerBottom) + gap;
    let right = viewportWidth - buttonRight;
    if (right < gap) right = gap;
    const left = viewportWidth - right - panelWidth;
    if (left < gap) right = Math.max(gap, viewportWidth - gap - panelWidth);
    return { top, right };
}
