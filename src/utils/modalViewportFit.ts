/** Fit app-owned dialogs on phones without enlarging desktop dialogs. */
export function installModalViewportFit(): () => void {
    const media = window.matchMedia("(max-width: 700px), (max-height: 500px) and (pointer: coarse)");
    let frame = 0;
    const tracked = new Set<HTMLElement>();
    const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fit);
    };
    const resize = new ResizeObserver(schedule);
    function fit() {
        document.querySelectorAll<HTMLElement>(".hodl-modal:not(.modal-inset-content)").forEach(modal => {
            if (!tracked.has(modal)) { tracked.add(modal); resize.observe(modal); }
            if (!media.matches) {
                modal.removeAttribute("data-viewport-fit");
                modal.style.removeProperty("zoom");
                modal.style.removeProperty("--viewport-fit-max-height");
                return;
            }
            modal.setAttribute("data-viewport-fit", "true");
            const viewport = window.visualViewport;
            const available = Math.max(1, (viewport?.height ?? window.innerHeight) - 40);
            const naturalHeight = modal.scrollHeight + 2;
            // A modal may set data-min-fit-zoom to stay legible; below that it scrolls instead of shrinking.
            const minZoom = Math.min(1, Number(modal.dataset.minFitZoom) || 0);
            const scale = Math.max(minZoom, Math.min(1, available / naturalHeight));
            if (scale > available / naturalHeight) {
                modal.setAttribute("data-viewport-fit", "scroll");
                modal.style.setProperty("--viewport-fit-max-height", `${Math.floor(available / scale)}px`);
            } else modal.style.removeProperty("--viewport-fit-max-height");
            const next = String(Math.floor(scale * 1000) / 1000);
            if (modal.style.getPropertyValue("zoom") !== next) modal.style.setProperty("zoom", next);
        });
        for (const modal of tracked) {
            if (!modal.isConnected) { resize.unobserve(modal); tracked.delete(modal); }
        }
    }
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    schedule();
    return () => {
        cancelAnimationFrame(frame);
        mutations.disconnect();
        resize.disconnect();
        window.removeEventListener("resize", schedule);
        window.visualViewport?.removeEventListener("resize", schedule);
        media.removeEventListener("change", schedule);
        for (const modal of tracked) {
            modal.removeAttribute("data-viewport-fit");
            modal.style.removeProperty("zoom");
        }
    };
}
