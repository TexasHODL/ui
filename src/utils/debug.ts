/**
 * Debug utility for conditional logging
 * Only logs in development mode to avoid cluttering production console
 */

// Check both MODE and VITE_NODE_ENV for development mode
// MODE is used by Vite build system, VITE_NODE_ENV is a custom env variable
const isDevelopment = import.meta.env.MODE === "development" || import.meta.env.VITE_NODE_ENV === "development";

export const debug = {
    /**
     * Logs a message to the console in development mode only
     */
    log: (...args: unknown[]): void => {
        if (isDevelopment) {
            console.log("[DEBUG]", ...args);
        }
    },

    /**
     * Logs a warning to the console in development mode only
     */
    warn: (...args: unknown[]): void => {
        if (isDevelopment) {
            console.warn("[DEBUG]", ...args);
        }
    },

    /**
     * Logs an error to the console (always logs, even in production)
     */
    error: (...args: unknown[]): void => {
        console.error("[ERROR]", ...args);
    },

    /**
     * Logs a debug table to the console in development mode only
     */
    table: (data: unknown): void => {
        if (isDevelopment) {
            console.table(data);
        }
    },

    /**
     * Logs a grouped message to the console in development mode only
     */
    group: (label: string, callback: () => void): void => {
        if (isDevelopment) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }
};
