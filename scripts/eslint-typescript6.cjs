"use strict";

// TypeScript 7 ships the native compiler and no JavaScript API. typescript-eslint
// still loads `typescript` at startup (it reads ts.Extension). Point only those
// packages at @typescript/typescript6 so `tsc` stays on TypeScript 7.

const Module = require("module");
const path = require("path");

const ts6Entry = require.resolve("@typescript/typescript6");
const callers = [
    `${path.sep}@typescript-eslint${path.sep}`,
    `${path.sep}typescript-eslint${path.sep}`,
    `${path.sep}ts-api-utils${path.sep}`,
];

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    if (
        request === "typescript" &&
        parent &&
        parent.filename &&
        callers.some(segment => parent.filename.includes(segment))
    ) {
        return ts6Entry;
    }
    return resolveFilename.call(this, request, parent, isMain, options);
};
