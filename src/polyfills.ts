// Browser polyfills for Node.js modules used by Cosmos SDK
import { Buffer } from "buffer";

// Ensure global is defined
if (typeof (globalThis as any).global === "undefined") {
    (globalThis as any).global = globalThis;
}

// Make Buffer globally available
if (typeof window !== "undefined") {
    (window as any).global = (window as any).global || window;
    (window as any).Buffer = (window as any).Buffer || Buffer;
    (window as any).process = (window as any).process || {
        env: {},
        browser: true,
        version: "",
        versions: { node: "16.0.0" },
        nextTick: (callback: () => void) => setTimeout(callback, 0)
    };

    // Fix for hash-base/readable-stream slice issue
    if (!Buffer.prototype.slice && (Buffer.prototype as any).subarray) {
        Buffer.prototype.slice = (Buffer.prototype as any).subarray;
    }
}

// Export for module usage
export { Buffer };
export const global = globalThis;
export const process = {
    env: {},
    browser: true,
    version: "",
    versions: { node: "16.0.0" },
    nextTick: (callback: () => void) => setTimeout(callback, 0)
};