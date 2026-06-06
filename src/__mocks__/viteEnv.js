// Jest stand-in for src/utils/viteEnv.ts — import.meta is module-only
// syntax that ts-jest's CommonJS output cannot represent.
module.exports = { viteEnv: process.env };
