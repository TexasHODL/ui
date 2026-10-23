/**
 * Bundled art for the player-selectable table styles (Settings > Cards / Chips /
 * Dealer button). Only the offered decks are globbed, so no other deck reaches
 * the bundle. `no-inline` keeps every SVG a separate hashed file: the JS only
 * carries URLs, and the browser fetches just the faces actually drawn.
 *
 * Jest cannot parse import.meta, so jest.config.js maps this module to
 * src/__mocks__/tableStyleAssets.js.
 */
export const DECK_FILES = import.meta.glob("../assets/decks/{C,D,H,J,K,M,N,O,P}/*.svg", {
    eager: true,
    query: "?url&no-inline",
    import: "default"
}) as Record<string, string>;

export const CHIP_STYLE_FILES = import.meta.glob("../assets/chipstyles/*/*.{svg,webp}", {
    eager: true,
    query: "?url&no-inline",
    import: "default"
}) as Record<string, string>;

export const DEALER_STYLE_FILES = import.meta.glob("../assets/dealerstyles/*.{svg,webp}", {
    eager: true,
    query: "?url&no-inline",
    import: "default"
}) as Record<string, string>;
