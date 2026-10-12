/** Raise-button stops along a horizontal slider.
 * Low / minus is the left end (pink). High / plus is the right end (orange). */
const STOPS: Array<[number, [number, number, number]]> = [
    [0, [0xf0, 0x2b, 0xc6]],
    [0.48, [0xff, 0x4a, 0x83]],
    [1, [0xff, 0x97, 0x17]]
];

export const DESKTOP_PILL_GRADIENT = "linear-gradient(to right, #f02bc6, #ff4a83 48%, #ff9717)";

export function desktopPillColor(pct: number): string {
    const t = Math.min(1, Math.max(0, pct));
    let index = 0;
    while (index < STOPS.length - 1 && t > STOPS[index + 1][0]) index += 1;
    const [at0, rgb0] = STOPS[index];
    const [at1, rgb1] = STOPS[Math.min(index + 1, STOPS.length - 1)];
    const span = at1 - at0 || 1;
    const u = (t - at0) / span;
    const rgb = rgb0.map((channel, channelIndex) => Math.round(channel + (rgb1[channelIndex] - channel) * u));
    return `rgb(${rgb.join(", ")})`;
}

/** Map a pointer on the horizontal travel to a stepped bet. Left is min. */
export function betFromHorizontalTravel(clientX: number, left: number, width: number, min: number, max: number, step: number): number | null {
    if (!Number.isFinite(clientX) || width <= 0 || max <= min) return null;
    const ratio = (clientX - left) / width;
    const clamped = Math.min(1, Math.max(0, ratio));
    const raw = min + clamped * (max - min);
    const snapped = step > 0 ? min + Math.round((raw - min) / step) * step : raw;
    return Math.min(max, Math.max(min, snapped));
}
