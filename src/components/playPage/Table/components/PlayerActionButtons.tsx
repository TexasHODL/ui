/**
 * Player Action Buttons Component
 *
 * Displays Sit Out and Sit In buttons based on available player actions.
 * Responsive design for mobile, tablet, and desktop viewports.
 */

import React from "react";
import { handleSitOut, handleSitIn } from "../../../common/actionHandlers";
import type { NetworkEndpoints } from "../../../../context/NetworkContext";

export interface PlayerActionButtonsProps {
    isMobile: boolean;
    isMobileLandscape: boolean;
    hasSitOutAction: boolean;
    hasSitInAction: boolean;
    tableId: string | undefined;
    currentNetwork: NetworkEndpoints;
}

export const PlayerActionButtons: React.FC<PlayerActionButtonsProps> = ({
    isMobile,
    isMobileLandscape,
    hasSitOutAction,
    hasSitInAction,
    tableId,
    currentNetwork
}) => {
    return (
        <>
            {/* Sit Out/Sit In Toggle - Professional Mobile Design */}
            {/* Only show SIT OUT button when hasSitOutAction is true and hasSitInAction is false */}
            {/* Only show SIT IN button when hasSitInAction is true */}
            {hasSitOutAction && !hasSitInAction && (
                <div className={`fixed z-30 ${isMobileLandscape ? "bottom-2 left-2" : isMobile ? "bottom-[260px] right-4" : "bottom-20 left-4"}`}>
                    {/* Mobile: Compact Button Design */}
                    {isMobile || isMobileLandscape ? (
                        <button
                            onClick={() => handleSitOut(tableId, currentNetwork)}
                            className="btn-sit-out text-white font-medium py-1.5 px-3 rounded-lg shadow-md text-xs
                            backdrop-blur-sm transition-all duration-300 border
                            flex items-center justify-center gap-2 transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            SIT OUT
                        </button>
                    ) : (
                        /* Desktop: Original Button Design */
                        <button
                            onClick={() => handleSitOut(tableId, currentNetwork)}
                            className="btn-sit-out text-white font-medium py-2 px-4 rounded-lg shadow-md text-sm
                            backdrop-blur-sm transition-all duration-300 border
                            flex items-center justify-center gap-2 transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            SIT OUT
                        </button>
                    )}
                </div>
            )}

            {/* Sit In Button - Shows when player is sitting out */}
            {hasSitInAction && (
                <div className={`fixed z-30 ${isMobileLandscape ? "bottom-2 left-2" : isMobile ? "bottom-[260px] right-4" : "bottom-20 left-4"}`}>
                    {/* Mobile: Compact Button Design */}
                    {isMobile || isMobileLandscape ? (
                        <button
                            onClick={() => handleSitIn(tableId, currentNetwork)}
                            className="btn-sit-out text-white font-medium py-1.5 px-3 rounded-lg shadow-md text-xs
                            backdrop-blur-sm transition-all duration-300 border
                            flex items-center justify-center gap-2 transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            SIT IN
                        </button>
                    ) : (
                        /* Desktop: Original Button Design */
                        <button
                            onClick={() => handleSitIn(tableId, currentNetwork)}
                            className="btn-sit-out text-white font-medium py-2 px-4 rounded-lg shadow-md text-sm
                            backdrop-blur-sm transition-all duration-300 border
                            flex items-center justify-center gap-2 transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                            SIT IN
                        </button>
                    )}
                </div>
            )}
        </>
    );
};
