import { useEffect } from "react";

/** Class on <html> while a table page is mounted (see Table.css). */
export const TABLE_PAGE_LOCK_CLASS = "table-page-lock";
/** Visible viewport height in px, published on <html> for browsers without dvh. */
export const TABLE_VH_VAR = "--table-vh";

/**
 * The table page must fit the visible viewport exactly and never scroll.
 * A scrollable page let Android browsers slide the address bar over the
 * header, or push the hero under the action bar. While mounted, the page is
 * locked to the visual viewport height (html/body/#app overflow hidden,
 * overscroll none); other pages (lobby etc.) keep normal scrolling.
 */
export function useTablePageViewportLock(): void {
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add(TABLE_PAGE_LOCK_CLASS);
        const viewport = window.visualViewport;
        const apply = () => {
            const height = viewport && viewport.height > 0 ? Math.min(window.innerHeight, viewport.height) : window.innerHeight;
            html.style.setProperty(TABLE_VH_VAR, `${Math.round(height)}px`);
            // A focused input or the browser can still nudge the document; pin it.
            if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
        };
        apply();
        window.addEventListener("resize", apply);
        window.addEventListener("orientationchange", apply);
        viewport?.addEventListener("resize", apply);
        return () => {
            window.removeEventListener("resize", apply);
            window.removeEventListener("orientationchange", apply);
            viewport?.removeEventListener("resize", apply);
            html.classList.remove(TABLE_PAGE_LOCK_CLASS);
            html.style.removeProperty(TABLE_VH_VAR);
        };
    }, []);
}
