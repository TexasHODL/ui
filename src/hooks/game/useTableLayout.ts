/**
 * Hook for managing table layout configuration
 *
 * This hook provides easy access to the table layout configuration system
 * and handles viewport changes dynamically.
 */

import { useState, useEffect, useCallback } from "react";
import { getViewportMode, getCurrentConfig, getPositionArrays, calculateTableZoom, type ViewportConfig } from "../../config/tableLayoutConfig";

export interface UseTableLayoutReturn {
    viewportMode: string;
    config: ViewportConfig;
    positions: ReturnType<typeof getPositionArrays>;
    zoom: number;
    tableTransform: string;
    isLandscape: boolean;
    refreshLayout: () => void;
}

export const useTableLayout = (tableSize: 4 | 9): UseTableLayoutReturn => {
    const [viewportMode, setViewportMode] = useState(getViewportMode());
    const [config, setConfig] = useState(getCurrentConfig());
    const [zoom, setZoom] = useState(calculateTableZoom());
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

    // Refresh layout configuration
    const refreshLayout = useCallback(() => {
        const newMode = getViewportMode();
        const newConfig = getCurrentConfig();
        const newZoom = calculateTableZoom();
        const newIsLandscape = window.innerWidth > window.innerHeight;

        setViewportMode(newMode);
        setConfig(newConfig);
        setZoom(newZoom);
        setIsLandscape(newIsLandscape);
    }, []);

    // Handle viewport changes
    useEffect(() => {
        const handleResize = () => {
            refreshLayout();
        };

        const handleOrientationChange = () => {
            // Add a small delay to ensure dimensions are updated
            setTimeout(refreshLayout, 100);
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleOrientationChange);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleOrientationChange);
        };
    }, [refreshLayout]);

    // Get position arrays for current table size
    const positions = getPositionArrays(tableSize);

    // Build transform string for table
    const tableTransform = `
    translate(${config.table.translateX}, ${config.table.translateY}) 
    scale(${zoom})
    ${config.table.rotation !== undefined ? `rotate(${config.table.rotation}deg)` : ""}
  `.trim();

    return {
        viewportMode,
        config,
        positions,
        zoom,
        tableTransform,
        isLandscape,
        refreshLayout
    };
};
