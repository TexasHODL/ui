/** Inverse stage zoom keeps hole and community cards the same screen size.
 * Only reduce both together when the safe viewport cannot contain the three
 * vertical card/stack rows. Reference iPhone landscape sizes retain 39x51px. */
export function mobileCardUnit(portrait: boolean, zoom: number, width: number, height: number): string {
    const factor = portrait
        ? Math.min(1, width / 393, height / 480)
        : Math.min(1, width / 600, height / 263, zoom / 0.5125);
    return `${Math.max(0, factor) / Math.max(0.01, zoom)}px`;
}
