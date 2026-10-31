/**
 * Table typography tokens (block52/ui#922) — the single source of truth.
 *
 * tailwind.config.js imports this file and:
 *   - emits the shipped `--type-*` CSS variables on :root (read by src/styles/typography.css
 *     and the table CSS files),
 *   - exposes Tailwind utilities: `font-num`, `font-action`, `font-mono-num`,
 *     `tracking-btn`, `tracking-label`, `font-btn`, `font-label`, `font-num-weight`,
 *     and the component classes `.type-btn`, `.type-num`, `.type-label`.
 *
 * Change a value here and both the CSS variables and the utilities follow.
 */

export const fontStacks = {
    rubik: ["Rubik", "ui-sans-serif", "system-ui", "sans-serif"],
    action: ["HODL Action", "Rubik", "ui-sans-serif", "system-ui", "sans-serif"],
    mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]
} as const;

export const typography = {
    /** Shared button text: main actions, pre-actions, Muck/Show. */
    button: { textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.025em" },
    /** Chip counts: stack pill, felt bet, pot, payout lines. */
    numeric: { fontWeight: "700", fontVariantNumeric: "tabular-nums" },
    /** Uppercase micro-labels: POT, LEVEL, panel headers, place badges. */
    label: { textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.08em" }
} as const;

/** CSS font-family value for a stack (names with spaces are quoted). */
export const fontFamilyValue = (stack: readonly string[]): string =>
    stack.map(name => (name.includes(" ") ? `"${name}"` : name)).join(", ");

/** The :root custom properties that src/styles/typography.css and the table CSS read. */
export const typographyCssVariables: Record<string, string> = {
    "--type-btn-transform": typography.button.textTransform,
    "--type-btn-weight": typography.button.fontWeight,
    "--type-btn-tracking": typography.button.letterSpacing,
    "--type-num-family": "var(--type-rubik)",
    "--type-num-weight": typography.numeric.fontWeight,
    "--type-num-variant": typography.numeric.fontVariantNumeric,
    "--type-label-tracking": typography.label.letterSpacing,
    "--type-label-weight": typography.label.fontWeight,
    "--type-mono": fontFamilyValue(fontStacks.mono),
    "--type-rubik": fontFamilyValue(fontStacks.rubik)
};