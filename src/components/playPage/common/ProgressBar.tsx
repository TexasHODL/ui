import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePlayerTimer } from "../../../hooks/player/usePlayerTimer";

type ProgressBarProps = {
    index: number;
};

const ProgressBar: React.FC<ProgressBarProps> = React.memo(({ index }) => {
    const { id } = useParams<{ id: string }>();
    const { isActive, timeRemaining, timeoutValue, hasUsedExtension } = usePlayerTimer(id, index);

    // State for extension UI feedback only
    const [isExtending, setIsExtending] = useState(false);

    // Reset extending state when turn changes (simplified dependency)
    useEffect(() => {
        if (!isActive) {
            setIsExtending(false);
        }
    }, [isActive]);

    // If player is not active, don't show progress bar
    if (!isActive) {
        return null;
    }

    // Calculate progress percentage (100% when full time, 0% when time's up)
    const progressPercentage = (timeRemaining / timeoutValue) * 100;

    return (
        <div className="animate-progress delay-2000 flex items-center w-full h-2 mb-2 mt-auto gap-2 relative">
            <span className="ml-2 text-white text-sm w-[15px]">{timeRemaining}</span>
            <div className="relative flex-1 mr-[10px] h-full w-[calc(100%-25px)] bg-[#f0f0f030] rounded-md overflow-hidden">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${hasUsedExtension ? "bg-red-500" : "bg-white"}`}
                    style={{
                        width: `${progressPercentage}%`
                    }}
                ></div>
            </div>

            {/* Extension in progress indicator */}
            {isExtending && (
                <div className="absolute right-[-80px] top-[-20px] z-50">
                    <div className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>Extended!</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ProgressBar;
