import { isBlank } from "./guards";

/**
 * Bottom edge of the table's top banners, in CSS pixels from the viewport top.
 * Published on <html> while a table is mounted so dialogs — including ones
 * portaled to document.body — can start below that edge. History and the
 * blinds tab keep reading the same measurement as --mobile-chrome-end on
 * .table-container.
 */
export const TABLE_BANNER_END_VAR = "--table-banner-end";

/** Space kept between a dialog and the banner above it, and the screen edge below. */
export const TABLE_MODAL_GAP_PX = 12;

/**
 * Margin the phone zoom-fit already used when no table banner is published.
 * Lobby dialogs stay on that path.
 */
export const LOBBY_MODAL_CHROME_PX = 40;

/** Ceil so a dialog top never lands a fraction above the banner's border edge. */
export function tableBannerEndPx(bottomPx: number): string {
    return `${Math.ceil(bottomPx)}px`;
}

export function publishTableBannerEnd(value: string): void {
    document.documentElement.style.setProperty(TABLE_BANNER_END_VAR, value);
}

export function clearTableBannerEnd(): void {
    document.documentElement.style.removeProperty(TABLE_BANNER_END_VAR);
}

/** Pixels from an inline or computed `--table-banner-end`. Unset, zero and junk are 0. */
export function readTableBannerEndPx(raw: string): number {
    const trimmed = raw.trim();
    if (isBlank(trimmed)) return 0;
    const value = Number.parseFloat(trimmed);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value;
}

/**
 * Height a dialog may occupy. On a table this is the viewport below the
 * banners, minus the gap above and below the dialog. Off the table it is the
 * historical phone-fit margin, so lobby dialogs do not change size.
 */
export function modalAvailableHeight(viewportHeight: number, bannerEndPx: number): number {
    const chrome = bannerEndPx > 0 ? bannerEndPx + TABLE_MODAL_GAP_PX * 2 : LOBBY_MODAL_CHROME_PX;
    const available = viewportHeight - chrome;
    return available > 1 ? available : 1;
}
