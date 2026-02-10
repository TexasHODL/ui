/**
 * Layout Debug Info Component
 *
 * Development-only debug panel showing:
 * - Viewport mode (desktop/tablet/mobile)
 * - Window dimensions
 * - Table rotation state
 * - Game results
 *
 * Only shown when VITE_NODE_ENV === "development"
 */

import React from "react";

export interface LayoutDebugInfoProps {
    viewportMode: "mobile-portrait" | "mobile-landscape" | "tablet" | "desktop";
    startIndex: number;
    tableSize: number;
    results: unknown;
    setStartIndex: (value: number | ((prev: number) => number)) => void;
}

export const LayoutDebugInfo: React.FC<LayoutDebugInfoProps> = ({ viewportMode, startIndex, tableSize, results, setStartIndex }) => {
    // Only render in development mode
    if (import.meta.env.VITE_NODE_ENV !== "development") {
        return null;
    }

    return (
        <div className="fixed top-20 right-4 z-50 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg text-xs border border-gray-600" style={{ maxWidth: "180px" }}>
            <div className="font-bold mb-1">Layout Debug Info</div>
            <div>
                Mode: <span className="text-yellow-400 font-mono">{viewportMode}</span>
            </div>
            <div className="text-gray-400 mt-1">
                {window.innerWidth}x{window.innerHeight}
                {window.innerWidth > window.innerHeight ? " (landscape)" : " (portrait)"}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="font-bold mb-1">Table Rotation</div>
                <div className="text-green-400">
                    StartIndex: <span className="font-mono">{startIndex}</span>
                </div>
                <div className="text-gray-400 text-[10px] mt-1">
                    {startIndex === 0 && "No rotation (Seat 1 at bottom)"}
                    {startIndex === 1 && "Rotated by 1 (Seat 2 at bottom)"}
                    {startIndex === 2 && "Rotated by 2 (Seat 3 at bottom)"}
                    {startIndex === 3 && "Rotated by 3 (Seat 4 at bottom)"}
                    {startIndex > 3 && `Rotated by ${startIndex}`}
                </div>
                <div className="flex gap-1 mt-2">
                    <button
                        onClick={() => setStartIndex(prev => (prev + 1) % tableSize)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px]"
                        title="Rotate left - increases startIndex"
                    >
                        ← Rotate
                    </button>
                    <button
                        onClick={() => setStartIndex(prev => (prev - 1 + tableSize) % tableSize)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-[10px]"
                        title="Rotate right - decreases startIndex"
                    >
                        Rotate →
                    </button>
                    <button onClick={() => setStartIndex(0)} className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px]">
                        Reset
                    </button>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="font-bold mb-1">Results</div>
                <pre className="text-gray-300 break-words whitespace-pre-wrap" style={{ wordBreak: "break-word", fontSize: "10px" }}>
                    {results ? JSON.stringify(results, null, 2) : "empty"}
                </pre>
            </div>
        </div>
    );
};
