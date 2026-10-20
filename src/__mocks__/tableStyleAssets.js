// Jest stand-in for src/utils/tableStyleAssets.ts (import.meta.glob is Vite-only).
// Lists the real files on disk so the URL maps match production.
const fs = require("fs");
const path = require("path");
const assets = path.join(__dirname, "..", "assets");
const list = (dir, depth) => {
    const out = {};
    const walk = (rel, d) => {
        for (const name of fs.readdirSync(path.join(assets, rel))) {
            const r = `${rel}/${name}`;
            if (d > 0) walk(r, d - 1);
            else if (name.endsWith(".svg")) out[`../assets/${r}`] = `/assets/${r}`;
        }
    };
    walk(dir, depth);
    return out;
};
module.exports = {
    DECK_FILES: list("decks", 1),
    CHIP_STYLE_FILES: list("chipstyles", 1),
    DEALER_STYLE_FILES: list("dealerstyles", 0)
};
