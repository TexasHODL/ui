/**
 * Table Status Messages Component
 *
 * Displays status messages on the table:
 * - Current user's seat position
 * - Next to act indicator
 * - Hand complete message
 * - Empty table waiting message
 */

import React from "react";
import { PlayerDTO, LegalActionDTO } from "@block52/poker-vm-sdk";

export interface TableStatusMessagesProps {
    viewportMode: "mobile-portrait" | "mobile-landscape" | "tablet" | "desktop";
    isMobileLandscape: boolean;
    currentUserSeat: number;
    nextToActSeat: number | null;
    isGameInProgress: boolean;
    isCurrentUserTurn: boolean;
    playerLegalActions: LegalActionDTO[] | null;
    tableActivePlayers: PlayerDTO[];
    isSitAndGoWaitingForPlayers: boolean;
}

export const TableStatusMessages: React.FC<TableStatusMessagesProps> = ({
    viewportMode,
    isMobileLandscape,
    currentUserSeat,
    nextToActSeat,
    isGameInProgress,
    isCurrentUserTurn,
    playerLegalActions,
    tableActivePlayers,
    isSitAndGoWaitingForPlayers
}) => {
    return (
        <>
            {/* Status Messages Container - Desktop positioned top-left, mobile/tablet centered */}
            <div
                className={`flex flex-col space-y-2 z-50 ${
                    viewportMode === "desktop"
                        ? "fixed left-4 top-32 items-start"
                        : isMobileLandscape
                        ? "absolute left-2 items-start max-w-[150px]"
                        : "absolute left-1/2 transform -translate-x-1/2 items-center"
                }`}
                style={{ top: viewportMode === "desktop" ? undefined : isMobileLandscape ? "3rem" : "6.25rem" }}
            >
                {/* Add a message for the current user's seat */}
                {currentUserSeat >= 0 && (
                    <div
                        className={`text-white px-3 py-2 rounded-lg text-xs sm:text-sm backdrop-blur-sm ${
                            viewportMode === "desktop"
                                ? "bg-black bg-opacity-60 text-left"
                                : isMobileLandscape
                                ? "bg-black bg-opacity-50 text-left break-words"
                                : "bg-black bg-opacity-50 text-center"
                        }`}
                    >
                        You are seated at position {currentUserSeat}
                    </div>
                )}

                {/* Add an indicator for whose turn it is */}
                {nextToActSeat && isGameInProgress && (
                    <div
                        className={`text-white px-3 py-2 rounded-lg text-xs sm:text-sm backdrop-blur-sm ${
                            viewportMode === "desktop"
                                ? "bg-black bg-opacity-80 text-left"
                                : isMobileLandscape
                                ? "bg-black bg-opacity-70 text-left break-words"
                                : "bg-black bg-opacity-70 text-center"
                        }`}
                    >
                        {isCurrentUserTurn && playerLegalActions && playerLegalActions.length > 0 ? (
                            <span className="text-yellow-400 font-semibold">Your turn to act!</span>
                        ) : (
                            <span>
                                Waiting for {nextToActSeat === 1 ? "Small Blind" : nextToActSeat === 2 ? "Big Blind" : `player at seat ${nextToActSeat}`} to act
                            </span>
                        )}
                    </div>
                )}

                {/* Show a message when the hand is over (but not during sit-and-go waiting) */}
                {!isGameInProgress && tableActivePlayers.length > 0 && !isSitAndGoWaitingForPlayers && (
                    <div
                        className={`text-white px-3 py-2 rounded-lg text-xs sm:text-sm backdrop-blur-sm ${
                            viewportMode === "desktop"
                                ? "bg-black bg-opacity-80 text-left"
                                : isMobileLandscape
                                ? "bg-black bg-opacity-70 text-left break-words"
                                : "bg-black bg-opacity-70 text-center"
                        }`}
                    >
                        <span>Hand complete - waiting for next hand</span>
                    </div>
                )}
            </div>

            {/* Add a message for empty table if needed */}
            {tableActivePlayers.length === 0 && (
                <div
                    className={`text-white bg-black bg-opacity-50 rounded text-xs sm:text-sm ${
                        isMobileLandscape ? "absolute left-2 top-24 p-2 max-w-[150px] text-left break-words" : "absolute top-28 right-4 p-2 sm:p-4 text-center"
                    }`}
                >
                    Waiting for players to join...
                </div>
            )}
        </>
    );
};
