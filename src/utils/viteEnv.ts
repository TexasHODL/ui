/**
 * The ONLY module that touches import.meta — jest (CommonJS) cannot parse
 * import.meta syntax, so it maps this module to src/__mocks__/viteEnv.js
 * via moduleNameMapper. Everything else reads env through here.
 */
export const viteEnv: Record<string, string | undefined> = import.meta.env;
