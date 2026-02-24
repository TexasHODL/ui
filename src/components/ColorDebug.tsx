import React from "react";
import { colors } from "../utils/colorConfig";
import styles from "./ColorDebug.module.css";

const ColorDebug: React.FC = () => {
    // Get all environment variables
    const envVars = {
        VITE_BRAND_COLOR_PRIMARY: import.meta.env.VITE_BRAND_COLOR_PRIMARY,
        VITE_BRAND_COLOR_SECONDARY: import.meta.env.VITE_BRAND_COLOR_SECONDARY,
        VITE_TABLE_BG_GRADIENT_START: import.meta.env.VITE_TABLE_BG_GRADIENT_START,
        VITE_TABLE_BG_GRADIENT_MID: import.meta.env.VITE_TABLE_BG_GRADIENT_MID,
        VITE_TABLE_BG_GRADIENT_END: import.meta.env.VITE_TABLE_BG_GRADIENT_END,
        VITE_TABLE_BG_BASE: import.meta.env.VITE_TABLE_BG_BASE,
        VITE_TABLE_BORDER_COLOR: import.meta.env.VITE_TABLE_BORDER_COLOR,
        VITE_ACCENT_COLOR_GLOW: import.meta.env.VITE_ACCENT_COLOR_GLOW,
    };

    // Debug: log all available env vars

    return (
        <div className="fixed top-20 right-4 p-4 bg-black/90 text-white rounded-lg shadow-lg z-50 max-w-md">
            <h3 className="font-bold mb-2">Color Debug Panel</h3>
            
            <div className="mb-4">
                <h4 className="font-semibold mb-1">Environment Variables:</h4>
                <div className="text-xs space-y-1">
                    {Object.entries(envVars).map(([key, value]) => (
                        <div key={key}>
                            <span className="text-gray-400">{key}:</span> 
                            <span className="text-yellow-300 ml-1">{value || "undefined"}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold mb-1">Loaded Colors:</h4>
                <div className="text-xs space-y-1">
                    <div>Brand Primary: <span className={styles.brandPrimary}>{colors.brand.primary}</span></div>
                    <div>Brand Secondary: <span className={styles.brandSecondary}>{colors.brand.secondary}</span></div>
                    <div>Table Border: <span className={styles.tableBorder}>{colors.table.borderColor}</span></div>
                    <div>Accent Glow: <span className={styles.accentGlow}>{colors.accent.glow}</span></div>
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold mb-1">Color Swatches:</h4>
                <div className="grid grid-cols-4 gap-2">
                    <div className={`w-12 h-12 rounded ${styles.swatchPrimary}`} title="Primary" />
                    <div className={`w-12 h-12 rounded ${styles.swatchSecondary}`} title="Secondary" />
                    <div className={`w-12 h-12 rounded ${styles.swatchBase}`} title="Base" />
                    <div className={`w-12 h-12 rounded ${styles.swatchGlow}`} title="Glow" />
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-semibold mb-1">Debug Info:</h4>
                <div className="text-xs space-y-1">
                    <div>NODE_ENV: <span className="text-green-300">{import.meta.env.NODE_ENV}</span></div>
                    <div>VITE_PROJECT_ID: <span className="text-green-300">{import.meta.env.VITE_PROJECT_ID || "undefined"}</span></div>
                    <div>VITE_TEST_VARIABLE: <span className="text-green-300">{import.meta.env.VITE_TEST_VARIABLE || "undefined"}</span></div>
                    <div>VITE_TEST_COLOR: <span className="text-green-300">{import.meta.env.VITE_TEST_COLOR || "undefined"}</span></div>
                    <div>Total env vars: <span className="text-green-300">{Object.keys(import.meta.env).length}</span></div>
                </div>
            </div>

            <div className="text-xs text-gray-400">
                <p>If colors show as undefined, restart the dev server after updating .env</p>
                <p>Check console for full import.meta.env object</p>
            </div>
        </div>
    );
};

export default ColorDebug;