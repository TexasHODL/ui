import React from "react";
import { LoadingSpinner } from "../common";
import type { FoldButtonProps } from "./types";

/**
 * Reusable Fold button component with loading spinner.
 * Uses the same spinner styling as the Call button.
 */
export const FoldButton: React.FC<FoldButtonProps> = ({
    loading,
    disabled,
    isMobileLandscape = false,
    onClick,
    className
}) => {
    return (
        <button
            className={`btn-fold cursor-pointer rounded-lg w-full border shadow-md backdrop-blur-sm transition-all duration-200 type-btn-main transform active:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${
                className
                    ? className
                    : isMobileLandscape
                        ? "px-2 py-0.5 text-[12px]"
                        : "px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm"
            }`}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <>
                    <LoadingSpinner size="sm" />
                    Folding...
                </>
            ) : (
                "Fold"
            )}
        </button>
    );
};
