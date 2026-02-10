// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Polyfill TextEncoder/TextDecoder for jsdom environment
// Required by react-router-dom and other libraries that use the Encoding API
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock import.meta for Jest
// This is necessary because Vite's import.meta.env is not available in Jest environment
// We use type assertion here as 'import' is a reserved word and can't be properly typed
Object.defineProperty(global, "import", {
    value: {
        meta: {
            env: {}
        }
    },
    writable: true,
    configurable: true
});
