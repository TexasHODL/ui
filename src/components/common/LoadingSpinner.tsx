import React from "react";

interface LoadingSpinnerProps {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
}

/**
 * Reusable loading spinner component for indicating pending operations
 *
 * @param size - Size of the spinner (xs: 3x3, sm: 4x4, md: 5x5, lg: 6x6, xl: 10x10)
 * @param className - Additional CSS classes to apply
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "sm", className = "" }) => {
    const sizeClasses = {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
        xl: "h-10 w-10"
    };

    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};
