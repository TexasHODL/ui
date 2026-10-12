import { ModalHeader } from "../common/ModalHeader";
/**
 * SitAndGoWaitingModal Component
 *
 * Displays a modal for players who have joined a Sit & Go tournament
 * and are waiting for more players to fill the table before the game starts.
 */
import React, { useCallback, useMemo, useState } from "react";
import { hasValue, isNullish } from "../../utils/guards";
import { useGameOptions } from "../../hooks/game/useGameOptions";
import { useVacantSeatData } from "../../hooks/game/useVacantSeatData";
import { getGameTypeMnemonic } from "../../utils/gameFormatUtils";
import { formatSitAndGoStackString } from "../../utils/numberUtils";
import styles from "./SitAndGoWaitingModal.module.css";

interface SitAndGoWaitingModalProps {
    onLeaveConfirm?: () => Promise<void>;
    playerStack?: string;
}

const SitAndGoWaitingModal: React.FC<SitAndGoWaitingModalProps> = ({ onLeaveConfirm, playerStack }) => {
    const { gameOptions } = useGameOptions();
    const { emptySeatIndexes } = useVacantSeatData();

    const [isConfirming, setIsConfirming] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [leaveError, setLeaveError] = useState<string | null>(null);

    const handleLeaveClick = useCallback(() => {
        setLeaveError(null);
        setIsConfirming(true);
    }, []);

    const handleCancel = useCallback(() => {
        setIsConfirming(false);
        setLeaveError(null);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!onLeaveConfirm) return;
        setIsLeaving(true);
        setLeaveError(null);
        try {
            await onLeaveConfirm();
        } catch (err) {
            console.error("Error leaving SNG table:", err);
            setLeaveError(err instanceof Error ? err.message : "Failed to leave table. Please try again.");
            setIsLeaving(false);
        }
    }, [onLeaveConfirm]);

    const chipsLabel = hasValue(playerStack) ? formatSitAndGoStackString(playerStack) : null;
    const buyInLabel = gameOptions?.startingStack ? formatSitAndGoStackString(gameOptions.startingStack) : null;
    const canShowLeaveUi = hasValue(onLeaveConfirm) && hasValue(playerStack);

    // Calculate players joined
    const playersJoined = useMemo(() => {
        if (!gameOptions?.maxPlayers) return 0;
        return gameOptions.maxPlayers - emptySeatIndexes.length;
    }, [gameOptions?.maxPlayers, emptySeatIndexes.length]);

    const maxPlayers = gameOptions?.maxPlayers;

    const playerCountLabel = getGameTypeMnemonic(gameOptions?.minPlayers);

    // Don't render until game options are loaded
    if (isNullish(maxPlayers)) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="hodl-modal p-6 w-96 relative">

                <div className="relative z-10">
                    <ModalHeader kicker="Tournament" title="Waiting for Players" subtitle={`${playerCountLabel} tournament is filling up...`} />

                    {/* Players Progress Display */}
                    <div className="mb-6">
                        <div className="bg-gray-700/80 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                            <div className="text-center mb-3">
                                <div className="text-xs text-blue-300 font-semibold mb-2">PLAYERS JOINED</div>
                                <div className="text-3xl text-white font-bold">
                                    {playersJoined} / {maxPlayers}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-600 rounded-full h-2.5 mt-3">
                                <div
                                    className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${(playersJoined / maxPlayers) * 100}%` }}
                                ></div>
                            </div>

                            {/* Waiting indicator */}
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <div className="flex gap-1">
                                    <div className={`w-2 h-2 bg-blue-400 rounded-full animate-bounce ${styles.waitingDotDelay0}`}></div>
                                    <div className={`w-2 h-2 bg-blue-400 rounded-full animate-bounce ${styles.waitingDotDelay150}`}></div>
                                    <div className={`w-2 h-2 bg-blue-400 rounded-full animate-bounce ${styles.waitingDotDelay300}`}></div>
                                </div>
                                <span className="text-gray-400 text-sm">
                                    Waiting for {maxPlayers - playersJoined} more {maxPlayers - playersJoined === 1 ? "player" : "players"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Your Status */}
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400 font-semibold text-sm">
                                Waiting for players, you are {playersJoined} of {maxPlayers}
                            </span>
                        </div>
                    </div>


                    {/* Leave Game — inline two-step confirmation (no separate modal) */}
                    {canShowLeaveUi && !isConfirming && (
                        <div className="mb-4">
                            <button
                                onClick={handleLeaveClick}
                                className="w-full py-2 px-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 hover:border-red-500/60 transition-colors duration-200"
                            >
                                Leave Game
                            </button>
                        </div>
                    )}

                    {canShowLeaveUi && isConfirming && (
                        <div className="mb-4 bg-gray-700/80 backdrop-blur-sm rounded-lg p-4 border border-red-500/40">
                            <p className="text-white text-sm font-semibold mb-3 text-center">Leave this tournament?</p>

                            <div className="space-y-1.5 mb-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Your Chips:</span>
                                    <span className="text-white font-bold">{chipsLabel}</span>
                                </div>
                                {buyInLabel && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500">Buy-In:</span>
                                        <span className="text-gray-300">{buyInLabel}</span>
                                    </div>
                                )}
                            </div>

                            {leaveError && (
                                <p className="text-red-400 text-xs mb-3 text-center break-words">{leaveError}</p>
                            )}

                            <div className="flex flex-col space-y-2">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isLeaving}
                                    className="w-full py-2 px-4 rounded-lg border border-red-500/60 bg-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/30 hover:border-red-500/80 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLeaving ? "Leaving..." : "Confirm Leave"}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isLeaving}
                                    className="w-full py-2 px-4 rounded-lg border border-gray-500/40 bg-gray-600/30 text-gray-300 text-sm font-medium hover:bg-gray-600/50 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center">
                        <p className="text-xs text-gray-400">Tournament starts automatically when all players are seated</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-xs text-gray-400">Powered by Block52</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SitAndGoWaitingModal;
