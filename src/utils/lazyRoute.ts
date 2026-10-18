import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "texas-hodl-chunk-reload";

/** A dynamic import() failed, usually because the chunk 404'd after a deploy. */
export function isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Failed to fetch/i.test(message);
}

function rememberReload(): boolean {
    try {
        if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return false;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
        return true;
    } catch {
        return false;
    }
}

/** Reload once for a stale chunk. A second failure must surface in the page. */
export function reloadOnceForChunkError(reload: () => void = () => window.location.reload()): boolean {
    if (!rememberReload()) return false;
    reload();
    return true;
}

export function clearChunkReload(): void {
    try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
        // Private mode can reject storage. The page still renders.
    }
}

/**
 * lazy() that does not sit on the route fallback forever. A chunk failure
 * reloads once (stale index.html after deploy). The next failure throws into
 * the route ErrorBoundary.
 */
export function lazyRoute<T extends ComponentType<any>>(
    importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
    return lazy(() =>
        importer().catch(error => {
            if (isChunkLoadError(error)) reloadOnceForChunkError();
            throw error instanceof Error ? error : new Error(String(error));
        })
    );
}

/**
 * Vite fires this when a preloaded chunk 404s. Reload once. Do not cancel
 * the event: Vite treats a prevented default as a handled failure and
 * resolves the dynamic import to undefined, so React.lazy never rejects
 * and the route stays on the Loading… fallback.
 */
export function recoverFromPreloadError(_event: Event, reload?: () => void): void {
    reloadOnceForChunkError(reload);
}

/** Vite reports a failed modulepreload on this event. One reload, then the boundary. */
export function installChunkLoadRecovery(): void {
    window.addEventListener("vite:preloadError", event => {
        recoverFromPreloadError(event);
    });
    window.setTimeout(clearChunkReload, 15000);
}
